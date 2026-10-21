import type { ResourceProvider, SpineResource } from '@spine-preview/core';
import { loadRuntime } from './registry.js';
import type {
  CameraState,
  PoseBounds,
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
  const overlay = document.createElement('canvas');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.className = 'slot-overlay-canvas';
  overlay.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1';
  const overlayContext = overlay.getContext('2d');
  const width = Math.max(1, host.clientWidth);
  const height = Math.max(1, host.clientHeight);
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  overlay.width = canvas.width;
  overlay.height = canvas.height;
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
    host.append(canvas, overlay);
    return new LocalPreview(host, canvas, overlay, overlayContext, session, options);
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
  private animationBounds: PoseBounds = { x: 0, y: 0, width: 0, height: 0 };
  private animationDuration: number | undefined;
  private fps = 0;
  private selectedSlot: string | undefined;
  private sampleStarted: number | undefined;
  private sampleFrames = 0;
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
    private readonly overlay: HTMLCanvasElement,
    private readonly overlayContext: CanvasRenderingContext2D | null,
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
    const first = session.animations[0];
    this.animationBounds =
      (first !== undefined ? session.getAnimationBounds?.(first) : undefined) ?? bounds;
    this.animationDuration =
      first !== undefined ? session.getAnimationDuration?.(first) : undefined;
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
  get slots(): readonly string[] {
    return this.session.slots;
  }
  get version(): SpineResource['version'] {
    return this.session.version;
  }

  play(name: string, loop: boolean): void {
    this.assertOpen();
    this.session.play(name, loop);
    this.session.update(0);
    this.animationBounds =
      this.session.getAnimationBounds?.(name) ?? this.measureBounds();
    this.animationDuration = this.session.getAnimationDuration?.(name);
    this.paused = false;
    this.lastFrame = undefined;
    this.resetFps();
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

  selectSlot(name: string | undefined): void {
    this.assertOpen();
    if (name !== undefined && !this.session.slots.includes(name))
      throw new Error(`Spine 插槽不存在：${name}`);
    this.selectedSlot = name;
    this.drawSlotOverlay();
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
    this.overlay.remove();
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
    const bounds = this.measureBounds();
    this.camera.centerX = bounds.x + bounds.width / 2;
    this.camera.centerY = bounds.y + bounds.height / 2;
    return bounds;
  }

  private measureBounds(): PoseBounds {
    const bounds = this.session.getBounds();
    return [bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite)
      ? {
          ...bounds,
          width: Math.max(0, bounds.width),
          height: Math.max(0, bounds.height),
        }
      : { x: 0, y: 0, width: 0, height: 0 };
  }

  private resetFps(): void {
    this.fps = 0;
    this.sampleStarted = undefined;
    this.sampleFrames = 0;
  }

  /** 只统计成功的绘制，每 250 ms 更新 FPS；动画尺寸保持固定。 */
  private sampleMetrics(now: number): void {
    if (this.sampleStarted === undefined) {
      this.sampleStarted = now;
      return;
    }
    this.sampleFrames += 1;
    const elapsed = now - this.sampleStarted;
    if (elapsed < 250) return;
    const previous = Math.round(this.fps);
    this.fps = (this.sampleFrames * 1000) / elapsed;
    this.sampleStarted = now;
    this.sampleFrames = 0;
    // 状态栏显示整数 FPS；相同显示值不触发整棵 React 工作台更新。
    if (Math.round(this.fps) !== previous) this.notify();
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

  /** 使用与 WebGL 相机相同的中心、缩放和纵轴方向投影插槽范围。 */
  private drawSlotOverlay(): void {
    const context = this.overlayContext;
    if (!context) return;
    const ratio = Math.max(1, this.overlay.width / this.camera.width);
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, this.overlay.width, this.overlay.height);
    const selected = this.selectedSlot;
    if (selected === undefined) return;
    const pose = this.session.getSlotPose(selected);
    if (!pose || !Number.isFinite(pose.anchor.x) || !Number.isFinite(pose.anchor.y))
      return;

    const anchorX =
      (pose.anchor.x - this.camera.centerX) * this.camera.zoom + this.camera.width / 2;
    const anchorY =
      this.camera.height / 2 - (pose.anchor.y - this.camera.centerY) * this.camera.zoom;
    const bounds = pose.bounds;
    let left = anchorX - 8;
    let top = anchorY - 8;
    let width = 16;
    let height = 16;
    if (
      bounds &&
      [bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite)
    ) {
      left = (bounds.x - this.camera.centerX) * this.camera.zoom + this.camera.width / 2;
      top =
        this.camera.height / 2 -
        (bounds.y + bounds.height - this.camera.centerY) * this.camera.zoom;
      width = bounds.width * this.camera.zoom;
      height = bounds.height * this.camera.zoom;
    }
    const padding = 4;
    left -= padding;
    top -= padding;
    width = Math.max(8, width + padding * 2);
    height = Math.max(8, height + padding * 2);

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.save();
    context.strokeStyle = '#8bafff';
    context.lineWidth = 1.5;
    context.setLineDash([6, 4]);
    context.strokeRect(left, top, width, height);
    context.setLineDash([]);

    context.beginPath();
    context.arc(anchorX, anchorY, 5.5, 0, Math.PI * 2);
    context.fillStyle = 'rgba(255, 72, 94, 0.22)';
    context.fill();
    context.beginPath();
    context.arc(anchorX, anchorY, 2, 0, Math.PI * 2);
    context.fillStyle = '#ff2f4f';
    context.fill();
    context.strokeStyle = '#ffffff';
    context.lineWidth = 1;
    context.stroke();
    context.restore();
  }

  private readonly resize = (): void => {
    if (this.disposed) return;
    this.camera.width = Math.max(1, this.host.clientWidth);
    this.camera.height = Math.max(1, this.host.clientHeight);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.camera.width * ratio);
    this.canvas.height = Math.round(this.camera.height * ratio);
    this.overlay.width = this.canvas.width;
    this.overlay.height = this.canvas.height;
    this.drawSlotOverlay();
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
        this.drawSlotOverlay();
        this.sampleMetrics(now);
      } else {
        const hadFps = this.fps !== 0;
        this.resetFps();
        if (hadFps) this.notify();
      }
      this.lastFrame = document.hidden || this.paused ? undefined : now;
    } catch (error) {
      this.paused = true;
      this.lastFrame = undefined;
      this.resetFps();
      this.notify();
      this.options.onError?.(error);
      return;
    }
    this.frame = requestAnimationFrame(this.tick);
  };

  private readonly visibility = (): void => {
    this.lastFrame = undefined;
    this.resetFps();
    this.notify();
    if (document.hidden) this.endDrag();
  };

  private readonly contextLost = (event: Event): void => {
    event.preventDefault();
    this.paused = true;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.lastFrame = undefined;
    this.resetFps();
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
      animationBounds: { ...this.animationBounds },
      ...(this.animationDuration === undefined
        ? {}
        : { animationDuration: this.animationDuration }),
      fps: this.fps,
    });
  }
  private assertOpen(): void {
    if (this.disposed) throw new Error('预览已关闭');
  }
}
