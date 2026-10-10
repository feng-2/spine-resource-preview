import { beforeAll, describe, expect, it, vi } from 'vitest';
import { build } from 'esbuild';
import { runInNewContext } from 'node:vm';
import { createRequire } from 'node:module';
import type { HostMessage } from '@spine-preview/core';

let extensionCode: string;
beforeAll(async () => {
  // 使用实际宿主入口打包到内存；vscode external 由受控编辑器替身提供。
  const bundle = await build({
    entryPoints: ['src/host/extension.ts'],
    absWorkingDir: new URL('../', import.meta.url).pathname,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    external: ['vscode'],
    write: false,
  });
  extensionCode = bundle.outputFiles![0]!.text;
});

/** 不可变 URI 替身，支持缓存修订所用的 query。 */
function uri(path: string, query = '') {
  return {
    scheme: 'file',
    authority: '',
    path,
    fsPath: path,
    query,
    fragment: '',
    toString: () => `file://${path}${query ? `?${query}` : ''}`,
    with: (change: { path?: string; query?: string }) =>
      uri(change.path ?? path, change.query ?? query),
  };
}
type MockUri = ReturnType<typeof uri>;
type Command = (...args: unknown[]) => unknown;

/** 同步事件源，以真实 API 的 Disposable 语义移除订阅。 */
class Emitter<T> {
  private listeners = new Set<(event: T) => unknown>();
  event = (listener: (event: T) => unknown) => {
    this.listeners.add(listener);
    return { dispose: () => this.listeners.delete(listener) };
  };
  fire(value: T) {
    for (const listener of this.listeners) listener(value);
  }
  dispose() {
    this.listeners.clear();
  }
}

interface TreeProvider {
  getChildren(element?: unknown): Promise<unknown[]> | unknown[];
  getTreeItem(element: unknown): {
    label?: string;
    description?: string;
    command?: { command: string; arguments?: unknown[] };
  };
}

