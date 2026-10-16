import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResourceProvider, SpineResource } from '@spine-preview/core';
import type { CameraState, PreviewState, RuntimeSession } from '../src/types.js';

const mock = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('../src/registry.js', () => ({ loadRuntime: mock.load }));
import { createPreviewController } from '../src/preview.js';

/** 无 DOM 渲染依赖的画布桩，测试真实控制器的时钟与所有权。 */
class Canvas extends EventTarget {
  style = { cssText: '', cursor: '' };
  width = 0;
  height = 0;
  removed = false;
  setAttribute(): void {}
  remove(): void {
    this.removed = true;
  }
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 800, height: 600 };
  }
  hasPointerCapture(): boolean {
    return false;
  }
  releasePointerCapture(): void {}
  getContext() {
    return null;
  }
}

const resource: SpineResource = {
  id: 'hero',
  name: 'hero',
  version: '4.2',
  exportVersion: '4.2.22',
  format: 'json',
  skeleton: { id: 'json', path: 'hero.json', size: 1 },
  atlas: { id: 'atlas', path: 'hero.atlas', size: 1 },
  pages: [],
  animations: ['idle'],
};
const provider = {} as ResourceProvider;
let canvas: Canvas;
let frames: Map<number, FrameRequestCallback>;
let session: RuntimeSession;
let states: PreviewState[];
let rendered: CameraState[];
let documentState: EventTarget & { hidden: boolean; createElement(): Canvas };
const host = {
  clientWidth: 800,
  clientHeight: 600,
  append: vi.fn(),
} as unknown as HTMLElement;

beforeEach(() => {
  canvas = new Canvas();
  states = [];
  rendered = [];
  frames = new Map();
  let sequence = 0;
  documentState = Object.assign(new EventTarget(), {
    hidden: false,
    createElement: () => canvas,
  });
  vi.stubGlobal('document', documentState);
  vi.stubGlobal('window', { devicePixelRatio: 1 });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = ++sequence;
    frames.set(id, callback);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe(): void {}
      disconnect(): void {}
    },
  );
  session = {
    version: '4.2',
    animations: ['idle'],
    skins: ['default'],
    play: vi.fn(),
    setSkin: vi.fn(),
    update: vi.fn(),
    getBounds: () => ({ x: 10, y: 20, width: 100, height: 200 }),
    render: (camera) => rendered.push({ ...camera }),
    dispose: vi.fn(),
  };
  mock.load.mockReset().mockResolvedValue(session);
});
afterEach(() => vi.unstubAllGlobals());

function step(time: number): void {
  const first = [...frames.entries()][0];
  if (!first) throw new Error('缺少下一帧');
  frames.delete(first[0]);
  first[1](time);
}

