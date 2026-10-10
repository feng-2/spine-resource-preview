import { posix } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { Uri } from 'vscode';
import { WorkspaceIndex, type IndexScope } from '../src/host/workspace-index.js';
import {
  isUriInScanScope,
  scanProvider,
  type ScannerServices,
} from '../src/host/scanner.js';

/** 最小 URI 替身保留 scheme 与完整路径身份。 */
function uri(path: string): Uri {
  return {
    scheme: 'file',
    authority: '',
    path,
    toString: () => `file://${path}`,
    with: (change: { path?: string }) => uri(change.path ?? path),
  } as unknown as Uri;
}

const skeleton = JSON.stringify({
  skeleton: { spine: '4.2.01' },
  bones: [{ name: 'root' }],
  animations: { idle: {}, walk: {} },
});
const atlas = 'textures/page.png\nsize: 1,1\nformat: RGBA8888\n';

/** 可增删资源的内存文件系统，模拟文件监听后的索引重建。 */
function filesystem(initial: readonly (readonly [string, string])[]) {
  const files = new Map(initial);
  const readFile = vi.fn(async (target: Uri) => {
    const value = files.get(target.path);
    if (value === undefined)
      throw Object.assign(new Error('文件不存在'), { code: 'FileNotFound' });
    return new TextEncoder().encode(value);
  });
  const stat = vi.fn(async (target: Uri) => {
    const value = files.get(target.path);
    if (value === undefined)
      throw Object.assign(new Error('文件不存在'), { code: 'FileNotFound' });
    return { type: 1, size: value.length };
  });
  const services: ScannerServices = {
    readFile,
    stat,
    imageUri: (target) => target.toString(),
    readDirectory: async (target) => {
      const children = new Map<string, number>();
      for (const path of files.keys()) {
        const relative = posix.relative(target.path, path);
        if (!relative || relative.startsWith('../')) continue;
        const segments = relative.split('/');
        children.set(segments[0]!, segments.length > 1 ? 2 : 1);
      }
      return [...children];
    },
  };
  return { files, services, readFile, stat };
}

function scope(path: string, recursive = true): IndexScope {
  return {
    id: `file://${path}`,
    label: posix.basename(path),
    root: uri(path),
    recursive,
  };
}

