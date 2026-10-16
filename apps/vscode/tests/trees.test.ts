import { beforeAll, describe, expect, it, vi } from 'vitest';
import { build } from 'esbuild';
import { runInNewContext } from 'node:vm';
import { posix } from 'node:path';
import type * as vscode from 'vscode';
import type { SpineResource } from '@spine-preview/core';
import type { IndexedGroup } from '../src/host/workspace-index.js';
import type { SpineTrees } from '../src/host/trees.js';
import { getLocalizedDiagnostic } from '../src/host/i18n.js';

let code: string;
beforeAll(async () => {
  const output = await build({
    entryPoints: ['src/host/trees.ts'],
    absWorkingDir: new URL('../', import.meta.url).pathname,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    external: ['vscode'],
    write: false,
  });
  code = output.outputFiles![0]!.text;
});

interface Node {
  id: string;
  children: Node[];
}
interface Item {
  id: string;
  label: string;
  iconPath: { id: string };
  tooltip?: string;
  command?: { command: string; arguments: unknown[] };
}
interface Provider {
  getChildren(node?: Node): Node[];
  getTreeItem(node: Node): Item;
  getParent?(node: Node): Node | undefined;
}

/** 原生树 API 替身直接观察节点、命令和 Disposable 生命周期。 */
function harness(language = 'en') {
  const commands = new Map<string, (arg: unknown) => void | Promise<void>>();
  const writeText = vi.fn(async (_text: string) => {});
  const views = new Map<
    string,
    {
      treeDataProvider: Provider;
      message: string;
      notify(visible: boolean): void;
      reveal: ReturnType<typeof vi.fn>;
      dispose: ReturnType<typeof vi.fn>;
    }
  >();
  const api = {
    env: { language, clipboard: { writeText } },
    Uri: {
      parse: uri,
      joinPath: (root: vscode.Uri, path: string) => ({
        path: posix.join(root.path, path),
        fsPath: posix.join(root.fsPath, path),
      }),
    },
    commands: {
      registerCommand: (
        name: string,
        callback: (arg: unknown) => void | Promise<void>,
      ) => {
        commands.set(name, callback);
        return { dispose: () => commands.delete(name) };
      },
    },
    EventEmitter: class {
      event = () => ({ dispose() {} });
      fire() {}
      dispose() {}
    },
    TreeItem: class {
      constructor(readonly label: string) {}
    },
    ThemeIcon: class {
      constructor(readonly id: string) {}
    },
    TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
    window: {
      createTreeView: (id: string, options: { treeDataProvider: Provider }) => {
        let notify = (_visible: boolean) => {};
        const view = {
          treeDataProvider: options.treeDataProvider,
          visible: false,
          message: '',
          onDidChangeVisibility: (callback: (event: { visible: boolean }) => void) => {
            notify = (visible) => callback({ visible });
            return { dispose: () => (notify = () => {}) };
          },
          notify: (visible: boolean) => notify(visible),
          reveal: vi.fn(async () => {}),
          dispose: vi.fn(),
        };
        views.set(id, view);
        return view;
      },
    },
  };
  const module = { exports: {} as { SpineTrees: typeof SpineTrees } };
  runInNewContext(code, { module, exports: module.exports, require: () => api });
  const selectResource = vi.fn();
  const selectAnimation = vi.fn();
  const onVisible = vi.fn();
  const trees = new module.exports.SpineTrees(
    { subscriptions: [] } as unknown as vscode.ExtensionContext,
    selectResource,
    selectAnimation,
    onVisible,
  );
  return {
    trees,
    commands,
    views,
    selectResource,
    selectAnimation,
    onVisible,
    writeText,
  };
}

function uri(value: string): vscode.Uri {
  const path = decodeURIComponent(new URL(value).pathname);
  return { path, fsPath: path } as vscode.Uri;
}

