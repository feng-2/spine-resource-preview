import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import {
  createMemoryProvider,
  discoverResources,
  type MemoryResourceInput,
} from '../src/index.js';

function json(path: string, version = '3.8.99'): MemoryResourceInput {
  return {
    path,
    text: JSON.stringify({
      skeleton: { spine: version },
      bones: [{ name: 'root' }],
      animations: { idle: {}, walk: {} },
    }),
  };
}

function atlas(path: string, pages: readonly string[]): MemoryResourceInput {
  return {
    path,
    text: pages
      .map(
        (page) =>
          `${page}\nsize: 64,64\nfilter: Linear,Linear\npma: true\nregion\n  xy: 0,0\n  size: 2,2\n`,
      )
      .join('\n'),
  };
}

function group(directory = '', version = '3.8.99'): MemoryResourceInput[] {
  const prefix = directory ? `${directory}/` : '';
  return [
    json(`${prefix}hero.json`, version),
    atlas(`${prefix}hero.atlas`, ['page.png']),
    { path: `${prefix}page.png` },
  ];
}

describe('跨宿主资源发现索引', () => {
  it('混合版本与多套同名目录保持稳定身份，不预加载图片', async () => {
    const provider = createMemoryProvider([
      ...group('a', '3.7.90'),
      ...group('b', '4.3.75-beta'),
      { path: 'config.json', text: '{"layout":{}}' },
    ]);
    const imageAccess = vi.spyOn(provider, 'imageUrl');
    const readBytes = vi.spyOn(provider, 'readBytes');
    const result = await discoverResources(provider);
    expect(result.resources.map((resource) => resource.id)).toEqual([
      'a/hero.json',
      'b/hero.json',
    ]);
    expect(result.resources.map((resource) => resource.version)).toEqual(['3.7', '4.3']);
    expect(result.resources[1]?.exportVersion).toBe('4.3.75-beta');
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'VERSION_PRERELEASE',
    ]);
    expect(result.resources[0]?.pages[0]?.file.path).toBe('a/page.png');
    expect(result.resources[1]?.pages[0]?.file.path).toBe('b/page.png');
    expect(imageAccess).not.toHaveBeenCalled();
    expect(readBytes).not.toHaveBeenCalled();
  });

  it('多页 atlas 按目录定位并保留 PMA，非递归扫描可 resolve 子目录依赖', async () => {
    const inputs = [
      json('hero.json'),
      atlas('hero.atlas', ['images/first.png', 'images/second.png']),
      { path: 'images/first.png' },
      { path: 'images/second.png' },
      ...group('images/hidden'),
    ];
    const provider = createMemoryProvider(inputs, {
      listedPaths: ['hero.json', 'hero.atlas'],
    });
    const resolve = vi.spyOn(provider, 'resolve');
    const result = await discoverResources(provider, { recursive: false });
    expect(result.diagnostics).toEqual([]);
    expect(result.resources).toHaveLength(1);
    expect(
      result.resources[0]?.pages.map((page) => ({
        name: page.name,
        path: page.file.path,
        pma: page.pma,
      })),
    ).toEqual([
      { name: 'images/first.png', path: 'images/first.png', pma: true },
      { name: 'images/second.png', path: 'images/second.png', pma: true },
    ]);
    expect(resolve).toHaveBeenCalledWith('images/first.png', undefined);
  });

  it('非递归限制骨骼发现，不限制 atlas 引用的子目录页', async () => {
    const provider = createMemoryProvider([
      json('pack/hero.json'),
      atlas('pack/hero.atlas', ['images/page.png']),
      { path: 'pack/images/page.png' },
      ...group('pack/sub'),
    ]);
    const direct = await discoverResources(provider, {
      rootPath: 'pack',
      recursive: false,
    });
    const recursive = await discoverResources(provider, { rootPath: 'pack' });
    expect(direct.resources.map((entry) => entry.id)).toEqual(['pack/hero.json']);
    expect(recursive.resources.map((entry) => entry.id)).toEqual([
      'pack/hero.json',
      'pack/sub/hero.json',
    ]);
  });

  it('目录缺页不能借用其他目录的唯一同名图片，即使调用方误开启回退', async () => {
    const provider = createMemoryProvider([
      json('a/hero.json'),
      atlas('a/hero.atlas', ['page.png']),
      { path: 'b/page.png' },
    ]);
    const result = await discoverResources(provider, { allowBasenameFallback: true });
    expect(result.resources).toEqual([]);
    expect(result.diagnostics[0]).toMatchObject({
      code: 'PAGE_MISSING',
      path: 'a/page.png',
    });
  });

  it('本目录唯一不同名 atlas 优先于其他目录同名 atlas，本目录缺失则报错', async () => {
    const inputs = [
      json('a/hero.json'),
      atlas('a/export.atlas', ['page.png']),
      { path: 'a/page.png' },
      atlas('b/hero.atlas', ['wrong.png']),
      { path: 'b/wrong.png' },
    ];
    const found = await discoverResources(createMemoryProvider(inputs));
    expect(found.resources[0]?.atlas.path).toBe('a/export.atlas');
    const missing = await discoverResources(
      createMemoryProvider(inputs.filter((file) => file.path !== 'a/export.atlas')),
    );
    expect(missing.resources).toEqual([]);
    expect(missing.diagnostics[0]?.code).toBe('ATLAS_MISSING');
  });

  it('扁平多选支持唯一页名回退，重复同名页明确拒绝', async () => {
    const inputs = [
      json('hero.json'),
      atlas('hero.atlas', ['images/page.png']),
      { path: 'page.png' },
    ];
    expect(
      (
        await discoverResources(createMemoryProvider(inputs), {
          allowBasenameFallback: true,
        })
      ).resources,
    ).toHaveLength(1);
    const duplicate = await discoverResources(
      createMemoryProvider([...inputs, { path: 'page.png', id: 'different-file' }]),
      { allowBasenameFallback: true },
    );
    expect(duplicate.resources).toEqual([]);
    expect(duplicate.diagnostics[0]?.code).toBe('DEPENDENCY_AMBIGUOUS');
    expect(duplicate.diagnostics[0]?.message).toContain('文件夹导入');
  });

  it('不同名 atlas 多候选时拒绝不确定推断，精确同名 atlas 优先', async () => {
    const alternate = [
      json('hero.json'),
      atlas('a.atlas', ['page.png']),
      atlas('b.atlas', ['page.png']),
      { path: 'page.png' },
    ];
    expect(
      (await discoverResources(createMemoryProvider(alternate))).diagnostics[0]?.code,
    ).toBe('DEPENDENCY_AMBIGUOUS');
    expect(
      (
        await discoverResources(
          createMemoryProvider([...alternate, atlas('hero.atlas', ['page.png'])]),
        )
      ).resources[0]?.atlas.path,
    ).toBe('hero.atlas');
  });

  it('单套缺页、错误版本、错误读取均不阻断其他完整资源', async () => {
    const provider = createMemoryProvider(
      [
        ...group('good'),
        ...group('version', '4.9.0'),
        json('missing/hero.json'),
        atlas('missing/hero.atlas', ['first.png', 'absent.png']),
        { path: 'missing/first.png' },
        json('denied/hero.json'),
      ],
      {
        beforeRead: async (file) => {
          if (file.path === 'denied/hero.json') throw new Error('读取被拒绝');
        },
      },
    );
    const result = await discoverResources(provider);
    expect(result.resources.map((entry) => entry.id)).toEqual(['good/hero.json']);
    expect(result.diagnostics.map((entry) => entry.code)).toEqual([
      'VERSION_UNSUPPORTED',
      'PAGE_MISSING',
      'FILE_READ_FAILED',
    ]);
    expect(result.diagnostics[1]?.path).toBe('missing/absent.png');
    expect(result.diagnostics[2]?.message).toContain('读取被拒绝');
  });

  it('宿主 resolve 返回另一目录的文件时拒绝替代', async () => {
    const provider = createMemoryProvider([
      json('a/hero.json'),
      atlas('a/hero.atlas', ['page.png']),
    ]);
    provider.resolve = async () => ({ id: 'b/page.png', path: 'b/page.png', size: 1 });
    const result = await discoverResources(provider);
    expect(result.resources).toEqual([]);
    expect(result.diagnostics[0]?.code).toBe('DEPENDENCY_PATH_MISMATCH');
  });

  it('默认排除构建目录但显式选择的目录根可扫描，可设置排除和进度', async () => {
    const provider = createMemoryProvider([
      ...group('good'),
      ...group('node_modules/library'),
      ...group('custom/private'),
    ]);
    const progress = vi.fn();
    const defaults = await discoverResources(provider, { onProgress: progress });
    expect(defaults.resources.map((entry) => entry.id)).toEqual([
      'good/hero.json',
      'custom/private/hero.json',
    ]);
    expect(progress.mock.calls.map((call) => call[0].processed)).toEqual([1, 2]);
    expect(progress.mock.calls.at(-1)?.[0]).toMatchObject({ processed: 2, total: 2 });
    const explicit = await discoverResources(provider, { rootPath: 'node_modules' });
    expect(explicit.resources[0]?.id).toBe('node_modules/library/hero.json');
    const filtered = await discoverResources(provider, {
      exclude: ['custom/private', 'node_modules'],
    });
    expect(filtered.resources.map((entry) => entry.id)).toEqual(['good/hero.json']);
  });

  it.each(['hero.json', 'hero.atlas', 'page.png'])(
    '首选 %s 唯一关联时定位对应骨骼',
    async (preferredFileId) => {
      const result = await discoverResources(createMemoryProvider(group()), {
        preferredFileId,
      });
      expect(result.preferredResourceId).toBe('hero.json');
    },
  );

  it('共享 atlas 关联 JSON/binary 两套时列出候选，不随意选首个', async () => {
    const bytes = await readFile(
      new URL('../../../fixtures/official/3.8/spineboy/spineboy.skel', import.meta.url),
    );
    const result = await discoverResources(
      createMemoryProvider([...group(), { path: 'hero.skel', bytes }]),
      { preferredFileId: 'hero.atlas' },
    );
    expect(result.resources).toHaveLength(2);
    expect(result.preferredResourceId).toBeUndefined();
    expect(result.diagnostics[0]?.code).toBe('PREFERRED_FILE_AMBIGUOUS');
    expect(result.diagnostics[0]?.message).toContain('hero.json');
    expect(result.diagnostics[0]?.message).toContain('hero.skel');
  });

  it('所选普通文件未关联时仍展示同目录可用资源', async () => {
    const result = await discoverResources(
      createMemoryProvider([...group(), { path: 'config.json', text: '{}' }]),
      { preferredFileId: 'config.json' },
    );
    expect(result.resources).toHaveLength(1);
    expect(result.preferredResourceId).toBeUndefined();
    expect(result.diagnostics[0]?.code).toBe('PREFERRED_FILE_UNASSOCIATED');
  });

  it('官方完整 3.7 binary 在请求 atlas 或图片前拒绝', async () => {
    const bytes = await readFile(
      new URL(
        '../../../fixtures/negative/official-3.7-binary/spineboy.skel',
        import.meta.url,
      ),
    );
    const provider = createMemoryProvider([{ path: 'hero.skel', bytes }]);
    const resolve = vi.spyOn(provider, 'resolve');
    const image = vi.spyOn(provider, 'imageUrl');
    const result = await discoverResources(provider);
    expect(result.diagnostics[0]?.code).toBe('BINARY_37_UNSUPPORTED');
    expect(resolve).not.toHaveBeenCalled();
    expect(image).not.toHaveBeenCalled();
  });
});
