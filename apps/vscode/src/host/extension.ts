import * as vscode from 'vscode';
import { posix } from 'node:path';
import { randomBytes } from 'node:crypto';
import type { HostMessage, SpineResource, WebviewMessage } from '@spine-preview/core';
import { handleRead, parseWebviewMessage } from './bridge.js';
import { getLocalizedMessage } from './i18n.js';
import type { HostTextKey } from './i18n.js';
import type { HostProvider, ScannerServices } from './scanner.js';
import { WorkspaceIndex } from './workspace-index.js';
import type { IndexedGroup, IndexScope } from './workspace-index.js';
import { ScopeWatcher } from './workspace-watch.js';
import { SpineTrees } from './trees.js';

/** 原生提示使用编辑器语言，画布保留其独立语言偏好。 */
function t(key: HostTextKey, values?: Readonly<Record<string, string | number>>): string {
  return getLocalizedMessage(vscode.env?.language ?? 'en', key, values);
}

/** 检查文件或被移动、删除的父目录是否影响当前资源依赖。 */
function touches(uri: vscode.Uri, id: string): boolean {
  const file = vscode.Uri.parse(id, true);
  return (
    uri.scheme === file.scheme &&
    uri.authority === file.authority &&
    (file.path === uri.path || file.path.startsWith(`${uri.path.replace(/\/$/u, '')}/`))
  );
}

