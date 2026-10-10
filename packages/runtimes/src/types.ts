import type { ResourceProvider, SpineResource, SpineVersion } from '@spine-preview/core';

/** 骨骼世界坐标下的有效姿态范围。 */
export interface PoseBounds {
  /** 左边界。 */
  x: number;
  /** 下边界，Spine 使用纵轴向上。 */
  y: number;
  /** 宽度。 */
  width: number;
  /** 高度。 */
  height: number;
}

/** 渲染用逻辑相机，不包含设备像素比。 */
export interface CameraState {
  /** 逻辑画布宽度。 */
  width: number;
  /** 逻辑画布高度。 */
  height: number;
  /** 每个骨骼单位的逻辑像素数，1 代表100%。 */
  zoom: number;
  /** 骨骼世界中心横坐标。 */
  centerX: number;
  /** 骨骼世界中心纵坐标。 */
  centerY: number;
}

/** 由某一官方 runtime 建立的独立播放与渲染实例，不自动注册 ticker。 */
export interface RuntimeSession {
  /** 实际运行时版本。 */
  readonly version: SpineVersion;
  /** 原始动画名。 */
  readonly animations: readonly string[];
  /** 原始皮肤名。 */
  readonly skins: readonly string[];
  /** 恢复初始姿态并从头切换动作。 */
  play(name: string, loop: boolean): void;
  /** 切换原始皮肤。 */
  setSkin(name: string): void;
  /** 使用秒单位推进姿态。 */
  update(seconds: number): void;
  /** 按相机设置 viewport 并透明清屏绘制，不推进时间。 */
  render(camera: CameraState): void;
  /** 当前姿态边界。 */
  getBounds(): PoseBounds;
  /** 释放所有 GPU 对象、纹理和图片地址，可重复调用。 */
  dispose(): void | Promise<void>;
}

/** 创建 runtime 的输入及取消约束。 */
export interface RuntimeLoadOptions {
  /** 本次实例独占的画布。 */
  canvas: HTMLCanvasElement;
  /** 已验证的骨骼与依赖。 */
  resource: SpineResource;
  /** 按需读取接口。 */
  provider: ResourceProvider;
  /** 取消本次准备。 */
  signal?: AbortSignal;
}

/** 同版本官方运行时入口。 */
export interface RuntimeAdapter {
  /** 唯一主、次版本。 */
  readonly version: SpineVersion;
  /** 创建独立会话，失败必须清理已经建立的部分资源。 */
  load(options: RuntimeLoadOptions): Promise<RuntimeSession>;
}

/** UI 可观察的相机和播放状态。 */
export interface PreviewState {
  /** 当前缩放。 */
  zoom: number;
  /** 是否处于适应画布状态。 */
  fitted: boolean;
  /** 是否暂停。 */
  paused: boolean;
}

/** 共用预览控制器，独占会话、DOM 监听和动画更新。 */
export interface PreviewController {
  /** 原始动画名。 */
  readonly animations: readonly string[];
  /** 原始皮肤名。 */
  readonly skins: readonly string[];
  /** 实际版本。 */
  readonly version: SpineVersion;
  /** 播放并恢复更新。 */
  play(name: string, loop: boolean): void;
  /** 暂停或恢复。 */
  setPaused(paused: boolean): void;
  /** 设置非负速度。 */
  setSpeed(speed: number): void;
  /** 用户直接缩放并退出 fit。 */
  setZoom(zoom: number): void;
  /** 适应画布和100%居中之间切换。 */
  toggleFit(): void;
  /** 关闭实例并等待独占会话释放。 */
  dispose(): Promise<void>;
}

/** 准备控制器期间的取消和状态通知。 */
export interface PreviewOptions {
  /** 取消标识。 */
  signal?: AbortSignal;
  /** 状态变化，仅在 UI 可观察状态变化时触发。 */
  onChange?: (state: PreviewState) => void;
  /** 帧更新错误通知，发生后暂停。 */
  onError?: (error: unknown) => void;
}
