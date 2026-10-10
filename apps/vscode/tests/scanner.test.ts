import { describe, expect, it, vi } from 'vitest';
import type { Uri } from 'vscode';
import { scanProvider } from '../src/host/scanner.js';
import type { ScannerServices } from '../src/host/scanner.js';
import { handleRead, parseWebviewMessage } from '../src/host/bridge.js';

/** URI 替身只实现扫描器使用的不可变路径能力。 */
function uri(path: string): Uri {
  return {
    scheme: 'file',
    authority: '',
    path,
    toString: () => `file://${path}`,
    with: (change: { path?: string }) => uri(change.path ?? path),
  } as unknown as Uri;
}

/** 内存编辑器文件系统记录读取，证明发现阶段没有加载图片字节。 */
function filesystem() {
  const files = new Map([
    ['/assets/hero.json', '{"skeleton":{"spine":"4.2.01"}}'],
    ['/assets/hero.atlas', 'textures/page.png'],
    ['/assets/textures/page.png', 'image bytes'],
    ['/assets/child/other.json', '{}'],
    ['/assets/node_modules/unwanted.json', '{}'],
  ]);
  const directories = new Map<string, [string, number][]>([
    [
      '/assets',
      [
        ['hero.json', 1],
        ['hero.atlas', 1],
        ['textures', 2],
        ['child', 2],
        ['node_modules', 2],
      ],
    ],
    ['/assets/textures', [['page.png', 1]]],
    ['/assets/child', [['other.json', 1]]],
    ['/assets/node_modules', [['unwanted.json', 1]]],
  ]);
  const readFile = vi.fn(async (target: Uri) =>
    new TextEncoder().encode(files.get(target.path)!),
  );
  const services: ScannerServices = {
    readFile,
    readDirectory: async (target) => directories.get(target.path) ?? [],
    stat: async (target) => {
      if (files.has(target.path))
        return { type: 1, size: files.get(target.path)!.length };
      throw Object.assign(new Error('不存在'), { code: 'FileNotFound' });
    },
    imageUri: (target) => `https://local.invalid${target.path}`,
  };
  return { services, readFile };
}

describe('编辑器 URI 扫描和授权读取', () => {
  it('文件入口只列同级骨骼，仍按路径读取子目录页面依赖', async () => {
    const { services, readFile } = filesystem();
    const provider = await scanProvider(services, {
      root: uri('/assets'),
      recursive: false,
    });
    expect(provider.files.map((file) => file.path)).toEqual(['hero.json', 'hero.atlas']);
    expect(readFile).not.toHaveBeenCalled();
    const page = await provider.resolve!('textures/page.png');
    expect(page?.path).toBe('textures/page.png');
    expect(provider.files).toHaveLength(2);
    expect(provider.allFiles()).toHaveLength(3);
    expect((await provider.imageUrl(page!)).url).toBe(
      'https://local.invalid/assets/textures/page.png',
    );
    expect(readFile).not.toHaveBeenCalled();
    expect(await provider.resolve!('../private.json')).toBeUndefined();
    expect(await provider.resolve!('textures/missing.png')).toBeUndefined();
  });

  it('目录入口递归但排除依赖目录，显式选择被排除目录仍可扫描', async () => {
    const { services } = filesystem();
    const provider = await scanProvider(services, {
      root: uri('/assets'),
      recursive: true,
    });
    expect(provider.files.map((file) => file.path)).toEqual([
      'hero.json',
      'hero.atlas',
      'textures/page.png',
      'child/other.json',
    ]);
    const explicit = await scanProvider(services, {
      root: uri('/assets/node_modules'),
      recursive: true,
    });
    expect(explicit.files.map((file) => file.path)).toEqual(['unwanted.json']);
  });

  it('取消晚到枚举，不继续读取 stat 或登记旧来源', async () => {
    const { services } = filesystem();
    const controller = new AbortController();
    services.readDirectory = async () => {
      controller.abort();
      return [['hero.json', 1]];
    };
    const stat = vi.spyOn(services, 'stat');
    await expect(
      scanProvider(services, {
        root: uri('/assets'),
        recursive: true,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(stat).not.toHaveBeenCalled();
  });

  it('混合拖入文件与文件夹，仅在显式文件夹根内递归且不重复枚举', async () => {
    const { services } = filesystem();
    const provider = await scanProvider(services, {
      root: uri('/assets'),
      recursive: false,
      directories: [uri('/assets'), uri('/assets/child'), uri('/assets')],
      recursiveDirectories: [uri('/assets/child')],
    });
    expect(provider.files.map((file) => file.path)).toEqual([
      'hero.json',
      'hero.atlas',
      'child/other.json',
    ]);
  });

  it('桥只读取当前代际已授权的 JSON/atlas/skel，拒绝任意 URI 和图片传输', async () => {
    const { services, readFile } = filesystem();
    const provider = await scanProvider(services, {
      root: uri('/assets'),
      recursive: false,
    });
    const skeleton = provider.files[0]!;
    expect(
      await handleRead(
        { type: 'read', requestId: '2:1', fileId: skeleton.id, format: 'text' },
        provider,
        2,
      ),
    ).toMatchObject({ text: expect.stringContaining('4.2.01') });
    expect(
      await handleRead(
        { type: 'read', requestId: '1:2', fileId: skeleton.id, format: 'bytes' },
        provider,
        2,
      ),
    ).toMatchObject({ error: expect.stringContaining('过期') });
    expect(
      await handleRead(
        {
          type: 'read',
          requestId: '2:3',
          fileId: 'file:///private/secret.json',
          format: 'text',
        },
        provider,
        2,
      ),
    ).toMatchObject({ error: expect.stringContaining('不属于') });
    const image = await provider.resolve!('textures/page.png');
    expect(
      await handleRead(
        { type: 'read', requestId: '2:4', fileId: image!.id, format: 'bytes' },
        provider,
        2,
      ),
    ).toMatchObject({ error: expect.stringContaining('图片') });
    expect(readFile).toHaveBeenCalledTimes(1);
  });

  it('拒绝格式错误或无边界消息，接受标准 URI 拖入', () => {
    expect(
      parseWebviewMessage({ type: 'read', requestId: 1, fileId: 'x', format: 'text' }),
    ).toBeUndefined();
    expect(
      parseWebviewMessage({
        type: 'read',
        requestId: '1:1',
        fileId: 'x',
        format: 'image',
      }),
    ).toBeUndefined();
    expect(parseWebviewMessage({ type: 'drop', uris: [123] })).toBeUndefined();
    expect(
      parseWebviewMessage({ type: 'drop', uris: Array(129).fill('file:///x') }),
    ).toBeUndefined();
    expect(parseWebviewMessage({ type: 'drop', uris: ['file:///assets'] })).toEqual({
      type: 'drop',
      uris: ['file:///assets'],
    });
  });
});
