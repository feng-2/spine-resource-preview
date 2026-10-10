import type { ResourceProvider, SpineResource } from '@spine-preview/core';
import type { PreviewController, PreviewOptions } from '@spine-preview/runtimes';

/** 隔离可注入的画布创建入口，便于验证并发切换和关闭。 */
export type PreviewFactory = (
  host: HTMLElement,
  resource: SpineResource,
  provider: ResourceProvider,
  options: PreviewOptions,
) => Promise<PreviewController>;

/** 一次选择的独占目标与状态通知。 */
export interface PreviewTarget {
  /** 控制器独占的容器。 */
  host: HTMLElement;
  /** 当前选择的完整资源。 */
  resource: SpineResource;
  /** 资源所属来源。 */
  provider: ResourceProvider;
  /** 画布状态通知。 */
  options: PreviewOptions;
  /** 当前代际创建成功后回调。 */
  ready(controller: PreviewController): void;
  /** 当前代际失败后回调。 */
  failed(error: unknown): void;
}

/** 串行管理独占画布；过期实例只清理自身，不能向新选择发出通知。 */
export class PreviewLifecycle {
  private generation = 0;
  private abort: AbortController | undefined;
  private active: PreviewController | undefined;
  private queue: Promise<void> = Promise.resolve();

  /** 工厂只在前一实例完整释放后执行。 */
  constructor(private readonly factory: PreviewFactory) {}

  /** 替换选择；空目标用于卸载，后续仍可再次启动以适配 StrictMode。 */
  replace(target: PreviewTarget | null): Promise<void> {
    const generation = ++this.generation;
    this.abort?.abort();
    const abort = new AbortController();
    this.abort = abort;
    const current = () => generation === this.generation && !abort.signal.aborted;
    const run = async () => {
      const previous = this.active;
      if (previous) {
        // 清理失败时保留所有权，后续替换会重试，不能创建第二个独占实例。
        await previous.dispose();
        this.active = undefined;
      }
      if (!target || !current()) return;
      const controller = await this.factory(
        target.host,
        target.resource,
        target.provider,
        {
          ...target.options,
          signal: abort.signal,
          onChange: (state) => {
            if (current()) target.options.onChange?.(state);
          },
          onError: (error) => {
            if (current()) target.options.onError?.(error);
          },
        },
      );
      this.active = controller;
      if (!current()) {
        await controller.dispose();
        this.active = undefined;
        return;
      }
      target.ready(controller);
    };
    this.queue = this.queue.then(run).catch((error: unknown) => {
      if (target && current()) target.failed(error);
      else if (this.active) console.error('过期预览实例清理失败', error);
    });
    return this.queue;
  }
}
