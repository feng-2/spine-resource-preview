import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import spine37 from '../../../../vendor/3.7/spine-webgl.mjs';
import spine38 from '../../../../vendor/3.8/spine-webgl.mjs';
import { getLegacyAdapter } from '../../src/legacy/index.js';
import { readLegacyAtlasSettings } from '../../src/legacy/images.js';
import { LegacyOwnership } from '../../src/legacy/ownership.js';
import { LegacySession } from '../../src/legacy/session.js';
import type { LegacyRuntime, LegacyTexture } from '../../src/legacy/contracts.js';
import type { LegacySessionObjects } from '../../src/legacy/session.js';
import type { SpineResource, ResourceProvider, ImageLease } from '@spine-preview/core';

/** 共用官方样本，只将 ESS 和不同的 3.8.99 导出保留为回归夹具。 */
const fixture = (version: string, name: string): Uint8Array => {
  const group =
    name.includes('-pma') || name.endsWith('-pro.skel') ? 'spineboy-pro' : 'spineboy-ess';
  let path = `regression/${version}/${group}/${name}`;
  if (name === 'spineboy-pro.json') path = `official/${version}/spineboy/spineboy.json`;
  else if (version === '3.7' && /[.](atlas|png)$/.test(name)) {
    const group = name.includes('-pma') ? 'spineboy-pma' : 'spineboy';
    path = `official/${version}/${group}/${name}`;
  }
  return new Uint8Array(
    readFileSync(new URL(`../../../../fixtures/${path}`, import.meta.url)),
  );
};
const text = (version: string, name: string): string =>
  new TextDecoder().decode(fixture(version, name));
const emptyTexture: LegacyTexture = {
  getImage: () => ({ width: 1024, height: 256 }),
  setFilters: () => undefined,
  setWraps: () => undefined,
  dispose: () => undefined,
};

function resource(version: '3.7' | '3.8' = '3.8'): SpineResource {
  const file = (path: string) => ({ id: path, path, size: 1 });
  return {
    id: 'spineboy',
    name: 'spineboy',
    version,
    exportVersion: `${version}.99`,
    format: 'json',
    skeleton: file('spineboy-ess.json'),
    atlas: file('spineboy.atlas'),
    pages: [{ name: 'spineboy.png', file: file('spineboy.png') }],
    animations: [],
  };
}

function parse(runtime: LegacyRuntime, version: string, binary = false, pro = false) {
  const atlas = new runtime.TextureAtlas(
    text(version, binary || pro ? 'spineboy-pma.atlas' : 'spineboy.atlas'),
    () => emptyTexture,
  );
  const loader = new runtime.AtlasAttachmentLoader(atlas);
  const data = binary
    ? new runtime.SkeletonBinary!(loader).readSkeletonData(
        fixture(version, 'spineboy-pro.skel'),
      )
    : new runtime.SkeletonJson(loader).readSkeletonData(
        JSON.parse(text(version, pro ? 'spineboy-pro.json' : 'spineboy-ess.json')),
      );
  const skeleton = new runtime.Skeleton(data);
  const state = new runtime.AnimationState(new runtime.AnimationStateData(data));
  skeleton.updateWorldTransform();
  return { data, skeleton, state };
}

function session(
  runtime: LegacyRuntime,
  version: '3.7' | '3.8',
  binary = false,
  pro = false,
) {
  const parsed = parse(runtime, version, binary, pro);
  const objects: LegacySessionObjects = {
    canvas: { width: 1, height: 1 } as HTMLCanvasElement,
    gl: { isContextLost: () => false } as WebGLRenderingContext,
    ...parsed,
    shader: {
      bind() {},
      unbind() {},
      setUniformi() {},
      setUniform4x4f() {},
      dispose() {},
    },
    batcher: { begin() {}, end() {}, dispose() {} },
    renderer: { premultipliedAlpha: true, draw() {} },
    matrixUniform: 'u_projTrans',
    samplerUniform: 'u_texture',
    offset: new runtime.Vector2(),
    size: new runtime.Vector2(),
  };
  return {
    objects,
    session: new LegacySession(version, parsed.data, objects, new LegacyOwnership()),
  };
}

