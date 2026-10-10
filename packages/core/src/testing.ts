import type { ImageLease, ResourceFile, ResourceProvider } from './types.js';
import { abortable, throwIfAborted } from './cancellation.js';
import { normalizeResourcePath } from './paths.js';

/** 不依赖磁盘或浏览器 File 的测试输入，适合受控来源与错误验证。 */
export interface MemoryResourceInput {
  /** 来源根目录内相对路径。 */
  path: string;
  /** 可选稳定身份，默认使用相对路径。 */
  id?: string;
  /** 文本内容。 */
  text?: string;
  /** 二进制内容，不与文本内容同时设置。 */
  bytes?: Uint8Array;
  /** 测试或示例中可访问的图片地址。 */
  imageUrl?: string;
}

/** 内存来源的枚举范围与受控读取行为，不隐式访问网络。 */
export interface MemoryProviderOptions {
  /** 只枚举这些路径，其余文件仍允许按依赖路径 resolve。 */
  listedPaths?: readonly string[];
  /** 读取前的受控延迟或异常，可模拟不支持取消的晚到失败。 */
  beforeRead?: (
    file: ResourceFile,
    kind: 'text' | 'bytes' | 'image',
    signal?: AbortSignal,
  ) => Promise<void>;
  /** 图片地址释放前的受控异常，失败后允许重试。 */
  releaseImage?: (file: ResourceFile) => void;
}

/** 创建零图片预加载的内存 provider，可注入迟到读取失败与释放失败用于生命周期测试。 */
export function createMemoryProvider(
  inputs: readonly MemoryResourceInput[],
  options: MemoryProviderOptions = {},
): ResourceProvider {
  const entries = inputs.map((input) => {
    if (input.bytes !== undefined && input.text !== undefined)
      throw new Error(`内存文件「${input.path}」不能同时设置文本和二进制内容`);
    const path = normalizeResourcePath(input.path);
    const bytes = input.bytes ?? new TextEncoder().encode(input.text ?? '');
    const file: ResourceFile = { id: input.id ?? path, path, size: bytes.byteLength };
    return { input, bytes, file };
  });
  const entryFor = (file: ResourceFile) => {
    const entry = entries.find(
      (entry) => entry.file.id === file.id && entry.file.path === file.path,
    );
    if (!entry) throw new Error(`内存来源不存在文件「${file.path}」`);
    return entry;
  };
  const before = async (
    file: ResourceFile,
    kind: 'text' | 'bytes' | 'image',
    signal?: AbortSignal,
  ): Promise<void> => {
    throwIfAborted(signal);
    if (options.beforeRead)
      await abortable(() => options.beforeRead!(file, kind, signal), signal);
    throwIfAborted(signal);
  };
  return {
    files: entries
      .filter(
        (entry) => !options.listedPaths || options.listedPaths.includes(entry.file.path),
      )
      .map((entry) => entry.file),
    async readText(file, signal) {
      await before(file, 'text', signal);
      return new TextDecoder().decode(entryFor(file).bytes);
    },
    async readBytes(file, signal) {
      await before(file, 'bytes', signal);
      return entryFor(file).bytes.slice();
    },
    async imageUrl(file, signal): Promise<ImageLease> {
      await before(file, 'image', signal);
      const url = entryFor(file).input.imageUrl;
      if (!url) throw new Error(`内存来源未配置「${file.path}」的图片地址`);
      let released = false;
      return {
        url,
        release() {
          if (released) return;
          // 只有完整释放成功才标记关闭，受控失败可以安全重试。
          options.releaseImage?.(file);
          released = true;
        },
      };
    },
    async resolve(path, signal) {
      throwIfAborted(signal);
      return entries.find((entry) => entry.file.path === normalizeResourcePath(path))
        ?.file;
    },
  };
}
