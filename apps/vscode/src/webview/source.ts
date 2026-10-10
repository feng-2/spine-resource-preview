import type {
  HostMessage,
  ImageLease,
  ResourceFile,
  ResourceProvider,
  WebviewMessage,
} from '@spine-preview/core';
import type {
  ViewerCommand,
  ViewerPreviewState,
  ViewerSnapshot,
  ViewerSource,
} from '@spine-preview/viewer';

/** VS Code 只允许 acquireVsCodeApi 一次，由入口将消息发送能力传入来源。 */
export interface WebviewApi {
  /** 向扩展宿主发送可序列化请求。 */
  postMessage(message: WebviewMessage): void;
}

/** 单个读取请求；取消、索引替换与回复均释放超时器和监听器。 */
interface PendingRead {
  /** 读取成功。 */
  resolve(message: Extract<HostMessage, { type: 'read-result' }>): void;
  /** 读取失败或取消。 */
  reject(error: Error): void;
  /** 释放订阅与超时。 */
  cleanup(): void;
}

/** 消息中的文件仅允许稳定身份、相对路径、字节大小和可选图片 URL。 */
function validFile(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const file = value as Record<string, unknown>;
  return (
    typeof file.id === 'string' &&
    !!file.id &&
    typeof file.path === 'string' &&
    Number.isSafeInteger(file.size) &&
    Number(file.size) >= 0 &&
    (file.url === undefined || typeof file.url === 'string')
  );
}

/** 检查完整索引字段，避免异常消息将缺失的对象交给 runtime。 */
function validResult(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const result = value as Record<string, unknown>;
  if (
    result.preferredResourceId !== undefined &&
    typeof result.preferredResourceId !== 'string'
  )
    return false;
  if (!Array.isArray(result.resources) || !Array.isArray(result.diagnostics))
    return false;
  return (
    result.resources.every((item: unknown) => {
      if (!item || typeof item !== 'object') return false;
      const resource = item as Record<string, unknown>;
      return (
        typeof resource.id === 'string' &&
        typeof resource.name === 'string' &&
        ['3.7', '3.8', '4.0', '4.1', '4.2', '4.3'].includes(String(resource.version)) &&
        typeof resource.exportVersion === 'string' &&
        ['json', 'binary'].includes(String(resource.format)) &&
        validFile(resource.skeleton) &&
        validFile(resource.atlas) &&
        Array.isArray(resource.animations) &&
        resource.animations.every((name) => typeof name === 'string') &&
        Array.isArray(resource.pages) &&
        resource.pages.every((item: unknown) => {
          if (!item || typeof item !== 'object') return false;
          const page = item as Record<string, unknown>;
          return (
            typeof page.name === 'string' &&
            validFile(page.file) &&
            (page.pma === undefined || typeof page.pma === 'boolean')
          );
        })
      );
    }) &&
    result.diagnostics.every((item: unknown) => {
      if (!item || typeof item !== 'object') return false;
      const diagnostic = item as Record<string, unknown>;
      return (
        typeof diagnostic.code === 'string' &&
        typeof diagnostic.message === 'string' &&
        ['discovery', 'version', 'dependency', 'load', 'render', 'cleanup'].includes(
          String(diagnostic.stage),
        ) &&
        (diagnostic.path === undefined || typeof diagnostic.path === 'string')
      );
    })
  );
}

/** 验证宿主信封，所有读回复必须能匹配当前来源登记的请求。 */
export function parseHostMessage(value: unknown): HostMessage | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const data = value as Record<string, unknown>;
  if (
    data.type === 'read-result' &&
    typeof data.requestId === 'string' &&
    data.requestId.length > 0 &&
    [data.text, data.bytes, data.error].filter((value) => value !== undefined).length ===
      1 &&
    (data.text === undefined || typeof data.text === 'string') &&
    (data.error === undefined || typeof data.error === 'string') &&
    (data.bytes === undefined ||
      (Array.isArray(data.bytes) &&
        data.bytes.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255)))
  )
    return data as unknown as HostMessage;
  if (
    data.type === 'play-animation' &&
    typeof data.resourceId === 'string' &&
    data.resourceId.length > 0 &&
    data.resourceId.length <= 16384 &&
    typeof data.animation === 'string' &&
    data.animation.length <= 16384
  )
    return data as unknown as HostMessage;
  if (!Number.isSafeInteger(data.revision) || Number(data.revision) < 0) return undefined;
  if (
    data.type === 'status' &&
    typeof data.loading === 'boolean' &&
    typeof data.message === 'string'
  )
    return data as unknown as HostMessage;
  if (
    data.type === 'snapshot' &&
    typeof data.label === 'string' &&
    Array.isArray(data.files) &&
    data.files.every(validFile) &&
    validResult(data.result)
  ) {
    return data as unknown as HostMessage;
  }
  return undefined;
}