describe('工作区多根资源索引', () => {
  it('隔离不同工作区根的同名依赖，稳定 URI 身份且不读取图片内容', async () => {
    const { services, readFile } = filesystem([
      ['/one/hero.json', skeleton],
      ['/one/hero.atlas', atlas],
      ['/one/textures/page.png', 'one image'],
      ['/two/hero.json', skeleton],
      ['/two/hero.atlas', atlas],
      ['/two/textures/page.png', 'two image'],
    ]);
    const index = new WorkspaceIndex(services);
    const groups = await index.scan([scope('/one'), scope('/two')]);
    expect(groups.map((group) => group.scope.label)).toEqual(['one', 'two']);
    expect(groups.map((group) => group.result.resources[0]?.id)).toEqual([
      'file:///one/hero.json',
      'file:///two/hero.json',
    ]);
    expect(groups.map((group) => group.result.resources[0]?.pages[0]?.file.id)).toEqual([
      'file:///one/textures/page.png',
      'file:///two/textures/page.png',
    ]);
    expect(groups[0]?.provider.get('file:///two/hero.json')).toBeUndefined();
    expect(groups[0]?.result.resources[0]?.animations).toEqual(['idle', 'walk']);
    expect(readFile.mock.calls.every(([file]) => !file.path.endsWith('.png'))).toBe(true);
    const refreshed = await index.scan([scope('/one')]);
    expect(refreshed[0]?.result.resources[0]?.id).toBe(
      groups[0]?.result.resources[0]?.id,
    );
  });

  it('缺少 atlas 与图片的资源保留诊断，依赖补齐后自动可用，删除后再次不可用', async () => {
    const { services, files } = filesystem([['/assets/hero.json', skeleton]]);
    const index = new WorkspaceIndex(services);
    const scopes = [scope('/assets')];
    let groups = await index.scan(scopes);
    expect(groups[0]?.result.resources).toEqual([]);
    expect(groups[0]?.result.diagnostics).toMatchObject([{ code: 'ATLAS_MISSING' }]);
    files.set('/assets/hero.atlas', atlas);
    groups = await index.scan(scopes);
    expect(groups[0]?.result.resources).toEqual([]);
    expect(groups[0]?.result.diagnostics).toMatchObject([{ code: 'PAGE_MISSING' }]);
    files.set('/assets/textures/page.png', 'image');
    groups = await index.scan(scopes);
    expect(groups[0]?.result.resources).toHaveLength(1);
    expect(groups[0]?.result.diagnostics).toEqual([]);
    files.delete('/assets/textures/page.png');
    groups = await index.scan(scopes);
    expect(groups[0]?.result.resources).toEqual([]);
    expect(groups[0]?.result.diagnostics).toMatchObject([{ code: 'PAGE_MISSING' }]);
  });

  it('文件入口仅发现同级骨骼并选择唯一关联资源，仍解析子目录图片', async () => {
    const { services } = filesystem([
      ['/assets/hero.json', skeleton],
      ['/assets/hero.atlas', atlas],
      ['/assets/textures/page.png', 'image'],
      ['/assets/child/hero.json', skeleton],
      ['/assets/child/hero.atlas', atlas],
      ['/assets/child/textures/page.png', 'child image'],
    ]);
    const groups = await new WorkspaceIndex(services).scan([
      { ...scope('/assets', false), preferredFileId: 'file:///assets/hero.atlas' },
    ]);
    expect(groups[0]?.result.resources).toHaveLength(1);
    expect(groups[0]?.result.preferredResourceId).toBe('file:///assets/hero.json');
    expect(groups[0]?.provider.get('file:///assets/textures/page.png')).toBeDefined();
    expect(groups[0]?.provider.get('file:///assets/child/hero.json')).toBeUndefined();
  });

  it('混合入口保留明确子目录文件资源，不被二次非递归过滤', async () => {
    const { services } = filesystem([
      ['/assets/child/hero.json', skeleton],
      ['/assets/child/hero.atlas', atlas],
      ['/assets/child/textures/page.png', 'image'],
      ['/assets/child/nested/other.json', skeleton],
    ]);
    const groups = await new WorkspaceIndex(services).scan([
      { ...scope('/assets', false), directories: [uri('/assets/child')] },
    ]);
    expect(groups[0]?.result.resources[0]?.name).toBe('child/hero');
    expect(groups[0]?.result.diagnostics).toEqual([]);
  });

  it('扫描取消时不继续后续工作区，也不把部分结果返回', async () => {
    const { services } = filesystem([['/one/hero.json', skeleton]]);
    const controller = new AbortController();
    services.readFile = async () => {
      controller.abort();
      return new TextEncoder().encode(skeleton);
    };
    const directories = vi.spyOn(services, 'readDirectory');
    await expect(
      new WorkspaceIndex(services).scan(
        [scope('/one'), scope('/two')],
        controller.signal,
      ),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(directories).toHaveBeenCalledTimes(1);
  });

  it('根目录删除或读取失败仅清空该范围，其他根仍可用并保留重试身份', async () => {
    const { services } = filesystem([
      ['/healthy/hero.json', skeleton],
      ['/healthy/hero.atlas', atlas],
      ['/healthy/textures/page.png', 'image'],
    ]);
    const readDirectory = services.readDirectory;
    services.readDirectory = async (target) => {
      if (target.path === '/deleted')
        throw Object.assign(new Error('目录已删除'), { code: 'FileNotFound' });
      if (target.path === '/forbidden')
        throw Object.assign(new Error('访问被拒绝'), { code: 'NoPermissions' });
      return readDirectory(target);
    };
    const groups = await new WorkspaceIndex(services).scan([
      scope('/deleted'),
      scope('/healthy'),
      scope('/forbidden'),
    ]);
    expect(groups.map((group) => group.scope.id)).toEqual([
      'file:///deleted',
      'file:///healthy',
      'file:///forbidden',
    ]);
    for (const group of [groups[0]!, groups[2]!]) {
      expect(group.result.resources).toEqual([]);
      expect(group.result.diagnostics).toMatchObject([{ code: 'SCAN_FAILED' }]);
      expect(group.provider.allFiles()).toEqual([]);
      expect(group.provider.get('file:///healthy/hero.json')).toBeUndefined();
      expect(await group.provider.resolve!('hero.json')).toBeUndefined();
      await expect(
        group.provider.readText({ id: 'old', path: 'hero.json', size: 0 }),
      ).rejects.toThrow('当前来源不可用');
    }
    expect(groups[0]?.result.diagnostics[0]?.message).toContain('目录已删除');
    expect(groups[2]?.result.diagnostics[0]?.message).toContain('访问被拒绝');
    expect(groups[1]?.result.resources).toHaveLength(1);
  });
});

describe('工作区扫描范围及性能过滤', () => {
  it('无关文件不 stat；大型排除目录不遍历，明确导入排除目录仍然可用', async () => {
    const { services, stat } = filesystem([
      ['/assets/main.ts', 'code'],
      ['/assets/readme.md', 'docs'],
      ['/assets/hero.json', skeleton],
      ['/assets/coverage/hero.json', skeleton],
      ['/assets/.next/hero.json', skeleton],
    ]);
    const provider = await scanProvider(services, scope('/assets'));
    expect(provider.files.map((file) => file.path)).toEqual(['hero.json']);
    expect(stat.mock.calls.map(([file]) => file.path)).toEqual(['/assets/hero.json']);
    const explicit = await scanProvider(services, scope('/assets/coverage'));
    expect(explicit.files.map((file) => file.path)).toEqual(['hero.json']);
  });

  it('范围判断尊重 URI 目录边界、非递归入口以及默认排除规则', () => {
    expect(isUriInScanScope(uri('/assets/hero.json'), scope('/assets', false))).toBe(
      true,
    );
    expect(
      isUriInScanScope(uri('/assets/child/hero.json'), scope('/assets', false)),
    ).toBe(false);
    expect(isUriInScanScope(uri('/assets-other/hero.json'), scope('/assets'))).toBe(
      false,
    );
    expect(
      isUriInScanScope(uri('/assets/node_modules/hero.json'), scope('/assets')),
    ).toBe(false);
    expect(
      isUriInScanScope(
        uri('/assets/node_modules/hero.json'),
        scope('/assets/node_modules'),
      ),
    ).toBe(true);
    expect(
      isUriInScanScope(uri('/assets/child/hero.json'), {
        ...scope('/assets', false),
        directories: [uri('/assets/child')],
      }),
    ).toBe(true);
  });

  it('枚举后消失的文件和子目录不影响其他资源', async () => {
    const { services } = filesystem([
      ['/assets/hero.json', skeleton],
      ['/assets/hero.atlas', atlas],
      ['/assets/textures/page.png', 'image'],
      ['/assets/vanished.json', skeleton],
      ['/assets/vanished-directory/other.json', skeleton],
    ]);
    const stat = services.stat;
    services.stat = async (target) => {
      if (target.path === '/assets/vanished.json')
        throw Object.assign(new Error('枚举后文件已删除'), { code: 'FileNotFound' });
      return stat(target);
    };
    const readDirectory = services.readDirectory;
    services.readDirectory = async (target) => {
      if (target.path === '/assets/vanished-directory')
        throw Object.assign(new Error('枚举后目录已删除'), { code: 'FileNotFound' });
      return readDirectory(target);
    };
    const [group] = await new WorkspaceIndex(services).scan([scope('/assets')]);
    expect(group?.result.resources).toHaveLength(1);
    expect(group?.result.diagnostics).toEqual([]);
    expect(group?.provider.get('file:///assets/vanished.json')).toBeUndefined();
    expect(
      group?.provider.get('file:///assets/vanished-directory/other.json'),
    ).toBeUndefined();
  });
});
