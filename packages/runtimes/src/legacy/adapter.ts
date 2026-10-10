import type { ImageLease } from '@spine-preview/core';
import type { RuntimeAdapter, RuntimeLoadOptions, RuntimeSession } from '../types.js';
import type { LegacyRuntime, LegacyTexture } from './contracts.js';
import { assertNotAborted, loadLegacyImages, readLegacyAtlasSettings } from './images.js';
import { LegacyOwnership } from './ownership.js';
import { LegacySession } from './session.js';

/** 将一个固定版本官方旧 runtime 包装为加载适配器，不创建独立时钟。 */
export function createLegacyAdapter(
  version: '3.7' | '3.8',
  runtime: LegacyRuntime,
): RuntimeAdapter {
  return {
    version,
    load: (options) => loadLegacySession(version, runtime, options),
  };
}

/** 保留尚未释放的图片地址；单个释放失败不跳过其余页面。 */
function releaseLeases(leases: ImageLease[]): void {
  const errors: unknown[] = [];
  for (let index = leases.length - 1; index >= 0; index--) {
    try {
      leases[index]!.release();
      leases.splice(index, 1);
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length) throw new AggregateError(errors, 'Spine 图片地址释放失败');
}

/** 在图片解码之前拒绝 JSON 实际版本变化，不信任过期的发现描述。 */
function assertSameVersion(version: '3.7' | '3.8', actual: unknown): void {
  if (
    typeof actual !== 'string' ||
    (!actual.startsWith(`${version}.`) && actual !== version)
  )
    throw new Error(
      `骨骼实际版本 ${typeof actual === 'string' ? actual : '缺失'} 与 ${version} runtime 不匹配`,
    );
}

/** 读取原始 JSON 的导出元数据，不修改字段或转换版本。 */
function jsonVersion(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || !('skeleton' in value))
    return undefined;
  const metadata = value.skeleton;
  if (typeof metadata !== 'object' || metadata === null || !('spine' in metadata))
    return undefined;
  return metadata.spine;
}

/** 完成异步图片准备后才创建 GPU，失败时关闭本任务全部资源。 */
async function loadLegacySession(
  version: '3.7' | '3.8',
  runtime: LegacyRuntime,
  options: RuntimeLoadOptions,
): Promise<RuntimeSession> {
  if (options.resource.version !== version)
    throw new Error(
      `Spine ${options.resource.exportVersion} 不能使用 ${version} runtime`,
    );
  if (version === '3.7' && options.resource.format === 'binary')
    throw new Error('Spine 3.7 二进制格式暂不支持，请导出 3.7 JSON');
  const ownership = new LegacyOwnership();
  const leases: ImageLease[] = [];
  ownership.add(() => releaseLeases(leases));
  try {
    assertNotAborted(options.signal);
    const read = await Promise.allSettled([
      options.provider.readText(options.resource.atlas, options.signal),
      options.resource.format === 'json'
        ? options.provider.readText(options.resource.skeleton, options.signal)
        : options.provider.readBytes(options.resource.skeleton, options.signal),
    ]);
    for (const result of read) if (result.status === 'rejected') throw result.reason;
    const atlasText = read[0]!;
    const skeletonInput = read[1]!;
    if (atlasText.status !== 'fulfilled' || skeletonInput.status !== 'fulfilled')
      throw new Error('Spine 读取结果不完整');
    assertNotAborted(options.signal);
    if (typeof atlasText.value !== 'string') throw new Error('Spine atlas 必须为文本');
    const input = skeletonInput.value;
    const json: unknown = typeof input === 'string' ? JSON.parse(input) : undefined;
    if (options.resource.format === 'json') {
      if (typeof input !== 'string') throw new Error('Spine JSON 读取结果必须为文本');
      assertSameVersion(version, jsonVersion(json));
    } else if (!(input instanceof Uint8Array))
      throw new Error('Spine binary 读取结果必须为字节');
    const settings = readLegacyAtlasSettings(atlasText.value, options.resource);
    const pages = await loadLegacyImages(options, settings, leases);
    assertNotAborted(options.signal);
    const contextOptions: WebGLContextAttributes = {
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
      preserveDrawingBuffer: false,
    };
    const gl =
      options.canvas.getContext('webgl2', contextOptions) ??
      options.canvas.getContext('webgl', contextOptions);
    if (!gl) throw new Error('浏览器无法创建 Spine WebGL 上下文');
    // 本次 canvas 独占 context，最终丢弃以回收构造器失败时尚未登记的 GPU 对象。
    ownership.add(() => gl.getExtension('WEBGL_lose_context')?.loseContext());
    const context = new runtime.webgl.ManagedWebGLRenderingContext(gl);
    const textures = new Map<string, LegacyTexture>();
    for (const page of pages) {
      assertNotAborted(options.signal);
      // 所有页最终统一为 PMA；已预乘页直接上传，直通页仅在上传时预乘一次。
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !page.pma);
      const texture = new runtime.webgl.GLTexture(context, page.image, page.mipmaps);
      ownership.add(() => texture.dispose());
      textures.set(page.name, texture);
    }
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    const atlas = new runtime.TextureAtlas(settings.text, (path) => {
      const texture = textures.get(path);
      if (!texture) throw new Error(`Spine atlas 页面未加载：${path}`);
      return texture;
    });
    const attachmentLoader = new runtime.AtlasAttachmentLoader(atlas);
    const data =
      typeof input === 'string'
        ? new runtime.SkeletonJson(attachmentLoader).readSkeletonData(json)
        : runtime.SkeletonBinary
          ? new runtime.SkeletonBinary(attachmentLoader).readSkeletonData(input)
          : undefined;
    if (!data) throw new Error(`官方 ${version} runtime 不支持此骨骼格式`);
    assertSameVersion(version, data.version);
    const skeleton = new runtime.Skeleton(data);
    const state = new runtime.AnimationState(new runtime.AnimationStateData(data));
    ownership.add(() => state.clearTracks());
    ownership.add(() => state.clearListeners());
    skeleton.setToSetupPose();
    skeleton.updateWorldTransform();
    const shader = runtime.webgl.Shader.newTwoColoredTextured(context);
    ownership.add(() => shader.dispose());
    const batcher = new runtime.webgl.PolygonBatcher(context, true);
    ownership.add(() => batcher.dispose());
    const renderer = new runtime.webgl.SkeletonRenderer(context, true);
    renderer.premultipliedAlpha = true;
    assertNotAborted(options.signal);
    return new LegacySession(
      version,
      data,
      {
        canvas: options.canvas,
        gl,
        skeleton,
        state,
        shader,
        batcher,
        renderer,
        matrixUniform: runtime.webgl.Shader.MVP_MATRIX,
        samplerUniform: runtime.webgl.Shader.SAMPLER,
        offset: new runtime.Vector2(),
        size: new runtime.Vector2(),
      },
      ownership,
    );
  } catch (error) {
    try {
      ownership.dispose();
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], 'Spine 加载失败且部分资源未能释放');
    }
    throw error;
  }
}