function group(): IndexedGroup {
  const skeleton = {
    id: 'file:///assets/characters/hero.json',
    path: 'characters/hero.json',
    size: 1,
  };
  const resource: SpineResource = {
    id: skeleton.id,
    name: skeleton.path,
    version: '4.2',
    exportVersion: '4.2.99',
    format: 'json',
    skeleton,
    atlas: {
      id: 'file:///assets/characters/hero.atlas',
      path: 'characters/hero.atlas',
      size: 1,
    },
    pages: [],
    animations: ['idle', 'walk'],
  };
  return {
    scope: {
      id: 'workspace',
      label: 'assets',
      recursive: true,
      root: uri('file:///assets'),
    },
    provider: {} as IndexedGroup['provider'],
    result: { resources: [resource], diagnostics: [] },
  };
}

function items(provider: Provider, nodes = provider.getChildren()): Item[] {
  return nodes.flatMap((node) => [
    provider.getTreeItem(node),
    ...items(provider, provider.getChildren(node)),
  ]);
}

/** 按实际相对路径构造资源，验证合并、分支和刷新后的父节点关系。 */
function nestedGroup(paths: readonly string[]): IndexedGroup {
  const sample = group();
  const template = sample.result.resources[0]!;
  sample.result.resources = paths.map((path) => ({
    ...template,
    id: `file:///assets/${path}`,
    name: path,
    skeleton: { ...template.skeleton, id: `file:///assets/${path}`, path },
  }));
  return sample;
}

