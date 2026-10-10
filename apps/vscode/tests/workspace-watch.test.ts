import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { build } from 'esbuild';
import { runInNewContext } from 'node:vm';
import { createRequire } from 'node:module';
import type { Uri } from 'vscode';
import type { ScopeWatcher } from '../src/host/workspace-watch.js';

let code: string;
beforeAll(async () => {
  const bundle = await build({
    entryPoints: ['src/host/workspace-watch.ts'],
    absWorkingDir: new URL('../', import.meta.url).pathname,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    external: ['vscode'],
    write: false,
  });
  code = bundle.outputFiles![0]!.text;
});

function uri(path: string, scheme = 'file', authority = ''): Uri {
  return {
    scheme,
    authority,
    path,
    toString: () => `${scheme}://${authority}${path}`,
    with: (change: { path?: string }) => uri(change.path ?? path, scheme, authority),
  } as Uri;
}

function createHost(delayMs = 400) {
  type Listener = (uri: Uri) => void;
  const watchers: {
    root: Uri;
    pattern: string;
    create?: Listener;
    change?: Listener;
    delete?: Listener;
    dispose: ReturnType<typeof vi.fn>;
  }[] = [];
  const onChange = vi.fn();
  const register = (setter: (listener: Listener) => void) => (listener: Listener) => {
    setter(listener);
    return { dispose: vi.fn() };
  };
  const api = {
    RelativePattern: class {
      constructor(
        readonly baseUri: Uri,
        readonly pattern: string,
      ) {}
    },
    workspace: {
      createFileSystemWatcher: (pattern: { baseUri: Uri; pattern: string }) => {
        const watcher: (typeof watchers)[number] = {
          root: pattern.baseUri,
          pattern: pattern.pattern,
          dispose: vi.fn(),
        };
        watchers.push(watcher);
        return {
          dispose: watcher.dispose,
          onDidCreate: register((listener) => (watcher.create = listener)),
          onDidChange: register((listener) => (watcher.change = listener)),
          onDidDelete: register((listener) => (watcher.delete = listener)),
        };
      },
    },
  };
  const module = { exports: {} as { ScopeWatcher: typeof ScopeWatcher } };
  const require = createRequire(import.meta.url);
  runInNewContext(code, {
    module,
    exports: module.exports,
    require: (id: string) => (id === 'vscode' ? api : require(id)),
    setTimeout,
    clearTimeout,
  });
  return {
    watcher: new module.exports.ScopeWatcher(onChange, delayMs),
    watchers,
    onChange,
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('来源目录文件监听', () => {
  it('合并多根来源的连续创建、修改、删除及重命名事件，路径去重', () => {
    const host = createHost();
    host.watcher.setScopes([
      { root: uri('/assets'), recursive: true },
      { root: uri('/second'), recursive: true },
    ]);
    host.watchers[0]!.create!(uri('/assets/hero.json'));
    host.watchers[0]!.change!(uri('/assets/hero.json'));
    vi.advanceTimersByTime(300);
    host.watchers[0]!.delete!(uri('/assets/old.atlas'));
    host.watchers[2]!.create!(uri('/second/new.atlas'));
    vi.advanceTimersByTime(399);
    expect(host.onChange).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(host.onChange).toHaveBeenCalledOnce();
    expect(host.onChange.mock.calls[0]![0].map((target: Uri) => target.path)).toEqual([
      '/assets/hero.json',
      '/assets/old.atlas',
      '/second/new.atlas',
    ]);
    host.watcher.dispose();
  });

  it('非递归骨骼扫描仍覆盖子目录图片和缺失依赖补齐，以及整个目录删除', () => {
    const host = createHost();
    host.watcher.setScopes([{ root: uri('/assets'), recursive: false }]);
    expect(host.watchers[0]!.pattern).toBe('**/*');
    host.watchers[0]!.change!(uri('/assets/textures/page.PNG'));
    host.watchers[0]!.create!(uri('/assets/textures/missing.png'));
    host.watchers[0]!.delete!(uri('/assets/textures.v2'));
    vi.advanceTimersByTime(400);
    expect(host.onChange.mock.calls[0]![0].map((target: Uri) => target.path)).toEqual([
      '/assets/textures/page.PNG',
      '/assets/textures/missing.png',
      '/assets/textures.v2',
    ]);
    host.watcher.dispose();
  });

  it('忽略依赖目录、无关文件修改、越界与其他 URI 来源', () => {
    const host = createHost();
    host.watcher.setScopes([{ root: uri('/assets'), recursive: true }]);
    const watcher = host.watchers[0]!;
    for (const path of [
      '.git',
      'node_modules',
      '.pnpm',
      '.cache',
      '.turbo',
      'dist',
      'build',
      'coverage',
      '.next',
      '.svn',
    ]) {
      watcher.create!(uri(`/assets/${path}/hero.json`));
      watcher.delete!(uri(`/assets/${path}`));
    }
    watcher.change!(uri('/assets/main.ts'));
    watcher.change!(uri('/elsewhere/hero.json'));
    watcher.change!(uri('/assets-other/hero.json'));
    watcher.change!(uri('/assets/hero.json', 'remote'));
    watcher.change!(uri('/assets/hero.json', 'file', 'other-host'));
    vi.advanceTimersByTime(500);
    expect(host.onChange).not.toHaveBeenCalled();
    host.watcher.dispose();
  });

  it('显式选择的排除目录仍可监听，重复根只创建一套监听', () => {
    const host = createHost();
    host.watcher.setScopes([
      { root: uri('/assets/node_modules'), recursive: true },
      { root: uri('/assets/node_modules'), recursive: false },
    ]);
    expect(host.watchers).toHaveLength(2);
    host.watchers[0]!.change!(uri('/assets/node_modules/hero.skel'));
    vi.advanceTimersByTime(400);
    expect(host.onChange).toHaveBeenCalledOnce();
    host.watcher.dispose();
  });

  it('切换范围取消旧批次和监听，晚到旧事件不能触发刷新', () => {
    const host = createHost();
    host.watcher.setScopes([{ root: uri('/old'), recursive: true }]);
    const old = host.watchers[0]!;
    old.change!(uri('/old/hero.json'));
    host.watcher.setScopes([{ root: uri('/new'), recursive: true }]);
    expect(old.dispose).toHaveBeenCalledOnce();
    old.delete!(uri('/old/hero.json'));
    host.watchers[2]!.create!(uri('/new/hero.json'));
    vi.advanceTimersByTime(400);
    expect(host.onChange).toHaveBeenCalledOnce();
    expect(host.onChange.mock.calls[0]![0].map((target: Uri) => target.path)).toEqual([
      '/new/hero.json',
    ]);
    host.watcher.dispose();
  });

  it('释放幂等，取消待发批次且不能重新启动', () => {
    const host = createHost(300);
    host.watcher.setScopes([{ root: uri('/assets'), recursive: true }]);
    const old = host.watchers[0]!;
    old.delete!(uri('/assets'));
    host.watcher.dispose();
    host.watcher.dispose();
    old.change!(uri('/assets/hero.json'));
    host.watcher.setScopes([{ root: uri('/new'), recursive: true }]);
    vi.advanceTimersByTime(1000);
    expect(old.dispose).toHaveBeenCalledOnce();
    expect(host.watchers).toHaveLength(2);
    expect(host.onChange).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('精确监听来源根删除和重建，忽略相邻目录，不监听文件系统根的父目录', () => {
    const host = createHost();
    host.watcher.setScopes([{ root: uri('/assets'), recursive: true }]);
    const parent = host.watchers[1]!;
    expect(parent.root.path).toBe('/');
    expect(parent.pattern).toBe('assets');
    parent.delete!(uri('/assets-other'));
    parent.delete!(uri('/assets'));
    parent.create!(uri('/assets'));
    vi.advanceTimersByTime(400);
    expect(host.onChange.mock.calls[0]![0].map((target: Uri) => target.path)).toEqual([
      '/assets',
    ]);
    host.watcher.setScopes([{ root: uri('/'), recursive: true }]);
    expect(host.watchers).toHaveLength(3);
    host.watcher.dispose();
  });
});
