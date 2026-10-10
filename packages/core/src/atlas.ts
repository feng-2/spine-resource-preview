import { ResourceError } from './diagnostics.js';

/** atlas 原始页索引，不包含区域附件或运行时纹理。 */
export interface AtlasPageReference {
  /** 原始页文件名，保留相对目录。 */
  name: string;
  /** 页元数据明确声明的预乘标记。 */
  pma?: boolean;
}

/** 按 atlas 页间空行解析全部页，兼容旧式 format/xy 与新版缩进 bounds/scale。 */
export function readAtlasPages(text: string): readonly AtlasPageReference[] {
  const pages: AtlasPageReference[] = [];
  const names = new Set<string>();
  let nextPage = true;
  let pageMetadata = false;
  let current: AtlasPageReference | undefined;
  for (const raw of text.replace(/^\uFEFF/u, '').split(/\r?\n/u)) {
    const line = raw.trim();
    if (!line) {
      nextPage = true;
      pageMetadata = false;
      continue;
    }
    const colon = line.indexOf(':');
    if (colon >= 0) {
      if (pageMetadata && current && line.slice(0, colon).trim() === 'pma') {
        const value = line.slice(colon + 1).trim();
        if (value !== 'true' && value !== 'false')
          throw new ResourceError({
            code: 'ATLAS_PMA_INVALID',
            stage: 'dependency',
            message: `atlas 页「${current.name}」的 pma 标记无效：「${value}」。`,
          });
        current.pma = value === 'true';
      }
      continue;
    }
    if (nextPage) {
      if (names.has(line))
        throw new ResourceError({
          code: 'ATLAS_PAGE_DUPLICATE',
          stage: 'dependency',
          message: `atlas 页图片重复：「${line}」。`,
        });
      current = { name: line };
      pages.push(current);
      names.add(line);
      nextPage = false;
      pageMetadata = true;
    } else {
      // 一个不含冒号的区域名终止页元数据；区域内部同名属性不能覆盖页 PMA。
      pageMetadata = false;
    }
  }
  if (!pages.length)
    throw new ResourceError({
      code: 'ATLAS_EMPTY',
      stage: 'dependency',
      message: 'atlas 没有有效页图片。',
    });
  return pages;
}
