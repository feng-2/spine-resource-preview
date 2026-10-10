import type { DiscoveryResult, ResourceProvider } from '@spine-preview/core';

/** 来源当前状态，递增代际防止旧资源结果覆盖新状态。 */
export interface ViewerSnapshot {
  /** 当前导入代际。 */
  revision: number;
  /** 目标说明。 */
  label: string;
  /** 本次来源，空状态没有来源。 */
  provider: ResourceProvider | null;
  /** 当前资源发现结果。 */
  result: DiscoveryResult;
  /** 是否正在扫描。 */
  loading: boolean;
  /** 可直接展示的状态说明。 */
  message: string;
}

/** Web 和编辑器分别提供导入与扫描，React 共用同一接口。 */
export interface ViewerSource {
  /** 订阅时立即回放当前快照，返回移除函数。 */
  subscribe(listener: (snapshot: ViewerSnapshot) => void): () => void;
  /** 重新扫描当前来源。 */
  refresh?(): Promise<void>;
  /** 请求选择文件。 */
  chooseFiles?(): Promise<void>;
  /** 请求选择文件夹。 */
  chooseFolder?(): Promise<void>;
  /** drop 事件期间立即提取条目，异步完成导入。 */
  drop?(transfer: DataTransfer): Promise<void>;
}

/** 预览界面只依赖可观察资源来源。 */
export interface ViewerProps {
  /** 具体端的来源实现。 */
  source: ViewerSource;
}