/** 从 VS Code Explorer 标准 URI 列表或资源数组同步提取 URI，不猜测浏览器 File.path。 */
export function readDroppedUris(transfer: Pick<DataTransfer, 'getData'>): string[] {
  const standard = transfer
    .getData('text/uri-list')
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
  if (standard.length) return [...new Set(standard)];
  for (const type of ['ResourceURLs', 'application/vnd.code.tree.file']) {
    const value = transfer.getData(type);
    if (!value) continue;
    try {
      const data: unknown = JSON.parse(value);
      if (Array.isArray(data) && data.every((uri) => typeof uri === 'string'))
        return [...new Set(data)];
    } catch {
      /* 无法解析的非资源拖放交给明确说明，不执行任意文本。 */
    }
  }
  return [];
}

/** 共用 viewer 的编辑器来源；JSON/skel 走按需消息，图片走受限本地 URI。 */
export class EditorSource implements ViewerSource {
  /** VS Code 原生侧栏负责资源和动画导航。 */
  readonly externalNavigation = true;
  private snapshot: ViewerSnapshot = {
    revision: 0,
    label: 'VS Code local resources',
    provider: null,
    result: { resources: [], diagnostics: [] },
    loading: false,
    message: 'Choose resource files or a folder.',
  };
  private readonly listeners = new Set<(snapshot: ViewerSnapshot) => void>();
  private readonly commandListeners = new Set<(command: ViewerCommand) => void>();
  private queuedCommand: ViewerCommand | undefined;
  private readonly pending = new Map<string, PendingRead>();
  private requestSequence = 0;
  private disposed = false;

  /** 消息通道通过入口注入，便于在无 VS Code 的测试中验证状态。 */
  constructor(private readonly api: WebviewApi) {}