/** 在真实入口下模拟树视图、文件系统、Webview 和后台监听，不启动 GPU。 */
function editor(language = 'en', roots: readonly string[] = ['/assets']) {
  const skeleton = JSON.stringify({
    skeleton: { spine: '4.2.99' },
    bones: [{ name: 'root' }],
    animations: { idle: {}, run: {} },
  });
  const files = new Map([
    ['/assets/hero.json', skeleton],
    ['/assets/hero.atlas', 'page.png\nsize: 1,1\nfilter: Linear,Linear\n'],
    ['/assets/page.png', 'page'],
    ['/assets/child/other.json', skeleton],
    ['/assets/child/other.atlas', 'other.png\nsize: 1,1\nfilter: Linear,Linear\n'],
    ['/assets/child/other.png', 'page'],
    ['/second/hero.json', skeleton],
    ['/second/hero.atlas', 'page.png\nsize: 1,1\nfilter: Linear,Linear\n'],
    ['/second/page.png', 'page'],
  ]);
  const sent: HostMessage[] = [];
  const commands = new Map<string, Command>();
  const trees = new Map<
    string,
    {
      provider: TreeProvider;
      visible: boolean;
      visibility: Emitter<{ visible: boolean }>;
      selection: Emitter<{ selection: unknown[] }>;
      dispose: ReturnType<typeof vi.fn>;
    }
  >();
  const watchers: {
    root: MockUri;
    create: Emitter<MockUri>;
    change: Emitter<MockUri>;
    remove: Emitter<MockUri>;
    disposed: boolean;
  }[] = [];
  const workspaceChange = new Emitter<unknown>();
  let receive: ((value: unknown) => void) | undefined;
  let closed: (() => void) | undefined;
  let cancel: (() => void) | undefined;
  const disposable = () => ({ dispose: vi.fn() });
  const subscriptions: { dispose(): void }[] = [];
  const api = {
    env: { language },
    FileType: { File: 1, Directory: 2 },
    ViewColumn: { Active: 1 },
    ProgressLocation: { Notification: 15 },
    EventEmitter: Emitter,
    ThemeIcon: class {
      constructor(readonly id: string) {}
    },
    TreeItem: class {
      constructor(
        readonly label: string,
        readonly collapsibleState = 0,
      ) {}
    },
    TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
    RelativePattern: class {
      constructor(
        readonly baseUri: MockUri,
        readonly pattern: string,
      ) {}
    },
    Uri: {
      joinPath: (root: MockUri, path: string) => uri(`${root.path}/${path}`),
      parse: (value: string) => {
        const parsed = new URL(value);
        return uri(parsed.pathname, parsed.search.slice(1));
      },
    },
    commands: {
      registerCommand: (id: string, callback: Command) => {
        commands.set(id, callback);
        return disposable();
      },
      executeCommand: vi.fn(async (id: string, ...args: unknown[]) =>
        commands.get(id)?.(...args),
      ),
    },
    workspace: {
      workspaceFolders: roots.map((path, index) => ({
        uri: uri(path),
        name: path.slice(1),
        index,
      })),
      onDidChangeWorkspaceFolders: workspaceChange.event,
      getConfiguration: () => ({ get: (_key: string, fallback?: unknown) => fallback }),
      createFileSystemWatcher: (pattern: { baseUri: MockUri }) => {
        const item = {
          root: pattern.baseUri,
          create: new Emitter<MockUri>(),
          change: new Emitter<MockUri>(),
          remove: new Emitter<MockUri>(),
          disposed: false,
        };
        watchers.push(item);
        return {
          onDidCreate: item.create.event,
          onDidChange: item.change.event,
          onDidDelete: item.remove.event,
          dispose: () => {
            item.disposed = true;
          },
        };
      },
      fs: {
        stat: vi.fn(async (target: MockUri) => {
          const data = files.get(target.path);
          if (data !== undefined)
            return { type: 1, size: data.length, mtime: 1, ctime: 1 };
          if ([...files.keys()].some((path) => path.startsWith(`${target.path}/`)))
            return { type: 2, size: 0, mtime: 1, ctime: 1 };
          throw Object.assign(new Error('Missing file'), { code: 'FileNotFound' });
        }),
        readDirectory: vi.fn(async (target: MockUri): Promise<[string, number][]> => {
          if (![...files.keys()].some((path) => path.startsWith(`${target.path}/`)))
            throw Object.assign(new Error('Missing directory'), { code: 'FileNotFound' });
          const entries = new Map<string, number>();
          for (const path of files.keys())
            if (path.startsWith(`${target.path}/`)) {
              const tail = path.slice(target.path.length + 1);
              const name = tail.split('/')[0]!;
              entries.set(name, tail.includes('/') ? 2 : 1);
            }
          return [...entries];
        }),
        readFile: vi.fn(async (target: MockUri) => {
          const data = files.get(target.path);
          if (data === undefined)
            throw Object.assign(new Error('Missing file'), { code: 'FileNotFound' });
          return new TextEncoder().encode(data);
        }),
      },
    },
    window: {
      showOpenDialog: vi.fn(async () => undefined),
      showErrorMessage: vi.fn(),
      withProgress: async (
        _options: unknown,
        callback: (progress: unknown, token: unknown) => Promise<void>,
      ) =>
        callback(
          { report: vi.fn() },
          {
            onCancellationRequested: (fn: () => void) => {
              cancel = fn;
              return disposable();
            },
          },
        ),
      createTreeView: (id: string, options: { treeDataProvider: TreeProvider }) => {
        const item = {
          provider: options.treeDataProvider,
          visible: false,
          visibility: new Emitter<{ visible: boolean }>(),
          selection: new Emitter<{ selection: unknown[] }>(),
          dispose: vi.fn(),
        };
        trees.set(id, item);
        return {
          get visible() {
            return item.visible;
          },
          selection: [],
          onDidChangeVisibility: item.visibility.event,
          onDidChangeSelection: item.selection.event,
          reveal: vi.fn(async () => {}),
          dispose: item.dispose,
        };
      },
      createWebviewPanel: vi.fn(() => ({
        reveal: vi.fn(),
        dispose: () => closed?.(),
        onDidDispose: (callback: () => void) => {
          closed = callback;
          return disposable();
        },
        webview: {
          html: '',
          options: {},
          cspSource: 'https://webview.invalid',
          asWebviewUri: (target: MockUri) => ({
            toString: () =>
              `https://webview.invalid${target.path}${target.query ? `?${target.query}` : ''}`,
          }),
          postMessage: async (message: HostMessage) => {
            sent.push(message);
            return true;
          },
          onDidReceiveMessage: (callback: (value: unknown) => void) => {
            receive = callback;
            return disposable();
          },
        },
      })),
    },
  };
  const module = { exports: {} as { activate(context: unknown): void } };
  const require = createRequire(import.meta.url);
  runInNewContext(extensionCode, {
    module,
    exports: module.exports,
    require: (id: string) => (id === 'vscode' ? api : require(id)),
    console,
    TextDecoder,
    AbortController,
    DOMException,
    setTimeout,
    clearTimeout,
  });
  module.exports.activate({ extensionUri: uri('/extension'), subscriptions });
  return {
    api,
    sent,
    files,
    trees,
    watchers,
    skeleton,
    workspaceChange: () => workspaceChange.fire({}),
    command: async (id: string, ...args: unknown[]) => {
      const callback = commands.get(id);
      if (!callback) throw new Error(`Command not registered: ${id}`);
      await callback(...args);
    },
    receive: (message: unknown) => receive?.(message),
    show: (id: string) => {
      const tree = trees.get(id)!;
      tree.visible = true;
      tree.visibility.fire({ visible: true });
    },
    cancel: () => cancel?.(),
    close: () => closed?.(),
    dispose: () => {
      for (const subscription of subscriptions) subscription.dispose();
    },
    change: (path: string, kind: 'change' | 'create' | 'remove' = 'change') => {
      for (const watcher of watchers)
        if (
          !watcher.disposed &&
          path.startsWith(watcher.root.path === '/' ? '/' : `${watcher.root.path}/`)
        )
          watcher[kind].fire(uri(path));
    },
  };
}