/** 画布只持有当前资源；索引的无关更新不会改变加载代际或中断动画。 */
class PreviewPanel implements vscode.Disposable {
  private readonly panel: vscode.WebviewPanel;
  private revision = 0;
  private controller = new AbortController();
  private provider: HostProvider | undefined;
  private snapshot: HostMessage | undefined;
  private closed = false;
  private ready = false;
  private pendingAnimation: Extract<HostMessage, { type: 'play-animation' }> | undefined;
  private readonly subscriptions: vscode.Disposable[] = [];

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly onMessage: (message: WebviewMessage) => Promise<void>,
    private readonly onClose: () => void,
  ) {
    this.panel = vscode.window.createWebviewPanel(
      'spineResourcePreview',
      t('panelTitle'),
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [context.extensionUri],
      },
    );
    this.panel.webview.html = this.html();
    this.subscriptions.push(
      this.panel.onDidDispose(() => this.close()),
      this.panel.webview.onDidReceiveMessage((value: unknown) => {
        void this.receive(value).catch((error: unknown) => {
          if (!this.closed) void vscode.window.showErrorMessage(String(error));
        });
      }),
    );
  }

  private t(
    key: HostTextKey,
    values?: Readonly<Record<string, string | number>>,
  ): string {
    return t(key, values);
  }

  /** 每次加载刷新图片地址，同时仅授权所选骨骼及其真实依赖。 */
  async select(
    group: IndexedGroup,
    resource: SpineResource,
    reveal = true,
  ): Promise<void> {
    if (this.closed) return;
    if (reveal) this.panel.reveal();
    this.controller.abort();
    this.controller = new AbortController();
    const revision = ++this.revision;
    this.pendingAnimation = undefined;
    this.panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri, group.scope.root],
    };
    const allowed = new Set([
      resource.skeleton.id,
      resource.atlas.id,
      ...resource.pages.map((page) => page.file.id),
    ]);
    const files = group.provider
      .allFiles()
      .filter((file) => allowed.has(file.id))
      .map((file) => ({
        ...file,
        url: this.panel.webview
          .asWebviewUri(
            vscode.Uri.parse(file.id, true).with({
              query: `spinePreviewRevision=${revision}`,
            }),
          )
          .toString(),
      }));
    this.provider = {
      root: group.provider.root,
      files,
      allFiles: () => files,
      get: (id) => files.find((file) => file.id === id),
      readText: (file, signal) => group.provider.readText(file, signal),
      readBytes: (file, signal) => group.provider.readBytes(file, signal),
      imageUrl: async (file) => ({
        url: files.find((item) => item.id === file.id)!.url!,
        release() {},
      }),
    };
    await this.send({
      type: 'snapshot',
      revision,
      label: group.scope.label,
      files,
      result: {
        resources: [resource],
        diagnostics: group.result.diagnostics.filter(
          (d) => d.path === resource.skeleton.path,
        ),
        preferredResourceId: resource.id,
      },
    });
  }

  /** 选择删除或扫描范围切换时释放画布中旧 runtime 与纹理。 */
  async clear(): Promise<void> {
    this.controller.abort();
    this.controller = new AbortController();
    this.provider = undefined;
    this.pendingAnimation = undefined;
    await this.send({
      type: 'snapshot',
      revision: ++this.revision,
      label: '',
      files: [],
      result: { resources: [], diagnostics: [] },
    });
  }

  async play(resourceId: string, animation: string): Promise<void> {
    const message = { type: 'play-animation' as const, resourceId, animation };
    if (!this.ready) this.pendingAnimation = message;
    else await this.send(message);
  }

  currentRevision(): number {
    return this.revision;
  }

  private async receive(value: unknown): Promise<void> {
    const message = parseWebviewMessage(value);
    if (!message || this.closed) return;
    if (message.type === 'ready') {
      this.ready = true;
      if (this.snapshot) await this.send(this.snapshot);
      if (this.pendingAnimation) {
        await this.send(this.pendingAnimation);
        this.pendingAnimation = undefined;
      }
    } else if (message.type === 'read') {
      const revision = this.revision;
      const response = await handleRead(
        message,
        this.provider,
        revision,
        this.controller.signal,
      );
      if (!this.closed && revision === this.revision) await this.send(response);
    } else await this.onMessage(message);
  }

  private send(message: HostMessage): Thenable<boolean> {
    if (message.type === 'snapshot' || message.type === 'status') this.snapshot = message;
    return this.panel.webview.postMessage(message);
  }
  private html(): string {
    const webview = this.panel.webview;
    const script = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist/webview/main.js'),
    );
    const stylesheet = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist/webview/main.css'),
    );
    const nonce = randomBytes(16).toString('hex');
    // 本地 module 与动态 chunk 通过同一 cspSource 加载；禁止 eval 与远程脚本。
    const csp = `default-src 'none'; script-src 'nonce-${nonce}' ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} data: blob:; connect-src ${webview.cspSource}; font-src ${webview.cspSource};`;
    // 预览界面首次固定英文，挂载后应用独立保存的语言偏好。
    const language = 'en';
    return `<!doctype html><html lang="${language}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${csp}"><link rel="stylesheet" href="${stylesheet}"><title>${this.t('panelTitle')}</title></head><body><div id="root"></div><script nonce="${nonce}" type="module" src="${script}"></script></body></html>`;
  }

  private close(): void {
    if (this.closed) return;
    this.closed = true;
    this.controller.abort();
    this.provider = undefined;
    this.snapshot = undefined;
    for (const disposable of this.subscriptions) disposable.dispose();
    this.onClose();
  }
  dispose(): void {
    this.panel.dispose();
    this.close();
  }
}

/** 协调多根索引、文件监听、原生导航和单一画布，分别管理扫描与加载代际。 */
class WorkspacePreview implements vscode.Disposable {
  private readonly index: WorkspaceIndex;
  private readonly trees: SpineTrees;
  private readonly watcher: ScopeWatcher;
  private readonly subscriptions: vscode.Disposable[] = [];
  private scopes: readonly IndexScope[] = [];
  private groups: readonly IndexedGroup[] = [];
  private panel: PreviewPanel | undefined;
  private controller = new AbortController();
  private scanRevision = 0;
  private pendingFullScan = false;
  private pendingForceReload = false;
  private pendingPreferredFileId: string | undefined;
  private openingRevision = 0;
  private initialized = false;
  private workspaceMode = true;
  private disposed = false;
  private selectedId: string | undefined;
  private animations: readonly string[] = [];
  private animation: string | undefined;
  private readonly changes = new Map<string, vscode.Uri>();

