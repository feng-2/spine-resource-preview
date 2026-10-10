/** 公开版本隔离的运行时契约及 UI 控制器类型。 */
export type {
  RuntimeAdapter,
  RuntimeLoadOptions,
  RuntimeSession,
  CameraState,
  PoseBounds,
  PreviewController,
  PreviewOptions,
  PreviewState,
} from './types.js';
/** 公开显式版本路由。 */
export { loadRuntime } from './registry.js';
/** 公开共用秒时钟、输入和相机控制器。 */
export { createPreviewController } from './preview.js';
