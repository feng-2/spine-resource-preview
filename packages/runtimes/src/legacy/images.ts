import type { ImageLease, SpineResource } from '@spine-preview/core';
import type { RuntimeLoadOptions } from '../types.js';

/** 一页已解码图片及其独立上传策略。 */
export interface LegacyImagePage {
  /** atlas 原始页名，用于官方解析器的严格查找。 */
  name: string;
  /** 本次载入持有的图片对象。 */
  image: HTMLImageElement;
  /** 图片字节已经预乘，无需 WebGL 再预乘。 */
  pma: boolean;
  /** atlas 要求生成 mipmaps。 */
  mipmaps: boolean;
}

/** atlas 文本在旧解析器中的页元数据适配结果，不转换骨骼数据。 */
export interface LegacyAtlasSettings {
  /** 删除旧官方解析器不识别的 pma 页声明，其含义保留在独立策略中。 */
  text: string;
  /** 按 atlas 原始页名索引的上传策略。 */
  pages: Map<
    string,
    { /** 已预乘输入。 */ pma: boolean; /** 需要 mipmaps。 */ mipmaps: boolean }
  >;
}

/** 提取旧 atlas 页上传策略，明确页声明优先于历史 -pma 文件命名。 */
export function readLegacyAtlasSettings(
  text: string,
  resource: SpineResource,
): LegacyAtlasSettings {
  const pages = new Map<string, { pma: boolean; mipmaps: boolean }>();
  const declared = new Map(resource.pages.map((page) => [page.name, page]));
  const result: string[] = [];
  let current: string | undefined;
  for (const line of text.split(/\r?\n/)) {
    const value = line.trim();
    if (declared.has(value)) {
      current = value;
      const page = declared.get(value)!;
      pages.set(value, {
        pma: page.pma ?? /(?:^|[-_.])pma(?:[-_.]|$)/i.test(value),
        mipmaps: false,
      });
      // 官方历史示例把标记放在 atlas 文件名，页名不一定也带标记。
      if (
        page.pma === undefined &&
        /(?:^|[-_.])pma(?:[-_.]|$)/i.test(resource.atlas.path)
      )
        pages.get(value)!.pma = true;
    } else if (!value || !value.includes(':')) {
      current = undefined;
    } else if (current) {
      const settings = pages.get(current)!;
      const metadata = /^\s*(pma|filter)\s*:\s*(.*)$/i.exec(line);
      if (metadata?.[1]?.toLowerCase() === 'pma') {
        if (declared.get(current)!.pma === undefined)
          settings.pma = metadata[2]?.trim().toLowerCase() === 'true';
        continue;
      }
      if (metadata?.[1]?.toLowerCase() === 'filter')
        settings.mipmaps = /^mipmap/i.test(metadata[2]?.trim() ?? '');
    }
    result.push(line);
  }
  for (const name of declared.keys()) {
    if (!pages.has(name)) throw new Error(`atlas 未声明已索引的页面：${name}`);
  }
  return { text: result.join('\n'), pages };
}

/** 取消在每个异步边界检查，过期任务不能继续建立 GPU 对象。 */
export function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Spine 加载已取消', 'AbortError');
}

/** 按需借用图片地址，并等待全部并行图片任务结算后才返回或抛错。 */
export async function loadLegacyImages(
  options: RuntimeLoadOptions,
  settings: LegacyAtlasSettings,
  leases: ImageLease[],
): Promise<LegacyImagePage[]> {
  const settled = await Promise.allSettled(
    options.resource.pages.map(async (page) => {
      assertNotAborted(options.signal);
      const lease = await options.provider.imageUrl(page.file, options.signal);
      // 先登记所有权再检查取消；即使 provider 晚到也会纳入失败清理。
      leases.push(lease);
      assertNotAborted(options.signal);
      const image = await decodeImage(lease.url, page.file.path, options.signal);
      const upload = settings.pages.get(page.name)!;
      return { name: page.name, image, ...upload };
    }),
  );
  const errors = settled.filter((result) => result.status === 'rejected');
  if (errors.length) throw errors[0]!.reason;
  assertNotAborted(options.signal);
  return settled.map((result) => {
    if (result.status === 'rejected') throw result.reason;
    return result.value;
  });
}

/** HTMLImageElement 的事件路径支持取消，并在结束时解除全部临时监听。 */
function decodeImage(
  url: string,
  path: string,
  signal?: AbortSignal,
): Promise<HTMLImageElement> {
  assertNotAborted(signal);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    const cleanup = (): void => {
      image.removeEventListener('load', loaded);
      image.removeEventListener('error', failed);
      signal?.removeEventListener('abort', aborted);
    };
    const loaded = (): void => {
      cleanup();
      if (!image.naturalWidth || !image.naturalHeight)
        reject(new Error(`图片没有有效尺寸：${path}`));
      else resolve(image);
    };
    const failed = (): void => {
      cleanup();
      reject(new Error(`无法解码图片：${path}`));
    };
    const aborted = (): void => {
      cleanup();
      image.src = '';
      reject(new DOMException('Spine 图片加载已取消', 'AbortError'));
    };
    image.addEventListener('load', loaded);
    image.addEventListener('error', failed);
    signal?.addEventListener('abort', aborted, { once: true });
    image.src = url;
  });
}
