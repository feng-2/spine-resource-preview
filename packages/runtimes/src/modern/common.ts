import type { ImageLease, SpineVersion } from '@spine-preview/core';
import type {
  CameraState,
  PoseBounds,
  RuntimeLoadOptions,
  RuntimeSession,
  SlotPose,
} from '../types';

/** 已读取的素材；运行时对象只留在版本独立模块内。 */
export interface PreparedAssets {
  /** 图集原文。 */
  atlasText: string;
  /** JSON 原文或骨骼字节。 */
  skeleton: string | Uint8Array;
  /** 按原始图集页名索引的图片。 */
  images: Map<string, HTMLImageElement>;
}

/** 统一后端只通过闭包操作本版本对象。 */
export interface ModernBackend {
  /** 动作名。 */
  animations: readonly string[];
  /** 皮肤名。 */
  skins: readonly string[];
  /** setup pose 中的插槽名。 */
  slots: readonly string[];
  /** 从头播放。 */
  play(name: string, loop: boolean): void;
  /** 切换皮肤。 */
  setSkin(name: string): void;
  /** 推进姿态。 */
  update(seconds: number): void;
  /** 绘制姿态。 */
  render(camera: CameraState): void;
  /** 当前姿态边界。 */
  getBounds(): PoseBounds;
  /** 当前姿态下指定插槽的附件范围和锚点。 */
  getSlotPose(name: string): SlotPose | undefined;
  /** 官方动画数据中的秒数。 */
  getAnimationDuration(name: string): number | undefined;
  /** 独立采样整个动画，不改变播放状态。 */
  getAnimationBounds(name: string): PoseBounds | undefined;
}

/** 每个加载任务独立的后进先出清理栈，失败也执行完整释放。 */
export class CleanupScope {
  private callbacks: (() => void)[] = [];

  /** 登记已成功创建的资源。 */
  own(cleanup: () => void): void {
    this.callbacks.push(cleanup);
  }

  /** 一项失败不会阻止其他资源释放。 */
  dispose(): void {
    const errors: unknown[] = [];
    for (const cleanup of this.callbacks.splice(0).reverse()) {
      try {
        cleanup();
      } catch (error) {
        errors.push(error);
        // 只保留失败项供下一次dispose重试，成功项不会再次释放。
        this.callbacks.unshift(cleanup);
      }
    }
    if (errors.length) throw new AggregateError(errors, 'Spine GPU/图片资源释放失败');
  }
}

/** 将取消转换为标准 AbortError。 */
export function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('资源加载已取消', 'AbortError');
}

/** 扫描后文件可能被编辑；解析时再次核对原始导出版本，禁止错版本继续绘制。 */
export function checkExportVersion(
  actual: string | null | undefined,
  expected: SpineVersion,
): void {
  if (!actual || actual.match(/^(\d+\.\d+)(?:\.|$)/)?.[1] !== expected) {
    throw new Error(
      `骨骼实际导出版本 ${actual || '缺失'} 与所选 ${expected} runtime 不匹配，请刷新资源`,
    );
  }
}

/** 解码图片时可以取消，卸下所有监听，不持有过期任务。 */
export function decodeImage(
  url: string,
  signal?: AbortSignal,
): Promise<HTMLImageElement> {
  checkAbort(signal);
  return new Promise((resolve, reject) => {
    const image = new Image();
    // Webview图片可来自资源专用域，声明匿名CORS确保可上传至WebGL。
    image.crossOrigin = 'anonymous';
    const detach = () => {
      image.onload = null;
      image.onerror = null;
      signal?.removeEventListener('abort', abort);
    };
    const abort = () => {
      detach();
      image.removeAttribute('src');
      reject(new DOMException('图片加载已取消', 'AbortError'));
    };
    image.onload = () => {
      detach();
      resolve(image);
    };
    image.onerror = () => {
      detach();
      image.removeAttribute('src');
      reject(new Error(`无法解码图集页图片：${url}`));
    };
    signal?.addEventListener('abort', abort, { once: true });
    image.src = url;
  });
}

