/** 在异步边界检查取消，取消时使用标准 AbortError，避免误报为损坏资源。 */
export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('资源操作已取消', 'AbortError');
}

/** 包装可能不响应取消的宿主读取；晚到结果和错误不再影响已经取消的调用。 */
export function abortable<T>(
  operation: () => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  throwIfAborted(signal);
  if (!signal) return operation();
  return new Promise<T>((resolve, reject) => {
    const cancel = (): void => {
      signal.removeEventListener('abort', cancel);
      reject(new DOMException('资源操作已取消', 'AbortError'));
    };
    signal.addEventListener('abort', cancel, { once: true });
    // 同步抛错和异步拒绝统一进入清理路径，取消后的迟到拒绝也始终有处理者。
    Promise.resolve()
      .then(() => {
        throwIfAborted(signal);
        return operation();
      })
      .then(
        (value) => {
          signal.removeEventListener('abort', cancel);
          if (signal.aborted) cancel();
          else resolve(value);
        },
        (error: unknown) => {
          signal.removeEventListener('abort', cancel);
          reject(error);
        },
      );
  });
}

/** 一次替换任务的代际令牌；只有当前且未取消的任务可以提交界面状态。 */
export interface OperationToken {
  /** 单调递增的本地任务身份。 */
  revision: number;
  /** 本任务的取消信号。 */
  signal: AbortSignal;
  /** 在写入界面或播放状态前检查当前任务是否仍有效。 */
  isCurrent(): boolean;
}

/** 取消旧索引或预览操作并防止迟到任务覆盖新状态；资源清理由任务自身负责。 */
export class OperationGate {
  /** 已创建任务的单调序号。 */
  private revision = 0;
  /** 只持有当前任务的取消控制器。 */
  private controller: AbortController | undefined;

  /** 建立新任务并同步取消上一个任务。 */
  begin(): OperationToken {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    const revision = ++this.revision;
    return {
      revision,
      signal: controller.signal,
      isCurrent: () => this.revision === revision && !controller.signal.aborted,
    };
  }

  /** 关闭当前任务；重复关闭不会产生额外状态变化。 */
  cancel(): void {
    this.controller?.abort();
  }
}