/** 从原生树公开接口读取资源身份，覆盖真实分组而不调用私有宿主方法。 */
async function resourceIds(host: ReturnType<typeof editor>): Promise<string[]> {
  const provider = host.trees.get('spinePreview.resources')!.provider;
  const result: string[] = [];
  const visit = async (parent?: unknown): Promise<void> => {
    for (const node of await provider.getChildren(parent)) {
      const item = provider.getTreeItem(node);
      if (item.command?.command === 'spinePreview.selectResource')
        result.push(String(item.command.arguments?.[0]));
      else await visit(node);
    }
  };
  await visit();
  return result;
}

function snapshots(host: ReturnType<typeof editor>) {
  return host.sent.filter((message) => message.type === 'snapshot');
}

async function startWorkspace(host: ReturnType<typeof editor>, count = 2) {
  host.show('spinePreview.resources');
  await vi.waitFor(async () => expect(await resourceIds(host)).toHaveLength(count));
}

async function selectHero(host: ReturnType<typeof editor>) {
  await host.command('spinePreview.selectResource', 'file:///assets/hero.json');
  await vi.waitFor(() => expect(snapshots(host)).toHaveLength(1));
}
describe('实际扩展宿主入口集成', () => {
  it('注册独立资源和动画树，激活本身不扫描或打开 Webview', () => {
    const host = editor();
    expect(host.trees.size).toBe(2);
    expect(host.api.workspace.fs.readDirectory).not.toHaveBeenCalled();
    expect(host.api.window.createWebviewPanel).not.toHaveBeenCalled();
    host.dispose();
  });

  it('首次显示任一视图递归扫描多根工作区，点击资源才打开单一画布', async () => {
    const host = editor('en', ['/assets', '/second']);
    host.show('spinePreview.animations');
    await vi.waitFor(async () => expect(await resourceIds(host)).toHaveLength(3));
    const roots = await host.trees.get('spinePreview.resources')!.provider.getChildren();
    expect(
      roots.map(
        (node) =>
          host.trees.get('spinePreview.resources')!.provider.getTreeItem(node).label,
      ),
    ).toEqual(['assets', 'second']);
    expect(host.api.window.createWebviewPanel).not.toHaveBeenCalled();
    await selectHero(host);
    expect(host.api.window.createWebviewPanel).toHaveBeenCalledTimes(1);
    expect(snapshots(host)[0]!.result.resources.map((resource) => resource.id)).toEqual([
      'file:///assets/hero.json',
    ]);
    await host.command('spinePreview.selectResource', 'file:///second/hero.json');
    await vi.waitFor(() => expect(snapshots(host)).toHaveLength(2));
    expect(host.api.window.createWebviewPanel).toHaveBeenCalledTimes(1);
    host.dispose();
    expect(host.watchers.every((watcher) => watcher.disposed)).toBe(true);
    expect(
      [...host.trees.values()].every((tree) => tree.dispose.mock.calls.length === 1),
    ).toBe(true);
  });

  it('目录入口只聚焦列表，文件入口选中同级骨骼，返回工作区恢复递归范围', async () => {
    const host = editor();
    await host.command('spinePreview.open', uri('/assets'));
    expect(await resourceIds(host)).toHaveLength(2);
    expect(host.api.window.createWebviewPanel).not.toHaveBeenCalled();
    await host.command('spinePreview.open', uri('/assets/hero.json'));
    expect(await resourceIds(host)).toEqual(['file:///assets/hero.json']);
    expect(snapshots(host).at(-1)).toMatchObject({
      result: { preferredResourceId: 'file:///assets/hero.json' },
    });
    host.receive({ type: 'ready' });
    await vi.waitFor(() => expect(snapshots(host)).toHaveLength(2));
    expect(snapshots(host)[1]).toEqual(snapshots(host)[0]);
    expect(
      host.api.workspace.fs.readFile.mock.calls.map(([file]) => file.path),
    ).not.toContain('/assets/page.png');
    await host.command('spinePreview.workspace');
    expect(await resourceIds(host)).toHaveLength(2);
    expect(
      host.watchers
        .filter((watcher) => !watcher.disposed)
        .map((watcher) => watcher.root.path),
    ).toEqual(['/assets', '/']);
    host.dispose();
  });

  it('无关资源变化不中断当前画布，选中图片变更刷新地址，删除骨骼清空预览', async () => {
    const host = editor();
    await startWorkspace(host);
    await selectHero(host);
    const first = snapshots(host)[0]!;
    host.files.set('/assets/child/other.json', host.skeleton.replace('4.2.99', '4.1.99'));
    host.change('/assets/child/other.json');
    const reads = host.api.workspace.fs.readDirectory.mock.calls.length;
    await vi.waitFor(() =>
      expect(host.api.workspace.fs.readDirectory.mock.calls.length).toBeGreaterThan(
        reads,
      ),
    );
    await vi.waitFor(async () => {
      const provider = host.trees.get('spinePreview.resources')!.provider;
      const [root] = await provider.getChildren();
      const [folder] = await provider.getChildren(root);
      const [resource] = await provider.getChildren(folder);
      expect(provider.getTreeItem(resource).description).toBe('4.1 · JSON');
    });
    expect(snapshots(host)).toHaveLength(1);
    host.files.set('/assets/page.png', 'updated page');
    host.change('/assets/page.png');
    await vi.waitFor(() => expect(snapshots(host)).toHaveLength(2));
    const updated = snapshots(host)[1]!;
    expect(updated.revision).toBeGreaterThan(first.revision);
    expect(updated.files.find((file) => file.id.endsWith('/page.png'))!.url).not.toEqual(
      first.files.find((file) => file.id.endsWith('/page.png'))!.url,
    );
    host.files.delete('/assets/hero.json');
    host.change('/assets/hero.json', 'remove');
    await vi.waitFor(() =>
      expect(snapshots(host).at(-1)?.result.resources).toHaveLength(0),
    );
    expect(await resourceIds(host)).toEqual(['file:///assets/child/other.json']);
    expect(
      await host.trees.get('spinePreview.animations')!.provider.getChildren(),
    ).toHaveLength(0);
    host.dispose();
  });

  it('补齐缺失依赖后显示资源，突发写入只产生一次扫描', async () => {
    const host = editor();
    host.files.delete('/assets/hero.atlas');
    host.files.delete('/assets/page.png');
    await startWorkspace(host, 1);
    const reads = host.api.workspace.fs.readDirectory.mock.calls.length;
    host.files.set('/assets/hero.atlas', 'page.png\nsize: 1,1\nfilter: Linear,Linear\n');
    host.files.set('/assets/page.png', 'page');
    host.change('/assets/hero.atlas', 'create');
    host.change('/assets/page.png', 'create');
    await vi.waitFor(async () => expect(await resourceIds(host)).toHaveLength(2));
    expect(host.api.workspace.fs.readDirectory.mock.calls.length - reads).toBe(2);
    expect(host.api.window.createWebviewPanel).not.toHaveBeenCalled();
    host.dispose();
  });

  it('实际动画反馈更新原生列表，过期反馈被拒绝，原生选择发送播放命令', async () => {
    const host = editor();
    await startWorkspace(host);
    await selectHero(host);
    const revision = snapshots(host)[0]!.revision;
    host.receive({ type: 'ready' });
    host.receive({
      type: 'preview-state',
      revision,
      resourceId: 'file:///assets/hero.json',
      animations: ['idle', 'run', 'binary-only'],
      animation: 'run',
    });
    await vi.waitFor(async () =>
      expect(
        await host.trees.get('spinePreview.animations')!.provider.getChildren(),
      ).toHaveLength(3),
    );
    host.receive({
      type: 'preview-state',
      revision: revision - 1,
      resourceId: 'file:///assets/hero.json',
      animations: ['wrong'],
    });
    await host.command('spinePreview.selectAnimation', 'binary-only');
    await vi.waitFor(() =>
      expect(host.sent.at(-1)).toEqual({
        type: 'play-animation',
        resourceId: 'file:///assets/hero.json',
        animation: 'binary-only',
      }),
    );
    expect(
      await host.trees.get('spinePreview.animations')!.provider.getChildren(),
    ).toHaveLength(3);
    host.dispose();
  });

  it('画布文件读取只授权当前资源，拒绝同工作区其它文件和旧代际', async () => {
    const host = editor();
    await startWorkspace(host);
    await selectHero(host);
    const revision = snapshots(host)[0]!.revision;
    host.receive({
      type: 'read',
      requestId: `${revision}:1`,
      fileId: 'file:///assets/child/other.json',
      format: 'text',
    });
    await vi.waitFor(() =>
      expect(host.sent.at(-1)).toMatchObject({
        type: 'read-result',
        error: expect.any(String),
      }),
    );
    host.receive({
      type: 'read',
      requestId: `${revision - 1}:2`,
      fileId: 'file:///assets/hero.json',
      format: 'text',
    });
    await vi.waitFor(() =>
      expect(host.sent.at(-1)).toMatchObject({
        type: 'read-result',
        requestId: `${revision - 1}:2`,
        error: expect.any(String),
      }),
    );
    host.dispose();
  });

  it('旧入口 stat 晚到不会覆盖最后来源，扫描取消后可以手动刷新', async () => {
    const host = editor('zh-cn');
    let release:
      | ((value: { type: number; size: number; mtime: number; ctime: number }) => void)
      | undefined;
    host.api.workspace.fs.stat.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const previous = host.command('spinePreview.open', uri('/assets/old.json'));
    await host.command('spinePreview.open', uri('/assets/hero.json'));
    release!({ type: 1, size: 2, mtime: 1, ctime: 1 });
    await previous;
    expect(snapshots(host)).toHaveLength(1);
    expect(snapshots(host)[0]!.label).toBe('/assets/hero.json');
    let releaseScan: ((entries: [string, number][]) => void) | undefined;
    host.api.workspace.fs.readDirectory.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseScan = resolve;
        }),
    );
    const refresh = host.command('spinePreview.refresh');
    await vi.waitFor(() => expect(releaseScan).toBeTypeOf('function'));
    host.cancel();
    releaseScan!([['hero.json', 1]]);
    await refresh;
    expect(snapshots(host)).toHaveLength(1);
    await host.command('spinePreview.refresh');
    expect(snapshots(host)).toHaveLength(2);
    host.dispose();
  });

  it('删除来源根时撤销旧索引并清空选择，来源重建后自动恢复列表', async () => {
    const host = editor();
    await startWorkspace(host);
    await selectHero(host);
    const removed = [...host.files].filter(([path]) => path.startsWith('/assets/'));
    for (const [path] of removed) host.files.delete(path);
    host.change('/assets', 'remove');
    await vi.waitFor(() =>
      expect(snapshots(host).at(-1)?.result.resources).toHaveLength(0),
    );
    expect(await resourceIds(host)).toHaveLength(0);
    for (const [path, content] of removed) host.files.set(path, content);
    host.change('/assets', 'create');
    await vi.waitFor(async () => expect(await resourceIds(host)).toHaveLength(2));
    expect(snapshots(host)).toHaveLength(2);
    host.dispose();
  });

  it('Webview ready 前的动画选择保留最新动作，ready 后重放快照再播放', async () => {
    const host = editor();
    await startWorkspace(host);
    await selectHero(host);
    await host.command('spinePreview.selectAnimation', 'idle');
    await host.command('spinePreview.selectAnimation', 'run');
    expect(host.sent.filter((message) => message.type === 'play-animation')).toHaveLength(
      0,
    );
    host.receive({ type: 'ready' });
    await vi.waitFor(() =>
      expect(host.sent.at(-1)).toEqual({
        type: 'play-animation',
        resourceId: 'file:///assets/hero.json',
        animation: 'run',
      }),
    );
    expect(host.sent.map((message) => message.type)).toEqual([
      'snapshot',
      'snapshot',
      'play-animation',
    ]);
    host.dispose();
  });

  it('初始多根扫描被文件监听中断时保留全部根的扫描意图', async () => {
    const host = editor('en', ['/assets', '/second']);
    let release: ((entries: [string, number][]) => void) | undefined;
    host.api.workspace.fs.readDirectory.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    host.show('spinePreview.resources');
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    host.change('/assets/page.png');
    await vi.waitFor(async () => expect(await resourceIds(host)).toHaveLength(3));
    expect(
      host.api.workspace.fs.readDirectory.mock.calls.some(
        ([directory]) => directory.path === '/second',
      ),
    ).toBe(true);
    release!([['hero.json', 1]]);
    await vi.waitFor(async () => expect(await resourceIds(host)).toHaveLength(3));
    expect(host.api.window.createWebviewPanel).not.toHaveBeenCalled();
    host.dispose();
  });

  it('删除旧 atlas 后找到唯一替代图集时重新加载选中资源', async () => {
    const host = editor();
    host.files.set('/assets/replacement.atlas', host.files.get('/assets/hero.atlas')!);
    await startWorkspace(host);
    await selectHero(host);
    const previous = snapshots(host)[0]!;
    expect(previous.result.resources[0]!.atlas.id).toBe('file:///assets/hero.atlas');
    host.files.delete('/assets/hero.atlas');
    host.change('/assets/hero.atlas', 'remove');
    await vi.waitFor(() => expect(snapshots(host)).toHaveLength(2));
    const current = snapshots(host)[1]!;
    expect(current.revision).toBeGreaterThan(previous.revision);
    expect(current.result.resources[0]!.atlas.id).toBe(
      'file:///assets/replacement.atlas',
    );
    expect(current.files.map((file) => file.id)).not.toContain(
      'file:///assets/hero.atlas',
    );
    expect(host.api.window.createWebviewPanel).toHaveBeenCalledTimes(1);
    host.dispose();
  });

  it('增加无关工作区目录更新分组，保留当前预览代际', async () => {
    const host = editor();
    await startWorkspace(host);
    await selectHero(host);
    const revision = snapshots(host)[0]!.revision;
    host.api.workspace.workspaceFolders.push({
      uri: uri('/second'),
      name: 'second',
      index: 1,
    });
    host.workspaceChange();
    await vi.waitFor(async () => expect(await resourceIds(host)).toHaveLength(3));
    expect(snapshots(host)).toHaveLength(1);
    expect(snapshots(host)[0]!.revision).toBe(revision);
    expect(
      host.watchers.filter((watcher) => !watcher.disposed && watcher.root.path !== '/'),
    ).toHaveLength(2);
    host.dispose();
  });

  it('文件入口扫描被监听更新中断后，提交的新索引仍打开首选资源', async () => {
    const host = editor();
    let release: ((entries: [string, number][]) => void) | undefined;
    host.api.workspace.fs.readDirectory.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const opening = host.command('spinePreview.open', uri('/assets/hero.json'));
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    host.change('/assets/page.png');
    await vi.waitFor(() => expect(snapshots(host)).toHaveLength(1));
    expect(snapshots(host)[0]).toMatchObject({
      result: { preferredResourceId: 'file:///assets/hero.json' },
    });
    expect(host.api.window.createWebviewPanel).toHaveBeenCalledTimes(1);
    release!([['hero.json', 1]]);
    await opening;
    expect(snapshots(host)).toHaveLength(1);
    expect(await resourceIds(host)).toEqual(['file:///assets/hero.json']);
    host.dispose();
  });
});