  constructor(private readonly context: vscode.ExtensionContext) {
    const services: ScannerServices = {
      readDirectory: (uri) => vscode.workspace.fs.readDirectory(uri),
      stat: (uri) => vscode.workspace.fs.stat(uri),
      readFile: (uri) => vscode.workspace.fs.readFile(uri),
      imageUri: (uri) => uri.toString(),
    };
    this.index = new WorkspaceIndex(services);
    this.watcher = new ScopeWatcher((uris) => {
      for (const uri of uris) this.changes.set(uri.toString(), uri);
      void this.scan(false, false).catch((error) => this.report(error));
    });
    this.trees = new SpineTrees(
      context,
      (id) => {
        void this.select(id).catch((error) => this.report(error));
      },
      (name) => {
        void this.play(name).catch((error) => this.report(error));
      },
      () => {
        if (!this.initialized) void this.workspace().catch((error) => this.report(error));
      },
    );
    this.subscriptions.push(
      vscode.commands.registerCommand(
        'spinePreview.open',
        (uri?: vscode.Uri, selected?: vscode.Uri[]) =>
          this.guarded(() => this.open(selected?.length ? selected : uri ? [uri] : [])),
      ),
      vscode.commands.registerCommand('spinePreview.refresh', () =>
        this.guarded(() => (this.initialized ? this.scan(true, true) : this.workspace())),
      ),
      vscode.commands.registerCommand('spinePreview.workspace', () =>
        this.guarded(() => this.workspace()),
      ),
      vscode.workspace.onDidChangeWorkspaceFolders(() => {
        if (this.initialized && this.workspaceMode)
          void this.workspace().catch((error) => this.report(error));
      }),
    );
  }

  private async guarded(action: () => Promise<void>): Promise<void> {
    try {
      await action();
    } catch (error) {
      this.report(error);
    }
  }
  private report(error: unknown): void {
    if (!this.disposed && !(error instanceof Error && error.name === 'AbortError'))
      void vscode.window.showErrorMessage(
        t('error', { reason: error instanceof Error ? error.message : String(error) }),
      );
  }

  private async workspace(): Promise<void> {
    ++this.openingRevision;
    this.workspaceMode = true;
    void vscode.commands.executeCommand(
      'setContext',
      'spinePreview.temporaryScope',
      false,
    );
    const scopes = (vscode.workspace.workspaceFolders ?? []).map((folder) => ({
      id: folder.uri.toString(),
      label: folder.name,
      root: folder.uri,
      recursive: true,
    }));
    await this.setScopes(scopes);
  }

  private async setScopes(scopes: readonly IndexScope[]): Promise<void> {
    this.initialized = true;
    this.scopes = scopes;
    this.pendingPreferredFileId = scopes.find(
      (scope) => scope.preferredFileId,
    )?.preferredFileId;
    this.changes.clear();
    this.watcher.setScopes(scopes);
    await this.scan(true, false);
  }

  private async open(uris: readonly vscode.Uri[]): Promise<void> {
    if (!uris.length) {
      if (vscode.workspace.workspaceFolders?.length) await this.workspace();
      else await this.choose(false);
      void vscode.commands.executeCommand('spinePreview.resources.focus');
      return;
    }
    const revision = ++this.openingRevision;
    const scope = await this.targetFor(uris);
    if (this.disposed || revision !== this.openingRevision) return;
    this.workspaceMode = false;
    void vscode.commands.executeCommand(
      'setContext',
      'spinePreview.temporaryScope',
      true,
    );
    await this.setScopes([scope]);
    if (this.disposed || revision !== this.openingRevision) return;
    void vscode.commands.executeCommand('spinePreview.resources.focus');
  }