describe('真实预览控制器', () => {
  it('超过画布的资源自动适应，按钮状态与实际缩放一致', async () => {
    session.getBounds = () => ({ x: -10, y: 5, width: 1000, height: 1200 });
    const preview = await createPreviewController(host, resource, provider, {
      onChange: (state) => states.push(state),
    });
    expect(states.at(-1)).toMatchObject({ fitted: true });
    expect(states.at(-1)?.zoom).toBeCloseTo(0.42);
    preview.toggleFit();
    expect(states.at(-1)).toMatchObject({ zoom: 1, fitted: false });
    await preview.dispose();
  });

  it('刚好放得下的资源维持原尺寸，超大资源不被最低5%限制阻止适应', async () => {
    session.getBounds = () => ({ x: 0, y: 0, width: 800, height: 600 });
    const exact = await createPreviewController(host, resource, provider, {
      onChange: (state) => states.push(state),
    });
    expect(states.at(-1)).toMatchObject({ zoom: 1, fitted: false });
    await exact.dispose();
    session.getBounds = () => ({ x: 0, y: 0, width: 800_000, height: 600_000 });
    const large = await createPreviewController(host, resource, provider, {
      onChange: (state) => states.push(state),
    });
    expect(states.at(-1)?.zoom).toBeCloseTo(0.00084, 6);
    expect(states.at(-1)?.fitted).toBe(true);
    await large.dispose();
  });

  it('初始100%居中，fit恢复100%，手动缩放退出fit', async () => {
    const preview = await createPreviewController(host, resource, provider, {
      onChange: (state) => states.push(state),
    });
    expect(session.play).toHaveBeenCalledWith('idle', true);
    expect(states.at(-1)).toMatchObject({ zoom: 1, fitted: false, paused: false });
    step(1000);
    expect(rendered[0]).toMatchObject({ centerX: 60, centerY: 120, zoom: 1 });
    preview.toggleFit();
    expect(states.at(-1)?.zoom).toBeCloseTo(2.52);
    preview.toggleFit();
    expect(states.at(-1)).toMatchObject({ zoom: 1, fitted: false });
    preview.toggleFit();
    preview.setZoom(0.5);
    expect(states.at(-1)).toMatchObject({ zoom: 0.5, fitted: false });
    await preview.dispose();
  });

  it('暂停和后台恢复不累计巨大时间差，长帧按秒限幅', async () => {
    const preview = await createPreviewController(host, resource, provider);
    step(1000);
    step(2000);
    expect(session.update).toHaveBeenLastCalledWith(0.1);
    preview.setPaused(true);
    step(20_000);
    preview.setPaused(false);
    step(30_000);
    expect(vi.mocked(session.update).mock.calls).toHaveLength(2);
    documentState.hidden = true;
    step(40_000);
    documentState.hidden = false;
    step(50_000);
    expect(vi.mocked(session.update).mock.calls).toHaveLength(2);
    preview.setSpeed(2);
    step(50_100);
    expect(session.update).toHaveBeenLastCalledWith(0.2);
    await preview.dispose();
  });

  it('动画尺寸在播放和相机变化时保持固定，FPS 独立采样并排除后台时间', async () => {
    session = { ...session, animations: ['idle', 'run'] };
    session.getAnimationDuration = (name) => ({ idle: 2.5, run: 0.75 })[name];
    session.getAnimationBounds = (name) =>
      name === 'idle'
        ? { x: 10, y: 20, width: 100, height: 200 }
        : { x: -5, y: 0, width: 300, height: 80 };
    mock.load.mockResolvedValue(session);
    const preview = await createPreviewController(host, resource, provider, {
      onChange: (state) => states.push(state),
    });
    expect(states.at(-1)).toMatchObject({
      animationBounds: { width: 100, height: 200 },
      animationDuration: 2.5,
      fps: 0,
    });
    step(0);
    for (let index = 1; index <= 4; index += 1) step(index * 50);
    expect(states).toHaveLength(1);
    session.getBounds = () => ({ x: 3, y: 5, width: 120, height: 220 });
    step(250);
    expect(states).toHaveLength(2);
    expect(states.at(-1)).toMatchObject({
      animationBounds: { x: 10, y: 20, width: 100, height: 200 },
      fps: 20,
    });
    preview.toggleFit();
    preview.setZoom(0.5);
    expect(states.at(-1)?.animationBounds).toEqual({
      x: 10,
      y: 20,
      width: 100,
      height: 200,
    });
    documentState.hidden = true;
    documentState.dispatchEvent(new Event('visibilitychange'));
    expect(states.at(-1)?.fps).toBe(0);
    step(20_000);
    documentState.hidden = false;
    documentState.dispatchEvent(new Event('visibilitychange'));
    step(30_000);
    step(30_250);
    expect(states.at(-1)?.fps).toBe(4);
    preview.setSpeed(2);
    preview.play('run', true);
    expect(states.at(-1)).toMatchObject({
      animationDuration: 0.75,
      animationBounds: { x: -5, y: 0, width: 300, height: 80 },
      fps: 0,
    });
    preview.play('run', false);
    preview.setPaused(true);
    preview.toggleFit();
    expect(states.at(-1)?.animationBounds).toEqual({
      x: -5,
      y: 0,
      width: 300,
      height: 80,
    });
    const count = states.length;
    await preview.dispose();
    documentState.dispatchEvent(new Event('visibilitychange'));
    expect(states).toHaveLength(count);
    expect(frames.size).toBe(0);
  });

  it('整数 FPS 未变化时不重复通知，帧率下降后仍及时发布', async () => {
    const preview = await createPreviewController(host, resource, provider, {
      onChange: (state) => states.push(state),
    });
    step(0);
    for (let frame = 1; frame <= 75; frame++) step(frame * 10 + (frame > 50 ? 0.4 : 0));
    // 三个采样窗口都显示 100 FPS，包括不影响显示值的时间抖动。
    expect(states.map((state) => Math.round(state.fps ?? 0))).toEqual([0, 100]);
    for (let frame = 1; frame <= 15; frame++) step(750.4 + frame * 20);
    expect(states.map((state) => Math.round(state.fps ?? 0))).toEqual([0, 100, 50]);
    expect(rendered).toHaveLength(91);
    await preview.dispose();
  });

  it('无动画或兼容会话的尺寸不会随每帧姿态改变', async () => {
    session = { ...session, animations: [] };
    mock.load.mockResolvedValue(session);
    const preview = await createPreviewController(host, resource, provider, {
      onChange: (state) => states.push(state),
    });
    session.getBounds = () => ({ x: 0, y: 0, width: 10, height: 20 });
    step(0);
    step(250);
    preview.toggleFit();
    expect(states.at(-1)?.animationBounds).toEqual({
      x: 10,
      y: 20,
      width: 100,
      height: 200,
    });
    expect(states.at(-1)?.animationDuration).toBeUndefined();
    await preview.dispose();
  });

  it('绘制故障后 FPS 归零，通知保留最后有效边界且不再读取已失效上下文', async () => {
    const onError = vi.fn();
    const preview = await createPreviewController(host, resource, provider, {
      onChange: (state) => states.push(state),
      onError,
    });
    step(0);
    step(250);
    expect(states.at(-1)?.fps).toBe(4);
    session.render = () => {
      throw new Error('绘制失败');
    };
    session.getBounds = () => {
      throw new Error('上下文不可访问');
    };
    step(500);
    expect(states.at(-1)).toMatchObject({
      paused: true,
      fps: 0,
      animationBounds: { width: 100, height: 200 },
    });
    expect(onError).toHaveBeenCalledOnce();
    expect(frames.size).toBe(0);
    await preview.dispose();
  });

  it('释放失败仍移除画布，后续可重试，成功后幂等', async () => {
    vi.mocked(session.dispose)
      .mockRejectedValueOnce(new Error('首次释放失败'))
      .mockResolvedValue(undefined);
    const preview = await createPreviewController(host, resource, provider);
    await expect(preview.dispose()).rejects.toThrow('首次释放失败');
    expect(canvas.removed).toBe(true);
    expect(frames.size).toBe(0);
    await preview.dispose();
    await preview.dispose();
    expect(session.dispose).toHaveBeenCalledTimes(2);
  });

  it('准备和清理同时失败也移除画布并保留原始错误', async () => {
    vi.mocked(session.play).mockImplementation(() => {
      throw new Error('骨骼动作失败');
    });
    vi.mocked(session.dispose).mockRejectedValue(new Error('资源释放失败'));
    await expect(createPreviewController(host, resource, provider)).rejects.toMatchObject(
      {
        errors: [
          expect.objectContaining({ message: '骨骼动作失败' }),
          expect.objectContaining({ message: '资源释放失败' }),
        ],
      },
    );
    expect(canvas.removed).toBe(true);
  });
});