describe('官方旧 runtime 的来源与真实格式', () => {
  it.each(['3.7', '3.8'])(
    '%s 产物只有隔离 ESM 后缀，源码和许可证哈希对应固定来源',
    (version) => {
      const root = new URL(`../../../../vendor/${version}/`, import.meta.url);
      const manifest = JSON.parse(readFileSync(new URL('source.json', root), 'utf8'));
      const bytes = readFileSync(new URL('spine-webgl.mjs', root));
      const marker = Buffer.from('\n// ESM 隔离封装：');
      const original = Buffer.from(
        bytes
          .subarray(0, bytes.indexOf(marker))
          .toString('utf8')
          .replace(
            '// 隔离模块省略外部 source map 引用。',
            '//# sourceMappingURL=spine-webgl.js.map',
          ),
      );
      const hash = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');
      expect(hash(bytes)).toBe(manifest.moduleSha256);
      expect(hash(original)).toBe(manifest.upstreamSha256);
      expect(hash(readFileSync(new URL('LICENSE', root)))).toBe(manifest.licenseSha256);
      expect(manifest.commit).toMatch(/^[a-f0-9]{40}$/);
    },
  );

  it('同时加载 3.7/3.8 不覆盖共享 spine 全局，也没有 3.7 binary 解析器', async () => {
    const before = (globalThis as { spine?: unknown }).spine;
    expect((await getLegacyAdapter('3.7')).version).toBe('3.7');
    expect((await getLegacyAdapter('3.8')).version).toBe('3.8');
    expect((globalThis as { spine?: unknown }).spine).toBe(before);
    expect(spine37).not.toBe(spine38);
    expect(spine37.SkeletonBinary).toBeUndefined();
    expect(spine38.SkeletonBinary).toBeTypeOf('function');
  });

  it.each([
    ['3.7', spine37, false, false],
    ['3.8', spine38, false, false],
    ['3.8', spine38, true, false],
    ['3.7', spine37, false, true],
    ['3.8', spine38, false, true],
  ] as const)(
    '%s 官方真实样本可解析并推进，不残留前动画姿态',
    (version, runtime, binary, pro) => {
      const result = session(runtime, version, binary, pro);
      expect(result.session.animations).toContain('idle');
      expect(result.session.skins).toContain('default');
      result.session.play('idle', true);
      const initial = result.session.getBounds();
      expect(initial.width).toBeGreaterThan(200);
      expect(initial.height).toBeGreaterThan(500);
      result.session.play('death', false);
      result.session.update(2);
      expect(result.session.getBounds()).not.toEqual(initial);
      result.session.play('idle', false);
      expect(result.session.getBounds()).toEqual(initial);
      result.session.setSkin('default');
      expect(result.session.getBounds()).toEqual(initial);
      result.session.dispose();
      result.session.dispose();
      expect(() => result.session.update(0)).toThrow('已释放');
    },
  );

  it('100% 相机与 DPR 相互独立，透明清屏后提交官方 renderer 绘制', () => {
    const { session: preview, objects } = session(spine38, '3.8');
    const calls: unknown[][] = [];
    const gl = {
      isContextLost: () => false,
      get drawingBufferWidth() {
        return objects.canvas.width;
      },
      get drawingBufferHeight() {
        return objects.canvas.height;
      },
      viewport: (...args: unknown[]) => calls.push(args),
      disable() {},
      colorMask() {},
      clearColor: (...args: unknown[]) => calls.push(args),
      clear() {},
    } as unknown as WebGLRenderingContext;
    objects.gl = gl;
    const matrices: number[][] = [];
    objects.shader.setUniform4x4f = (_name, values) => matrices.push([...values]);
    const draw = vi.fn();
    objects.renderer.draw = draw;
    vi.stubGlobal('devicePixelRatio', 2);
    try {
      preview.render({ width: 400, height: 300, centerX: 40, centerY: 80, zoom: 1 });
      expect([objects.canvas.width, objects.canvas.height]).toEqual([800, 600]);
      expect(calls).toContainEqual([0, 0, 800, 600]);
      expect(calls).toContainEqual([0, 0, 0, 0]);
      const projection = matrices[0]!;
      expect(40 * projection[0]! + projection[12]!).toBeCloseTo(0);
      expect(80 * projection[5]! + projection[13]!).toBeCloseTo(0);
      expect(240 * projection[0]! + projection[12]!).toBeCloseTo(1);
      expect(230 * projection[5]! + projection[13]!).toBeCloseTo(1);
      expect(draw).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
      preview.dispose();
    }
  });
});