  /** 入口完成监听后再通知宿主发送当前索引。 */
  ready(): void {
    this.api.postMessage({ type: 'ready' });
  }
  /** 订阅时立即回放，移除时不影响其他 React 观察者。 */
  subscribe(listener: (snapshot: ViewerSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }
  /** 挂载前收到的最后一次播放请求在订阅时回放，避免 ready 时序丢失动作。 */
  subscribeCommands(listener: (command: ViewerCommand) => void): () => void {
    if (this.disposed) return () => {};
    this.commandListeners.add(listener);
    if (this.queuedCommand) {
      listener(this.queuedCommand);
      this.queuedCommand = undefined;
    }
    return () => this.commandListeners.delete(listener);
  }
  /** 仅反馈当前代际的资源状态，过期实例无法覆盖原生树选择。 */
  reportPreviewState(state: ViewerPreviewState): void {
    if (
      this.disposed ||
      state.revision !== this.snapshot.revision ||
      !this.snapshot.result.resources.some((resource) => resource.id === state.resourceId)
    )
      return;
    this.api.postMessage({ type: 'preview-state', ...state });
  }
  /** 刷新命令由宿主执行，旧读取在新代际到达时取消。 */
  async refresh(): Promise<void> {
    this.api.postMessage({ type: 'refresh' });
  }
  /** 使用 VS Code 原生文件选择，不依赖 Webview file input。 */
  async chooseFiles(): Promise<void> {
    this.api.postMessage({ type: 'choose-files' });
  }
  /** 使用 VS Code 原生文件夹选择。 */
  async chooseFolder(): Promise<void> {
    this.api.postMessage({ type: 'choose-folder' });
  }
  /** drop 事件回调内立即提取 URI；不支持的拖放给出可重试说明。 */
  async drop(transfer: DataTransfer): Promise<void> {
    const uris = readDroppedUris(transfer);
    if (uris.length) this.api.postMessage({ type: 'drop', uris });
    else
      this.publish({
        ...this.snapshot,
        message:
          'This drop contains no editor URI. Use the context menu or Choose files / Choose folder.',
      });
  }

  /** 处理宿主消息，忽略过期索引、状态和无法匹配的读取回复。 */
  receive(value: unknown): void {
    if (this.disposed) return;
    const message = parseHostMessage(value);
    if (!message) return;
    if (message.type === 'read-result') {
      const pending = this.pending.get(message.requestId);
      if (!pending) return;
      this.pending.delete(message.requestId);
      pending.cleanup();
      if (message.error) pending.reject(new Error(message.error));
      else pending.resolve(message);
      return;
    }
    if (message.type === 'play-animation') {
      if (
        !this.snapshot.result.resources.some(
          (resource) => resource.id === message.resourceId,
        )
      )
        return;
      if (!this.commandListeners.size) this.queuedCommand = message;
      else for (const listener of this.commandListeners) listener(message);
      return;
    }
    if (message.revision < this.snapshot.revision) return;
    if (message.revision > this.snapshot.revision) {
      this.queuedCommand = undefined;
      this.cancelReads('资源来源已替换');
    }
    if (message.type === 'status') {
      const replaced = message.revision > this.snapshot.revision;
      this.publish({
        ...this.snapshot,
        revision: message.revision,
        loading: message.loading,
        message: message.message,
        ...(replaced
          ? { provider: null, result: { resources: [], diagnostics: [] } }
          : {}),
      });
    } else {
      const provider = this.providerFor(message.files, message.revision);
      this.publish({
        revision: message.revision,
        label: message.label,
        provider,
        result: message.result,
        loading: false,
        message: message.result.resources.length
          ? `Found ${message.result.resources.length} resources.`
          : 'No previewable resources found. Check diagnostics or import again.',
      });
    }
  }

  private providerFor(
    files: readonly ResourceFile[],
    revision: number,
  ): ResourceProvider {
    const known = new Map(files.map((file) => [file.id, file]));
    const request = async (
      file: ResourceFile,
      format: 'text' | 'bytes',
      signal?: AbortSignal,
    ): Promise<Extract<HostMessage, { type: 'read-result' }>> => {
      if (this.disposed || revision !== this.snapshot.revision || signal?.aborted)
        throw new DOMException('资源读取已取消或过期', 'AbortError');
      if (!known.has(file.id)) throw new Error('文件未包含在当前资源索引中');
      const requestId = `${revision}:${++this.requestSequence}`;
      return new Promise((resolve, reject) => {
        const finish = (error: Error): void => {
          const pending = this.pending.get(requestId);
          if (!pending) return;
          this.pending.delete(requestId);
          pending.cleanup();
          reject(error);
        };
        const abort = (): void => finish(new DOMException('读取已取消', 'AbortError'));
        const timeout = setTimeout(
          () => finish(new Error('宿主读取超时，请刷新资源重试')),
          30000,
        );
        this.pending.set(requestId, {
          resolve,
          reject,
          cleanup: () => {
            clearTimeout(timeout);
            signal?.removeEventListener('abort', abort);
          },
        });
        signal?.addEventListener('abort', abort, { once: true });
        this.api.postMessage({ type: 'read', requestId, fileId: file.id, format });
      });
    };
    return {
      files,
      readText: async (file, signal) => {
        const reply = await request(file, 'text', signal);
        if (reply.text === undefined) throw new Error('宿主未返回文本内容');
        return reply.text;
      },
      readBytes: async (file, signal) => {
        const reply = await request(file, 'bytes', signal);
        if (!reply.bytes) throw new Error('宿主未返回二进制内容');
        return new Uint8Array(reply.bytes);
      },
      imageUrl: async (file, signal): Promise<ImageLease> => {
        if (this.disposed || revision !== this.snapshot.revision || signal?.aborted)
          throw new DOMException('图片来源已过期', 'AbortError');
        const authorized = known.get(file.id);
        if (!authorized?.url) throw new Error('图片缺少宿主授权的本地 URL');
        return {
          url: authorized.url,
          release() {
            /* 宿主 URI 由面板范围管理，不创建 Blob。 */
          },
        };
      },
    };
  }

  private publish(snapshot: ViewerSnapshot): void {
    this.snapshot = snapshot;
    for (const listener of this.listeners) listener(snapshot);
  }
  private cancelReads(message: string): void {
    for (const pending of this.pending.values()) {
      pending.cleanup();
      pending.reject(new DOMException(message, 'AbortError'));
    }
    this.pending.clear();
  }
  /** 页面退出先拒绝未完成读取，再清除订阅；renderer 由 React 卸载释放。 */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.cancelReads('预览页面已关闭');
    this.listeners.clear();
    this.commandListeners.clear();
    this.queuedCommand = undefined;
  }
}
