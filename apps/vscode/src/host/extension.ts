import * as vscode from 'vscode';
import { posix } from 'node:path';
import { randomBytes } from 'node:crypto';
import { discoverResources } from '@spine-preview/core';
import type { HostMessage } from '@spine-preview/core';
import { handleRead, parseWebviewMessage } from './bridge.js';
import { scanProvider } from './scanner.js';
import { getLocalizedMessage } from './i18n.js';
import type { HostTextKey } from './i18n.js';
import type { HostProvider, ScannerServices } from './scanner.js';

/** 预览目标；目录递归，多个文件只枚举它们各自的同级文件。 */
interface Target {
  /** 本地或远程来源根 URI。 */
  root: vscode.Uri;
  /** 是否递归发现骨骼。 */
  recursive: boolean;
  /** 多文件选择时的同级扫描目录。 */
  directories?: readonly vscode.Uri[];
  /** 多项拖入的文件夹只在其各自根下递归。 */
  recursiveDirectories?: readonly vscode.Uri[];
  /** 首选骨骼、atlas 或图片身份。 */
  preferredFileId?: string;
  /** 状态栏显示说明。 */
  label: string;
}

/** 共用一个面板，每次入口更新来源并取消上一代扫描与读取。 */
class PreviewPanel implements vscode.Disposable {
  private readonly panel: vscode.WebviewPanel;
  private revision = 0;
  private openingRevision = 0;
  private controller = new AbortController();
  private provider: HostProvider | undefined;
  private target: Target | undefined;
  private snapshot: HostMessage | undefined;
  private closed = false;
  private readonly subscriptions: vscode.Disposable[] = [];

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly onClose: () => void,
  ) {
    this.panel = vscode.window.createWebviewPanel(
      'spineResourcePreview',
      this.t('panelTitle'),
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
        void this.receive(value).catch((error: unknown) => this.reportError(error));
      }),
    );
  }

  async open(uris: readonly vscode.Uri[]): Promise<void> {
    this.panel.reveal();
    if (!uris.length) {
      await this.chooseFolder();
      return;
    }
    const openingRevision = ++this.openingRevision;
    let target: Target;
    try {
      target = await this.targetFor(uris);
    } catch (error) {
      // stat 也可能晚到；已经失效的入口不能覆盖新扫描的状态。
      if (this.closed || openingRevision !== this.openingRevision) return;
      throw error;
    }
    if (this.closed || openingRevision !== this.openingRevision) return;
    this.target = target;
    await this.refresh();
  }

  private t(
    key: HostTextKey,
    values?: Readonly<Record<string, string | number>>,
  ): string {
    return getLocalizedMessage(vscode.env?.language ?? 'en', key, values);
  }

  private services(): ScannerServices {
    return {
      readDirectory: (uri) => vscode.workspace.fs.readDirectory(uri),
      stat: (uri) => vscode.workspace.fs.stat(uri),
      readFile: (uri) => vscode.workspace.fs.readFile(uri),
      imageUri: (uri) => this.panel.webview.asWebviewUri(uri).toString(),
    };
  }

  private async targetFor(uris: readonly vscode.Uri[]): Promise<Target> {
    if (uris.some((uri) => !['file', 'vscode-remote'].includes(uri.scheme)))
      throw new Error(this.t('localUriOnly'));
    const first = uris[0]!;
    const information = await Promise.all(
      uris.map((uri) => vscode.workspace.fs.stat(uri)),
    );
    const info = information[0]!;
    if (uris.length === 1 && info.type & vscode.FileType.Directory)
      return { root: first, recursive: true, label: first.path };
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
    if (
      uris.some((uri) => uri.scheme !== first.scheme || uri.authority !== first.authority)
    )
      throw new Error(this.t('sameFilesystem'));
    let common = directories[0]!.path;
    for (const directory of directories)
      while (
        directory.path !== common &&
        !directory.path.startsWith(common === '/' ? '/' : `${common}/`)
      )
        common = posix.dirname(common);
    return {
      root: first.with({ path: common, query: '', fragment: '' }),
      recursive: false,
      directories,
      recursiveDirectories: uris.filter(
        (_uri, index) => !!(information[index]!.type & vscode.FileType.Directory),
      ),
      preferredFileId: first.toString(),
      label:
        uris.length > 1 ? this.t('selectedFiles', { count: uris.length }) : first.path,
    };
  }

  private async refresh(): Promise<void> {
    const target = this.target;
    if (!target || this.closed) return;
    this.controller.abort();
    this.controller = new AbortController();
    const signal = this.controller.signal;
    const revision = ++this.revision;
    this.provider = undefined;
    this.snapshot = undefined;
    // Webview 仅授权当前来源根和打包产物；文件依赖解析不能逃出该根。
    this.panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri, target.root],
    };
    await this.send({
      type: 'status',
      revision,
      loading: true,
      message: this.t('scanStarting', { target: target.label }),
    });
    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: this.t('scanTitle'),
          cancellable: true,
        },
        async (progress, token) => {
          const cancellation = token.onCancellationRequested(
            () => this.controller.signal === signal && this.controller.abort(),
          );
          try {
            const provider = await scanProvider(this.services(), {
              root: target.root,
              recursive: target.recursive,
              ...(target.directories ? { directories: target.directories } : {}),
              ...(target.recursiveDirectories
                ? { recursiveDirectories: target.recursiveDirectories }
                : {}),
              signal,
              progress: (count) =>
                progress.report({ message: this.t('filesIndexed', { count }) }),
            });
            // provider.files 已限定骨骼范围；依赖由 resolve 按 URI 继续读取。
            const result = await discoverResources(provider, {
              recursive: true,
              allowBasenameFallback: false,
              signal,
              ...(target.preferredFileId
                ? { preferredFileId: target.preferredFileId }
                : {}),
            });
            if (this.closed || revision !== this.revision) return;
            if (signal.aborted) {
              await this.send({
                type: 'status',
                revision,
                loading: false,
                message: this.t('cancelled'),
              });
              return;
            }
            this.provider = provider;
            this.snapshot = {
              type: 'snapshot',
              revision,
              label: target.label,
              files: provider.allFiles(),
              result,
            };
            await this.send(this.snapshot);
          } finally {
            cancellation.dispose();
          }
        },
      );
    } catch (error) {
      if (this.closed || revision !== this.revision) return;
      await this.send({
        type: 'status',
        revision,
        loading: false,
        message: signal.aborted
          ? this.t('cancelled')
          : this.t('scanFailed', {
              reason: error instanceof Error ? error.message : String(error),
            }),
      });
    }
  }

  private async receive(value: unknown): Promise<void> {
    const message = parseWebviewMessage(value);
    if (!message || this.closed) return;
    if (message.type === 'ready') {
      if (this.snapshot) await this.send(this.snapshot);
      else
        await this.send({
          type: 'status',
          revision: this.revision,
          loading: !!this.target && !this.controller.signal.aborted,
          message: this.target ? this.t('preparing') : this.t('initial'),
        });
    } else if (message.type === 'read') {
      const revision = this.revision;
      const response = await handleRead(
        message,
        this.provider,
        revision,
        this.controller.signal,
      );
      // 过期读取不能向新界面返回旧文件数据。
      if (!this.closed && revision === this.revision) await this.send(response);
    } else if (message.type === 'refresh') await this.refresh();
    else if (message.type === 'choose-files') await this.chooseFiles();
    else if (message.type === 'choose-folder') await this.chooseFolder();
    else if (message.type === 'drop')
      await this.open(message.uris.map((uri) => vscode.Uri.parse(uri, true)));
  }

  private async chooseFiles(): Promise<void> {
    const uris = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: true,
      openLabel: this.t('chooseFiles'),
      filters: {
        [this.t('resourceFilter')]: [
          'json',
          'skel',
          'atlas',
          'png',
          'webp',
          'jpg',
          'jpeg',
        ],
      },
    });
    if (uris?.length && !this.closed) await this.open(uris);
  }

  private async chooseFolder(): Promise<void> {
    const uris = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: this.t('chooseFolder'),
    });
    if (uris?.length && !this.closed) await this.open(uris);
  }

  private send(message: HostMessage): Thenable<boolean> {
    // ready 重放最后的状态，包括扫描取消或失败，避免重新进入虚假的 loading。
    if (message.type !== 'read-result') this.snapshot = message;
    return this.panel.webview.postMessage(message);
  }
  private reportError(error: unknown): void {
    if (!this.closed)
      void this.send({
        type: 'status',
        revision: this.revision,
        loading: false,
        message: error instanceof Error ? error.message : String(error),
      });
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
    ++this.openingRevision;
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

/** 仅注册显式命令，不在扩展激活时扫描工作区或加载 WebGL runtime。 */
export function activate(context: vscode.ExtensionContext): void {
  let preview: PreviewPanel | undefined;
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'spinePreview.open',
      async (uri?: vscode.Uri, selected?: vscode.Uri[]) => {
        preview ??= new PreviewPanel(context, () => {
          preview = undefined;
        });
        try {
          await preview.open(selected?.length ? selected : uri ? [uri] : []);
        } catch (error) {
          void vscode.window.showErrorMessage(
            getLocalizedMessage(vscode.env?.language ?? 'en', 'error', {
              reason: error instanceof Error ? error.message : String(error),
            }),
          );
        }
      },
    ),
    { dispose: () => preview?.dispose() },
  );
}

/** 面板和取消控制器由订阅统一释放，无额外全局渲染状态。 */
export function deactivate(): void {
  /* VS Code 自动释放 context.subscriptions。 */
}