  private async targetFor(uris: readonly vscode.Uri[]): Promise<IndexScope> {
    if (uris.some((uri) => !['file', 'vscode-remote'].includes(uri.scheme)))
      throw new Error(t('localUriOnly'));
    const first = uris[0]!;
    if (
      uris.some((uri) => uri.scheme !== first.scheme || uri.authority !== first.authority)
    )
      throw new Error(t('sameFilesystem'));
    const information = await Promise.all(
      uris.map((uri) => vscode.workspace.fs.stat(uri)),
    );
    if (uris.length === 1 && information[0]!.type & vscode.FileType.Directory)
      return { id: first.toString(), root: first, recursive: true, label: first.path };
    const directories = [
      ...new Map(
        uris.map((uri, index) => {
          const directory = uri.with({
            path:
              information[index]!.type & vscode.FileType.Directory
                ? uri.path
                : posix.dirname(uri.path),
            query: '',
            fragment: '',
          });
          return [directory.toString(), directory] as const;
        }),
      ).values(),
    ];
    let common = directories[0]!.path;
    for (const directory of directories)
      while (
        directory.path !== common &&
        !directory.path.startsWith(common === '/' ? '/' : `${common}/`)
      )
        common = posix.dirname(common);
    const root = first.with({ path: common, query: '', fragment: '' });
    return {
      id: root.toString(),
      root,
      recursive: false,
      directories,
      recursiveDirectories: uris.filter(
        (_uri, i) => !!(information[i]!.type & vscode.FileType.Directory),
      ),
      preferredFileId: first.toString(),
      label: uris.length > 1 ? t('selectedFiles', { count: uris.length }) : first.path,
    };
  }

  /** 文件变更按根分批刷新；保留取消期间的事件，防止依赖更新丢失。 */
  private async scan(explicit: boolean, forceReload: boolean): Promise<void> {
    if (this.disposed) return;
    this.pendingFullScan ||= explicit;
    this.pendingForceReload ||= forceReload;
    this.controller.abort();
    this.controller = new AbortController();
    const signal = this.controller.signal;
    const revision = ++this.scanRevision;
    const changes = [...this.changes.values()];
    const scopes = this.pendingFullScan
      ? this.scopes
      : this.scopes.filter((scope) =>
          changes.some((uri) => touches(scope.root, uri.toString())),
        );
    this.trees.setLoading(true);
    try {
      const perform = () => this.index.scan(scopes, signal);
      const next =
        explicit && scopes.length
          ? await vscode.window.withProgress(
              {
                location: vscode.ProgressLocation.Notification,
                title: t('scanTitle'),
                cancellable: true,
              },
              async (_progress, token) => {
                const cancel = token.onCancellationRequested(() => {
                  if (this.controller.signal === signal) this.controller.abort();
                });
                try {
                  return await perform();
                } finally {
                  cancel.dispose();
                }
              },
            )
          : await perform();
      if (this.disposed || signal.aborted || revision !== this.scanRevision) return;
      const previousResource = this.selectedId
        ? this.find(this.selectedId)?.resource
        : undefined;
      const refreshed = new Map(next.map((group) => [group.scope.id, group]));
      this.groups = this.scopes.flatMap((scope) => {
        const group =
          refreshed.get(scope.id) ??
          this.groups.find((previous) => previous.scope.id === scope.id);
        return group ? [group] : [];
      });
      for (const uri of changes)
        if (this.changes.get(uri.toString()) === uri) this.changes.delete(uri.toString());
      this.trees.setGroups(this.groups);
      const shouldForceReload = this.pendingForceReload;
      this.pendingFullScan = false;
      this.pendingForceReload = false;
      // 文件入口的首选资源跟随真正提交的扫描，而不是被监听事件取消的旧任务。
      const preferred = this.pendingPreferredFileId
        ? this.groups.find(
            (group) => group.scope.preferredFileId === this.pendingPreferredFileId,
          )?.result.preferredResourceId
        : undefined;
      this.pendingPreferredFileId = undefined;
      if (preferred) await this.select(preferred);
      else if (this.selectedId) {
        const selected = this.find(this.selectedId);
        if (!selected) await this.clearSelection();
        else {
          const resourceFiles = (resource: SpineResource) => [
            resource.skeleton.id,
            resource.atlas.id,
            ...resource.pages.map((page) => page.file.id),
          ];
          const dependencies = [
            ...resourceFiles(selected.resource),
            ...(previousResource ? resourceFiles(previousResource) : []),
          ];
          if (
            shouldForceReload ||
            JSON.stringify(previousResource) !== JSON.stringify(selected.resource) ||
            changes.some((uri) => dependencies.some((id) => touches(uri, id)))
          )
            await this.select(this.selectedId, false);
        }
      }
    } finally {
      if (revision === this.scanRevision) this.trees.setLoading(false);
    }
  }