/** 接入逻辑相机；设备像素比只影响 viewport，不改变100%的骨骼比例。 */
export function prepareViewport(
  canvas: HTMLCanvasElement,
  gl: WebGLRenderingContext,
  camera: CameraState,
): void {
  if (
    ![camera.width, camera.height, camera.zoom, camera.centerX, camera.centerY].every(
      Number.isFinite,
    ) ||
    camera.zoom <= 0
  )
    throw new Error('预览相机参数无效');
  const ratio = Math.max(1, Math.min(globalThis.devicePixelRatio || 1, 4));
  const width = Math.max(1, Math.round(camera.width * ratio));
  const height = Math.max(1, Math.round(camera.height * ratio));
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  gl.viewport(0, 0, width, height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
}

/** 不存在可见附件时返回稳定的零范围。 */
export function safeBounds(bounds: PoseBounds): PoseBounds {
  return Object.values(bounds).every(Number.isFinite)
    ? bounds
    : { x: 0, y: 0, width: 0, height: 0 };
}

/** 所有版本共用读取/取消/独占画布边界，不共享任何官方 runtime 对象。 */
export async function loadModernSession(
  version: SpineVersion,
  options: RuntimeLoadOptions,
  build: (
    assets: PreparedAssets,
    gl: WebGLRenderingContext,
    scope: CleanupScope,
  ) => ModernBackend,
): Promise<RuntimeSession> {
  const { resource, provider, canvas, signal } = options;
  if (resource.version !== version)
    throw new Error(`Spine ${resource.exportVersion} 不能由 ${version} runtime 解析`);
  const scope = new CleanupScope();
  try {
    checkAbort(signal);
    const atlasText = await provider.readText(resource.atlas, signal);
    const skeleton =
      resource.format === 'json'
        ? await provider.readText(resource.skeleton, signal)
        : await provider.readBytes(resource.skeleton, signal);
    if (typeof skeleton === 'string') {
      const data = JSON.parse(skeleton);
      checkExportVersion(data?.skeleton?.spine, version);
    }
    const images = new Map<string, HTMLImageElement>();
    for (const page of resource.pages) {
      checkAbort(signal);
      const lease: ImageLease = await provider.imageUrl(page.file, signal);
      scope.own(() => lease.release());
      const image = await decodeImage(lease.url, signal);
      scope.own(() => image.removeAttribute('src'));
      images.set(page.name, image);
    }
    checkAbort(signal);
    // 传入现成上下文，避免4.0/4.1 ManagedWebGL注册不可卸载的匿名事件。
    const gl =
      canvas.getContext('webgl2', {
        alpha: true,
        premultipliedAlpha: true,
        antialias: true,
      }) ||
      canvas.getContext('webgl', {
        alpha: true,
        premultipliedAlpha: true,
        antialias: true,
      });
    if (!gl) throw new Error('当前环境无法创建 Spine WebGL 上下文');
    let lost = false;
    const onLost = (event: Event) => {
      event.preventDefault();
      lost = true;
    };
    canvas.addEventListener('webglcontextlost', onLost);
    scope.own(() => canvas.removeEventListener('webglcontextlost', onLost));
    const backend = build({ atlasText, skeleton, images }, gl, scope);
    let disposed = false;
    let closing = false;
    const active = () => {
      if (closing || disposed) throw new Error('Spine 预览实例已经释放或正在释放');
      if (lost || gl.isContextLost())
        throw new Error('WebGL 上下文已丢失，请重新选择资源');
    };
    return {
      version,
      animations: backend.animations,
      skins: backend.skins,
      slots: backend.slots,
      play(name, loop) {
        active();
        backend.play(name, loop);
      },
      setSkin(name) {
        active();
        backend.setSkin(name);
      },
      update(seconds) {
        active();
        if (!Number.isFinite(seconds) || seconds < 0)
          throw new Error('动画时间必须为非负秒数');
        backend.update(seconds);
      },
      render(camera) {
        active();
        prepareViewport(canvas, gl, camera);
        backend.render(camera);
      },
      getBounds() {
        active();
        return safeBounds(backend.getBounds());
      },
      getSlotPose(name) {
        active();
        return backend.getSlotPose(name);
      },
      getAnimationDuration(name) {
        active();
        return backend.getAnimationDuration(name);
      },
      getAnimationBounds(name) {
        active();
        return backend.getAnimationBounds(name);
      },
      dispose() {
        if (!disposed) {
          closing = true;
          scope.dispose();
          disposed = true;
        }
      },
    };
  } catch (error) {
    try {
      scope.dispose();
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        'Spine 加载失败，且部分资源释放失败',
      );
    }
    throw error;
  }
}