describe('VS Code 原生资源与动画树', () => {
  it('复制范围、压缩目录与文件的名称和真实路径，相对路径基于各自扫描范围', async () => {
    const editor = harness();
    editor.trees.setGroups([nestedGroup(['aa/bb/cc/hero file.json'])]);
    const provider = editor.views.get('spinePreview.resources')!.treeDataProvider;
    const root = provider.getChildren()[0]!;
    const folder = root.children[0]!;
    const resource = folder.children[0]!;
    for (const [node, expected] of [
      [root, ['assets', '/assets', '.']],
      [folder, ['cc', '/assets/aa/bb/cc', 'aa/bb/cc']],
      [
        resource,
        ['hero file.json', '/assets/aa/bb/cc/hero file.json', 'aa/bb/cc/hero file.json'],
      ],
    ] as const) {
      for (const [index, action] of [
        'copyName',
        'copyPath',
        'copyRelativePath',
      ].entries()) {
        await editor.commands.get(`spinePreview.${action}`)!(node);
        expect(editor.writeText).toHaveBeenLastCalledWith(expected[index]);
      }
    }
  });

  it('多根范围复制路径各自隔离，诊断、伪造与刷新前的节点不触发复制', async () => {
    const editor = harness();
    const first = nestedGroup(['hero.json']);
    const second = nestedGroup(['hero.json']);
    second.scope = {
      ...second.scope,
      id: 'other',
      label: 'display label',
      root: uri('file:///other'),
    };
    second.result.resources = second.result.resources.map((resource) => ({
      ...resource,
      id: 'file:///other/hero.json',
      skeleton: { ...resource.skeleton, id: 'file:///other/hero.json' },
    }));
    first.result.diagnostics = [
      { code: 'ATLAS_MISSING', stage: 'dependency', message: 'missing' },
    ];
    editor.trees.setGroups([first, second]);
    const provider = editor.views.get('spinePreview.resources')!.treeDataProvider;
    const roots = provider.getChildren();
    const copy = editor.commands.get('spinePreview.copyPath')!;
    await copy(roots[0]!.children[0]);
    expect(editor.writeText).toHaveBeenLastCalledWith('/assets/hero.json');
    await copy(roots[1]!.children[0]);
    expect(editor.writeText).toHaveBeenLastCalledWith('/other/hero.json');
    await editor.commands.get('spinePreview.copyName')!(roots[1]);
    expect(editor.writeText).toHaveBeenLastCalledWith('other');
    editor.writeText.mockClear();
    await copy(roots[0]!.children[1]);
    await copy(roots[0]!.children[1]!.children[0]);
    await copy({ ...roots[0]!.children[0] });
    await copy(undefined);
    editor.trees.setGroups([first]);
    await copy(roots[0]!.children[0]);
    expect(editor.writeText).not.toHaveBeenCalled();
  });

  it('动画复制保留名称且不改变播放，切换资源后忽略旧条目', async () => {
    const editor = harness();
    editor.trees.setSelection('hero', ['idle', '行走 "loop"'], 'idle');
    const provider = editor.views.get('spinePreview.animations')!.treeDataProvider;
    const node = provider.getChildren()[1]!;
    const copy = editor.commands.get('spinePreview.copyAnimationName')!;
    const copyFromMenu = editor.commands.get('spinePreview.copyName')!;
    await copy(node);
    await copyFromMenu(node);
    expect(editor.writeText).toHaveBeenLastCalledWith('行走 "loop"');
    expect(editor.selectAnimation).not.toHaveBeenCalled();
    editor.trees.setSelection('other', ['行走 "loop"']);
    await copy(node);
    await copy({ name: '行走 "loop"' });
    await copyFromMenu(node);
    await copyFromMenu({ name: '行走 "loop"' });
    expect(editor.writeText).toHaveBeenCalledTimes(2);
  });

  it('合并单一路径链，保持真实资源身份、完整路径和可 reveal 的父链', () => {
    const editor = harness();
    editor.trees.setGroups([nestedGroup(['aa/bb/cc/hero.json'])]);
    const view = editor.views.get('spinePreview.resources')!;
    const provider = view.treeDataProvider;
    const entries = items(provider);
    expect(entries.map((item) => item.label)).toEqual([
      'assets',
      'aa/bb/cc',
      'hero.json',
    ]);
    expect(entries[1]!.tooltip).toBe('aa/bb/cc');
    const root = provider.getChildren()[0]!;
    const folder = root.children[0]!;
    const resource = folder.children[0]!;
    expect(provider.getParent!(folder)).toBe(root);
    expect(provider.getParent!(resource)).toBe(folder);
    editor.trees.setSelection('file:///assets/aa/bb/cc/hero.json', ['idle']);
    expect(view.reveal).toHaveBeenCalledWith(resource, { select: true, focus: false });
    const command = provider.getTreeItem(resource).command!;
    editor.commands.get(command.command)!(command.arguments[0]);
    expect(editor.selectResource).toHaveBeenCalledWith(
      'file:///assets/aa/bb/cc/hero.json',
    );
    editor.trees.setGroups([nestedGroup(['aa/bb/cc/hero.json'])]);
    expect(items(provider).map((item) => item.id)).toEqual(
      entries.map((item) => item.id),
    );
  });

  it('在分支和直接资源处停止合并，新增或删除分支后重建正确父链', () => {
    const editor = harness();
    const provider = editor.views.get('spinePreview.resources')!.treeDataProvider;
    editor.trees.setGroups([
      nestedGroup([
        'aa/bb/pc/hero.json',
        'aa/bb/mobile/hero.json',
        'aa/bb/mobile/effects/spark.json',
      ]),
    ]);
    expect(items(provider).map((item) => item.label)).toEqual([
      'assets',
      'aa/bb',
      'mobile',
      'effects',
      'spark.json',
      'hero.json',
      'pc',
      'hero.json',
    ]);
    const branchId = items(provider).find((item) => item.label === 'mobile')!.id;
    editor.trees.setGroups([nestedGroup(['aa/bb/mobile/hero.json'])]);
    expect(items(provider).map((item) => item.label)).toEqual([
      'assets',
      'aa/bb/mobile',
      'hero.json',
    ]);
    expect(items(provider)[1]!.id).toBe(branchId);
    const root = provider.getChildren()[0]!;
    expect(provider.getParent!(root.children[0]!.children[0]!)).toBe(root.children[0]);
  });

  it('诊断提示包括本地化原因、文件路径与错误码', () => {
    const editor = harness('en');
    const sample = group();
    sample.result.diagnostics = [
      {
        code: 'ATLAS_MISSING',
        stage: 'dependency',
        path: 'characters/hero.atlas',
        message: '缺少图集',
      },
    ];
    editor.trees.setGroups([sample]);
    const entries = items(editor.views.get('spinePreview.resources')!.treeDataProvider);
    const diagnostic = entries.find((item) => item.label === 'hero.atlas')!;
    expect(diagnostic.tooltip).toBe(
      'characters/hero.atlas\nThe matching atlas is missing.\nATLAS_MISSING',
    );
  });

  it('扫描失败保留技术原因，未登记诊断保留原始说明', () => {
    expect(
      getLocalizedDiagnostic('en', {
        code: 'SCAN_FAILED',
        stage: 'discovery',
        path: 'file:///assets',
        message: '无法扫描「assets」：EACCES: permission denied, /assets',
      }),
    ).toBe(
      'file:///assets\nScan failed: EACCES: permission denied, /assets\nSCAN_FAILED',
    );
    expect(
      getLocalizedDiagnostic('zh-cn', {
        code: 'PAGE_MISSING',
        stage: 'dependency',
        path: 'page.png',
        message: 'missing',
      }),
    ).toContain('缺少 atlas 引用的页图片。');
    expect(
      getLocalizedDiagnostic('en', {
        code: '__proto__',
        stage: 'load',
        message: 'Custom runtime error',
      }),
    ).toBe('Custom runtime error\n__proto__');
  });

  it('保留范围和相对目录分组，以及跨刷新稳定节点 ID', () => {
    const editor = harness();
    editor.trees.setGroups([group()]);
    const provider = editor.views.get('spinePreview.resources')!.treeDataProvider;
    const first = items(provider);
    expect(first.map((item) => item.label)).toEqual([
      'assets',
      'characters',
      'hero.json',
    ]);
    editor.trees.setGroups([group()]);
    expect(items(provider).map((item) => item.id)).toEqual(first.map((item) => item.id));
    const roots = provider.getChildren();
    expect(provider.getParent!(roots[0]!.children[0]!)).toBe(roots[0]);
    const resource = first[2]!;
    editor.commands.get(resource.command!.command)!(resource.command!.arguments[0]);
    expect(editor.selectResource).toHaveBeenCalledWith(
      'file:///assets/characters/hero.json',
    );
    editor.trees.setGroups([]);
    editor.commands.get(resource.command!.command)!(resource.command!.arguments[0]);
    expect(editor.selectResource).toHaveBeenCalledTimes(1);
  });

  it('仅播放当前资源的实际动画，二进制解析结果可更新并显示选中动画', () => {
    const editor = harness();
    const view = editor.views.get('spinePreview.animations')!;
    editor.trees.setSelection('hero', ['idle', 'idle', 'walk'], 'walk');
    const animations = items(view.treeDataProvider);
    expect(animations.map((item) => item.label)).toEqual(['idle', 'walk']);
    expect(animations[1]!.iconPath.id).toBe('debug-start');
    editor.commands.get('spinePreview.selectAnimation')!('walk');
    expect(editor.selectAnimation).toHaveBeenCalledWith('walk');
    editor.trees.setSelection('other', ['run']);
    editor.commands.get('spinePreview.selectAnimation')!('walk');
    editor.commands.get('spinePreview.selectAnimation')!({ name: 'run' });
    expect(editor.selectAnimation).toHaveBeenCalledTimes(1);
    expect(view.message).toBe('');
  });

  it('跟随 VS Code 语言，扫描清除旧提示，关闭后移除可见通知与命令', () => {
    const editor = harness('zh-cn');
    const view = editor.views.get('spinePreview.resources')!;
    expect(view.message).toContain('未找到');
    editor.trees.setLoading(true);
    expect(view.message).toBe('正在扫描资源…');
    editor.trees.setGroups([group()]);
    editor.trees.setLoading(false);
    expect(view.message).toBe('');
    view.notify(true);
    view.notify(false);
    expect(editor.onVisible).toHaveBeenCalledTimes(1);
    editor.trees.dispose();
    editor.trees.dispose();
    view.notify(true);
    expect(editor.onVisible).toHaveBeenCalledTimes(1);
    expect(view.dispose).toHaveBeenCalledTimes(1);
    expect(editor.commands.size).toBe(0);
  });
});