  private find(id: string): { group: IndexedGroup; resource: SpineResource } | undefined {
    for (const group of this.groups) {
      const resource = group.result.resources.find((item) => item.id === id);
      if (resource) return { group, resource };
    }
    return undefined;
  }

  private async clearSelection(): Promise<void> {
    this.selectedId = undefined;
    this.animations = [];
    this.animation = undefined;
    this.trees.setSelection(undefined, []);
    await this.panel?.clear();
  }

  private async select(id: string, reveal = true): Promise<void> {
    const found = this.find(id);
    if (!found || this.disposed) return;
    if (this.selectedId !== id) {
      this.animation = undefined;
      this.animations = found.resource.animations;
    }
    this.selectedId = id;
    this.trees.setSelection(id, this.animations, this.animation);
    this.panel ??= new PreviewPanel(
      this.context,
      (message) => this.receive(message),
      () => {
        this.panel = undefined;
        this.selectedId = undefined;
        this.animations = [];
        this.animation = undefined;
        this.trees.setSelection(undefined, []);
      },
    );
    await this.panel.select(found.group, found.resource, reveal);
  }

  private async play(name: string): Promise<void> {
    if (!this.selectedId || !this.animations.includes(name)) return;
    this.animation = name;
    this.trees.setSelection(this.selectedId, this.animations, name);
    await this.panel?.play(this.selectedId, name);
  }

  private async receive(message: WebviewMessage): Promise<void> {
    if (message.type === 'preview-state') {
      if (
        message.revision !== this.panel?.currentRevision() ||
        message.resourceId !== this.selectedId
      )
        return;
      this.animations = message.animations;
      this.animation = message.animation;
      this.trees.setSelection(this.selectedId, this.animations, this.animation);
    } else if (message.type === 'refresh') await this.scan(true, true);
    else if (message.type === 'choose-files') await this.choose(true);
    else if (message.type === 'choose-folder') await this.choose(false);
    else if (message.type === 'drop')
      await this.open(message.uris.map((uri) => vscode.Uri.parse(uri, true)));
  }

  private async choose(files: boolean): Promise<void> {
    const uris = await vscode.window.showOpenDialog({
      canSelectFiles: files,
      canSelectFolders: !files,
      canSelectMany: files,
      openLabel: t(files ? 'chooseFiles' : 'chooseFolder'),
      ...(files
        ? {
            filters: {
              [t('resourceFilter')]: [
                'json',
                'skel',
                'atlas',
                'png',
                'webp',
                'jpg',
                'jpeg',
              ],
            },
          }
        : {}),
    });
    if (uris?.length && !this.disposed) await this.open(uris);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    ++this.openingRevision;
    ++this.scanRevision;
    this.controller.abort();
    this.watcher.dispose();
    this.trees.dispose();
    this.panel?.dispose();
    for (const subscription of this.subscriptions) subscription.dispose();
  }
}

/** 首次显示 Spine 侧栏才索引工作区，不在激活时加载 WebGL 或创建画布。 */
export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(new WorkspacePreview(context));
}

/** 监听器、索引取消和面板由订阅统一释放。 */
export function deactivate(): void {}
