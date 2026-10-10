import type { ResourceProvider, SpineResource } from '@spine-preview/core';
import { loadRuntime } from './registry.js';
import type {
  CameraState,
  PreviewController,
  PreviewOptions,
  RuntimeSession,
} from './types.js';

/** 在宿主中建立独立画布；失败或取消时释放会话，不启动第二个共享 ticker。 */
export async function createPreviewController(
  host: HTMLElement,
  resource: SpineResource,
  provider: ResourceProvider,
  options: PreviewOptions = {},
): Promise<PreviewController> {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-label', 'Spine animation preview canvas');
  canvas.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:grab';
  const width = Math.max(1, host.clientWidth);
  const height = Math.max(1, host.clientHeight);
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  let session: RuntimeSession | undefined;
  try {
    session = await loadRuntime({
      canvas,
      resource,
      provider,
      ...(options.signal ? { signal: options.signal } : {}),
    });
    options.signal?.throwIfAborted();
    const first = session.animations[0];
    if (first !== undefined) session.play(first, true);
    session.update(0);
    host.append(canvas);
    return new LocalPreview(host, canvas, session, options);
  } catch (error) {
    try {
      await session?.dispose();
    } catch (cleanup) {
      throw new AggregateError([error, cleanup], '预览准备和会话清理失败');
    } finally {
      canvas.remove();
    }
    throw error;
  }
}

/** 画布输入和秒时钟由此控制，renderer 只负责姿态及当前相机的绘制。 */
class LocalPreview implements PreviewController {
  private readonly camera: CameraState;
  private readonly observer: ResizeObserver;
  private readonly listeners = new AbortController();
  private paused = false;
  private speed = 1;
  private fitted = false;
  private lastFrame: number | undefined;
  private frame = 0;
  private disposed = false;
  private disposal: Promise<void> | undefined;
  private drag:
    | {
        /** 捕获指针身份。 */
        id: number;
        /** 前一横坐标。 */
        x: number;
        /** 前一纵坐标。 */
        y: number;
      }
    | undefined;

  constructor(
    private readonly host: HTMLElement,
    private readonly canvas: HTMLCanvasElement,
    private readonly session: RuntimeSession,
    private readonly options: PreviewOptions,
  ) {
    this.camera = {
      width: Math.max(1, host.clientWidth),
      height: Math.max(1, host.clientHeight),
      zoom: 1,
      centerX: 0,
      centerY: 0,
    };
    const bounds = this.centerPose();
    // 首次按实际画布判断：只有原始姿态越界时才缩小，较小资源保持100%。
    if (bounds.width > this.camera.width || bounds.height > this.camera.height) {
      this.camera.zoom = this.fitZoom(bounds);
      this.fitted = true;
    }
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(host);
    canvas.addEventListener('wheel', this.wheel, {
      passive: false,
      signal: this.listeners.signal,
    });
    canvas.addEventListener('pointerdown', this.pointerDown, {
      signal: this.listeners.signal,
    });
    canvas.addEventListener('pointermove', this.pointerMove, {
      signal: this.listeners.signal,
    });
    canvas.addEventListener('pointerup', this.pointerUp, {
      signal: this.listeners.signal,
    });
    canvas.addEventListener('pointercancel', this.pointerUp, {
      signal: this.listeners.signal,
    });
    canvas.addEventListener('lostpointercapture', this.pointerUp, {
      signal: this.listeners.signal,
    });
    canvas.addEventListener('webglcontextlost', this.contextLost, {
      signal: this.listeners.signal,
    });
    document.addEventListener('visibilitychange', this.visibility, {
      signal: this.listeners.signal,
    });
    this.notify();
    this.frame = requestAnimationFrame(this.tick);
  }

  get animations(): readonly string[] {
    return this.session.animations;
  }
  get skins(): readonly string[] {
    return this.session.skins;
  }
  get version(): SpineResource['version'] {
    return this.session.version;
  }

  play(name: string, loop: boolean): void {
    this.assertOpen();
    this.session.play(name, loop);
    this.session.update(0);
    this.paused = false;
    this.lastFrame = undefined;
    this.notify();
    if (!this.frame) this.frame = requestAnimationFrame(this.tick);
  }

  setPaused(paused: boolean): void {
    this.assertOpen();
    this.paused = paused;
    this.lastFrame = undefined;
    this.notify();
    if (!paused && !this.frame) this.frame = requestAnimationFrame(this.tick);
  }

  setSpeed(speed: number): void {
    this.assertOpen();
    if (!Number.isFinite(speed) || speed < 0)
      throw new RangeError('播放速度必须为非负有限数');
    this.speed = speed;
  }

  setZoom(zoom: number): void {
    this.assertOpen();
    if (!Number.isFinite(zoom)) throw new RangeError('缩放必须为有限数');
    this.zoomAt(zoom, this.camera.width / 2, this.camera.height / 2);
  }

  toggleFit(): void {
    this.assertOpen();
    const bounds = this.centerPose();
    if (this.fitted) {
      this.camera.zoom = 1;
      this.fitted = false;
    } else {
      this.camera.zoom = this.fitZoom(bounds);
      this.fitted = true;
    }
    this.notify();
  }

