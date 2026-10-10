import type { HostMessage, WebviewMessage } from '@spine-preview/core';
import type { HostProvider } from './scanner.js';

/** 验证 Webview 输入，拒绝未知消息以及无限制的文件读取请求。 */
export function parseWebviewMessage(value: unknown): WebviewMessage | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const data = value as Record<string, unknown>;
  if (['ready', 'refresh', 'choose-files', 'choose-folder'].includes(String(data.type)))
    return { type: data.type as 'ready' | 'refresh' | 'choose-files' | 'choose-folder' };
  if (
    data.type === 'preview-state' &&
    Number.isSafeInteger(data.revision) &&
    Number(data.revision) >= 0 &&
    typeof data.resourceId === 'string' &&
    data.resourceId.length <= 16384 &&
    Array.isArray(data.animations) &&
    data.animations.length <= 10000 &&
    data.animations.every((name) => typeof name === 'string' && name.length <= 16384) &&
    (data.animation === undefined ||
      (typeof data.animation === 'string' && data.animation.length <= 16384)) &&
    (data.error === undefined ||
      (typeof data.error === 'string' && data.error.length <= 65536))
  )
    return {
      type: 'preview-state',
      revision: Number(data.revision),
      resourceId: data.resourceId,
      animations: data.animations as string[],
      ...(typeof data.animation === 'string' ? { animation: data.animation } : {}),
      ...(typeof data.error === 'string' ? { error: data.error } : {}),
    };
  if (
    data.type === 'read' &&
    typeof data.requestId === 'string' &&
    data.requestId.length <= 128 &&
    typeof data.fileId === 'string' &&
    data.fileId.length <= 16384 &&
    (data.format === 'text' || data.format === 'bytes')
  )
    return {
      type: 'read',
      requestId: data.requestId,
      fileId: data.fileId,
      format: data.format,
    };
  if (
    data.type === 'drop' &&
    Array.isArray(data.uris) &&
    data.uris.length > 0 &&
    data.uris.length <= 128 &&
    data.uris.every((uri) => typeof uri === 'string' && uri.length <= 16384)
  )
    return { type: 'drop', uris: data.uris as string[] };
  return undefined;
}

/** 按请求代际读取当前 provider 的授权文件；不允许图片字节穿过消息桥。 */
export async function handleRead(
  message: Extract<WebviewMessage, { type: 'read' }>,
  provider: HostProvider | undefined,
  revision: number,
  signal?: AbortSignal,
): Promise<Extract<HostMessage, { type: 'read-result' }>> {
  const response = { type: 'read-result' as const, requestId: message.requestId };
  if (!message.requestId.startsWith(`${revision}:`))
    return { ...response, error: '读取请求已过期，请使用当前资源索引' };
  const file = provider?.get(message.fileId);
  if (!file || !provider) return { ...response, error: '文件不属于当前资源索引' };
  if (!/\.(json|skel|atlas)$/iu.test(file.path))
    return { ...response, error: '图片通过本地 URL 加载，不通过消息桥读取' };
  try {
    if (message.format === 'text')
      return { ...response, text: await provider.readText(file, signal) };
    return { ...response, bytes: [...(await provider.readBytes(file, signal))] };
  } catch (error) {
    return { ...response, error: error instanceof Error ? error.message : String(error) };
  }
}