describe('PMA、取消和独立所有权', () => {
  it('页声明覆盖历史命名，mipmap 来源于 atlas，pma 行只从页元数据剥离', () => {
    const item = resource();
    item.atlas.path = 'spineboy-pma.atlas';
    item.pages = [{ ...item.pages[0]!, pma: false }];
    const settings = readLegacyAtlasSettings(
      text('3.8', 'spineboy.atlas')
        .replace('repeat: none', 'repeat: none\npma: true')
        .replace('filter: Linear,Linear', 'filter: MipMapLinearLinear,Linear'),
      item,
    );
    expect(settings.pages.get('spineboy.png')).toEqual({ pma: false, mipmaps: true });
    expect(settings.text).not.toContain('pma: true');
    item.pages = [{ ...item.pages[0]!, pma: true }];
    expect(
      readLegacyAtlasSettings(text('3.8', 'spineboy.atlas'), item).pages.get(
        'spineboy.png',
      )?.pma,
    ).toBe(true);
    item.pages = [{ name: 'spineboy.png', file: item.pages[0]!.file }];
    expect(
      readLegacyAtlasSettings(text('3.8', 'spineboy.atlas'), item).pages.get(
        'spineboy.png',
      )?.pma,
    ).toBe(true);
  });

  it('3.7 binary 在读取文件或借用图片之前被拒绝', async () => {
    const adapter = await getLegacyAdapter('3.7');
    const provider: ResourceProvider = {
      files: [],
      readText: vi.fn(),
      readBytes: vi.fn(),
      imageUrl: vi.fn(),
    };
    await expect(
      adapter.load({
        resource: { ...resource('3.7'), format: 'binary' },
        provider,
        canvas: {} as HTMLCanvasElement,
      }),
    ).rejects.toThrow('3.7 二进制');
    expect(provider.readText).not.toHaveBeenCalled();
    expect(provider.imageUrl).not.toHaveBeenCalled();
  });

  it('JSON 内容变化为另一个版本时，在申请图片和 context 之前拒绝过期索引', async () => {
    const adapter = await getLegacyAdapter('3.7');
    const input = JSON.parse(text('3.7', 'spineboy-ess.json'));
    input.skeleton.spine = '3.6.39';
    const provider: ResourceProvider = {
      files: [],
      readText: async (file) =>
        file.id === 'spineboy.atlas'
          ? text('3.7', 'spineboy.atlas')
          : JSON.stringify(input),
      readBytes: vi.fn(),
      imageUrl: vi.fn(),
    };
    await expect(
      adapter.load({
        resource: resource('3.7'),
        provider,
        canvas: {} as HTMLCanvasElement,
      }),
    ).rejects.toThrow('3.6.39');
    expect(provider.imageUrl).not.toHaveBeenCalled();
  });

  it('某页先失败时等待晚到的图片地址结算，取消后晚到地址仍然释放', async () => {
    const adapter = await getLegacyAdapter('3.8');
    const abort = new AbortController();
    const release = vi.fn();
    let resolveLease!: (lease: ImageLease) => void;
    const later = new Promise<ImageLease>((resolve) => {
      resolveLease = resolve;
    });
    const item = resource();
    item.pages = [
      ...item.pages,
      { name: 'late.png', file: { id: 'late', path: 'late.png', size: 1 } },
    ];
    const provider: ResourceProvider = {
      files: [],
      readText: async (file) =>
        file.id === 'spineboy.atlas'
          ? `${text('3.8', 'spineboy.atlas')}\n\nlate.png\nsize: 1,1\nformat: RGBA8888\nfilter: Linear,Linear\nrepeat: none\n`
          : text('3.8', 'spineboy-ess.json'),
      readBytes: vi.fn(),
      imageUrl: async (file) => {
        if (file.id === 'late') return later;
        throw new Error('首个图片失败');
      },
    };
    let settled = false;
    const pending = adapter.load({
      resource: item,
      provider,
      canvas: {} as HTMLCanvasElement,
      signal: abort.signal,
    });
    void pending
      .finally(() => {
        settled = true;
      })
      .catch(() => undefined);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(settled).toBe(false);
    abort.abort();
    resolveLease({ url: 'blob:late', release });
    await expect(pending).rejects.toThrow('首个图片失败');
    expect(release).toHaveBeenCalledOnce();
  });

  it('清理失败不阻止兄弟资源释放，重试只处理失败项', () => {
    const ownership = new LegacyOwnership();
    const succeed = vi.fn();
    const failOnce = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('释放失败');
      })
      .mockImplementation(() => undefined);
    ownership.add(succeed);
    ownership.add(failOnce);
    expect(() => ownership.dispose()).toThrow('清理失败');
    expect(succeed).toHaveBeenCalledOnce();
    ownership.dispose();
    ownership.dispose();
    expect(failOnce).toHaveBeenCalledTimes(2);
    expect(succeed).toHaveBeenCalledOnce();
  });
});