  dispose(): Promise<void> {
    if (this.disposal) return this.disposal;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.listeners.abort();
    this.observer.disconnect();
    this.endDrag();
    this.canvas.remove();
    this.disposal = Promise.resolve()
      .then(async () => {
        await this.session.dispose();
        // 控制器独占并移除画布，主动归还上下文避免快速切换触发浏览器上下文数量上限。
        const context =
          this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
        context?.getExtension('WEBGL_lose_context')?.loseContext();
      })
      .catch((error: unknown) => {
        // DOM 和监听已关闭，保留会话所有权使后续 dispose 可重试 GPU 清理。
        this.disposal = undefined;
        throw error;
      });
    return this.disposal;
  }

  private centerPose() {
    const bounds = this.session.getBounds();
    if ([bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite)) {
      this.camera.centerX = bounds.x + bounds.width / 2;
      this.camera.centerY = bounds.y + bounds.height / 2;
      return bounds;
    }
    this.camera.centerX = 0;
    this.camera.centerY = 0;
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  /** 使用统一留白比例计算适应缩放，空姿态按原始尺寸显示。 */
  private fitZoom(bounds: { width: number; height: number }): number {
    return bounds.width > 0 && bounds.height > 0
      ? Math.min(
          10,
          (this.camera.width * 0.84) / bounds.width,
          (this.camera.height * 0.84) / bounds.height,
        )
      : 1;
  }

  private readonly resize = (): void => {
    if (this.disposed) return;
    this.camera.width = Math.max(1, this.host.clientWidth);
    this.camera.height = Math.max(1, this.host.clientHeight);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.camera.width * ratio);
    this.canvas.height = Math.round(this.camera.height * ratio);
    if (this.fitted) {
      this.camera.zoom = this.fitZoom(this.centerPose());
      this.notify();
    }
  };

  private readonly tick = (now: number): void => {
    this.frame = 0;
    if (this.disposed) return;
    try {
      if (!document.hidden) {
        if (!this.paused && this.lastFrame !== undefined)
          this.session.update(
            Math.min(Math.max((now - this.lastFrame) / 1000, 0), 0.1) * this.speed,
          );
        this.session.render(this.camera);
      }
      this.lastFrame = document.hidden || this.paused ? undefined : now;
    } catch (error) {
      this.paused = true;
      this.lastFrame = undefined;
      this.notify();
      this.options.onError?.(error);
      return;
    }
    this.frame = requestAnimationFrame(this.tick);
  };

  private readonly visibility = (): void => {
    this.lastFrame = undefined;
    if (document.hidden) this.endDrag();
  };

  private readonly contextLost = (event: Event): void => {
    event.preventDefault();
    this.paused = true;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.notify();
    this.options.onError?.(new Error('WebGL 上下文已丢失，请重新选择资源以恢复'));
  };

  private point(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / Math.max(rect.width, 1)) * this.camera.width,
      y: ((clientY - rect.top) / Math.max(rect.height, 1)) * this.camera.height,
    };
  }

  private readonly wheel = (event: WheelEvent): void => {
    event.preventDefault();
    const point = this.point(event.clientX, event.clientY);
    const unit =
      event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? this.camera.height : 1;
    this.zoomAt(
      this.camera.zoom *
        Math.exp(Math.max(-1, Math.min(1, -event.deltaY * unit * 0.0015))),
      point.x,
      point.y,
    );
  };

  private zoomAt(zoom: number, x: number, y: number): void {
    const next = this.clampZoom(zoom);
    const dx = x - this.camera.width / 2;
    const dy = y - this.camera.height / 2;
    // 保持指针下世界坐标不变，Spine 纵轴与屏幕纵轴方向相反。
    this.camera.centerX += dx / this.camera.zoom - dx / next;
    this.camera.centerY -= dy / this.camera.zoom - dy / next;
    this.camera.zoom = next;
    this.fitted = false;
    this.notify();
  }

  private readonly pointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || this.drag) return;
    event.preventDefault();
    this.canvas.setPointerCapture(event.pointerId);
    this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    this.canvas.style.cursor = 'grabbing';
  };

  private readonly pointerMove = (event: PointerEvent): void => {
    if (!this.drag || this.drag.id !== event.pointerId) return;
    const previous = this.point(this.drag.x, this.drag.y);
    const current = this.point(event.clientX, event.clientY);
    this.camera.centerX -= (current.x - previous.x) / this.camera.zoom;
    this.camera.centerY += (current.y - previous.y) / this.camera.zoom;
    this.drag.x = event.clientX;
    this.drag.y = event.clientY;
    this.fitted = false;
    this.notify();
  };

  private readonly pointerUp = (event: PointerEvent): void => {
    if (this.drag?.id === event.pointerId) this.endDrag();
  };
  private endDrag(): void {
    const id = this.drag?.id;
    this.drag = undefined;
    if (id !== undefined && this.canvas.hasPointerCapture(id))
      this.canvas.releasePointerCapture(id);
    this.canvas.style.cursor = 'grab';
  }
  private clampZoom(zoom: number): number {
    return Math.min(10, Math.max(Math.min(0.05, this.camera.zoom), zoom));
  }
  private notify(): void {
    this.options.onChange?.({
      zoom: this.camera.zoom,
      fitted: this.fitted,
      paused: this.paused,
    });
  }
  private assertOpen(): void {
    if (this.disposed) throw new Error('预览已关闭');
  }
}
