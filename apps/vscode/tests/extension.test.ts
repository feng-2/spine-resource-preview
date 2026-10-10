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

/** 不可变 URI 替身，与编辑器的 path/scheme/authority 规则一致。 */
function uri(path: string) {
  return {
    scheme: 'file',
    authority: '',
    path,
    toString: () => `file://${path}`,
    with: (change: { path?: string }) => uri(change.path ?? path),
  };
}

/** 在受控 VS Code API 下执行真实命令、Webview ready 和扫描取消流程。 */
function editor(language = 'en') {
  const skeleton = JSON.stringify({
    skeleton: { spine: '4.2.99' },
    bones: [{ name: 'root' }],
    animations: { idle: {} },
  });
  const files = new Map([
    ['/assets/hero.json', skeleton],
    ['/assets/hero.atlas', 'page.png\nsize: 1,1\nfilter: Linear,Linear\n'],
    ['/assets/page.png', 'page'],
    ['/assets/child/other.json', skeleton],
  ]);
  const sent: HostMessage[] = [];
  let command: ((...args: unknown[]) => Promise<void>) | undefined;
  let receive: ((value: unknown) => void) | undefined;
  let closed: (() => void) | undefined;
  let cancel: (() => void) | undefined;
  const disposable = () => ({ dispose: vi.fn() });
  const api = {
    env: { language },
    FileType: { File: 1, Directory: 2 },
    ViewColumn: { Active: 1 },
    ProgressLocation: { Notification: 15 },
    Uri: {
      joinPath: (root: ReturnType<typeof uri>, path: string) =>
        uri(`${root.path}/${path}`),
      parse: (value: string) => uri(new URL(value).pathname),
    },
    commands: {
      registerCommand: (_id: string, callback: typeof command) => {
        command = callback;
        return disposable();
      },
    },
    workspace: {
      fs: {
        stat: vi.fn(async (target: ReturnType<typeof uri>) => ({
          type: files.has(target.path) ? 1 : 2,
          size: files.get(target.path)?.length ?? 0,
        })),
        readDirectory: vi.fn(async () => [
          ['hero.json', 1],
          ['hero.atlas', 1],
          ['page.png', 1],
          ['child', 2],
        ]),
        readFile: vi.fn(async (target: ReturnType<typeof uri>) =>
          new TextEncoder().encode(files.get(target.path)!),
        ),
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
      createWebviewPanel: () => ({
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
          asWebviewUri: (target: ReturnType<typeof uri>) => ({
            toString: () => `https://webview.invalid${target.path}`,
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
      }),
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
  });
  module.exports.activate({ extensionUri: uri('/extension'), subscriptions: [] });
  return {
    api,
    sent,
    command: (...args: unknown[]) => command!(...args),
    receive: (message: unknown) => receive!(message),
    cancel: () => cancel?.(),
    close: () => closed?.(),
  };
}

describe('实际扩展宿主入口集成', () => {
  it('简体中文 VS Code 使用中文原生扫描状态，命令与索引身份保持稳定', async () => {
    const host = editor('zh-cn');
    await host.command(uri('/assets/hero.json'));
    expect(host.sent[0]).toMatchObject({
      type: 'status',
      loading: true,
      message: '正在扫描 /assets/hero.json…',
    });
    expect(host.sent.at(-1)).toMatchObject({
      type: 'snapshot',
      result: { preferredResourceId: 'file:///assets/hero.json' },
    });
    host.close();
  });
  it('文件命令发送同级索引并优先所选骨骼，ready 回放完成快照', async () => {
    const host = editor();
    await host.command(uri('/assets/hero.json'));
    const snapshot = host.sent.find((message) => message.type === 'snapshot');
    expect(snapshot).toMatchObject({
      type: 'snapshot',
      result: { preferredResourceId: 'file:///assets/hero.json' },
    });
    if (snapshot?.type !== 'snapshot') throw new Error('未收到索引');
    expect(snapshot.result.resources.map((resource) => resource.id)).toEqual([
      'file:///assets/hero.json',
    ]);
    expect(
      host.api.workspace.fs.readFile.mock.calls.map(([file]) => file.path),
    ).not.toContain('/assets/page.png');
    host.receive({ type: 'ready' });
    await vi.waitFor(() => expect(host.sent.at(-1)).toEqual(snapshot));
    host.close();
  });

  it('取消晚到目录扫描后 ready 重放可刷新的空状态，而非永久 loading', async () => {
    const host = editor();
    let release: ((entries: [string, number][]) => void) | undefined;
    host.api.workspace.fs.readDirectory.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const opening = host.command(uri('/assets/hero.json'));
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    host.cancel();
    release!([['hero.json', 1]]);
    await opening;
    expect(host.sent.at(-1)).toMatchObject({
      type: 'status',
      loading: false,
      message: expect.stringContaining('cancelled'),
    });
    host.receive({ type: 'ready' });
    await vi.waitFor(() =>
      expect(host.sent.at(-1)).toMatchObject({
        type: 'status',
        loading: false,
        message: expect.stringContaining('cancelled'),
      }),
    );
    host.receive({ type: 'refresh' });
    await vi.waitFor(() => expect(host.sent.at(-1)?.type).toBe('snapshot'));
    host.close();
  });

  it('旧 target stat 晚到不会覆盖最后一次命令来源', async () => {
    const host = editor();
    let release: ((value: { type: number; size: number }) => void) | undefined;
    host.api.workspace.fs.stat.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const previous = host.command(uri('/assets/old.json'));
    await host.command(uri('/assets/hero.json'));
    release!({ type: 1, size: 2 });
    await previous;
    expect(host.sent.filter((message) => message.type === 'snapshot')).toHaveLength(1);
    expect(host.sent.at(-1)).toMatchObject({
      type: 'snapshot',
      label: '/assets/hero.json',
    });
    host.close();
  });
});
