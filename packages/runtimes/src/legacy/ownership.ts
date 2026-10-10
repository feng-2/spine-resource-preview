/** 会话独占资源的清理栈；单项失败不阻止其他项释放，失败项可重试。 */
export class LegacyOwnership {
  private readonly entries = new Set<() => void>();

  /** 登记一个对象的释放责任，按登记的逆序关闭。 */
  add(cleanup: () => void): void {
    this.entries.add(cleanup);
  }

  /** 释放全部登记项，并保留尚未成功的责任以便再次调用。 */
  dispose(): void {
    const errors: unknown[] = [];
    for (const cleanup of [...this.entries].reverse()) {
      try {
        cleanup();
        this.entries.delete(cleanup);
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length) throw new AggregateError(errors, '旧版 Spine 资源清理失败');
  }
}
