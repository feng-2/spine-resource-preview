import type { Diagnostic, SkeletonFormat, SpineVersion } from './types.js';
import { ResourceError } from './diagnostics.js';

/** 六个受支持的官方 runtime 主、次版本，按原始导出版本精确路由。 */
export const SUPPORTED_SPINE_VERSIONS: readonly SpineVersion[] = Object.freeze([
  '3.7',
  '3.8',
  '4.0',
  '4.1',
  '4.2',
  '4.3',
]);

/** 发现阶段识别的骨骼头，保留完整导出版本和可提前读取的动画。 */
export interface SkeletonIdentification {
  /** 与官方 runtime 匹配的主、次版本。 */
  version: SpineVersion;
  /** 未修改的导出版本。 */
  exportVersion: string;
  /** 骨骼导出格式。 */
  format: SkeletonFormat;
  /** JSON 动画名，二进制由加载后的 runtime 提供。 */
  animations: readonly string[];
  /** 可用资源的额外版本说明，例如 beta 导出。 */
  diagnostics: readonly Diagnostic[];
}

/** 验证完整导出版本和格式；不将未知版本转换为最新 runtime。 */
export function identifyExportVersion(
  exportVersion: unknown,
  format: SkeletonFormat,
): SkeletonIdentification {
  if (typeof exportVersion !== 'string' || !exportVersion.trim())
    throw new ResourceError({
      code: 'VERSION_MISSING',
      stage: 'version',
      message: 'Spine 骨骼缺少 skeleton.spine 导出版本。',
    });
  const match = /^(\d+)\.(\d+)(?:\.\d+)?(?:-beta(?:\.\d+)?)?$/u.exec(exportVersion);
  if (!match)
    throw new ResourceError({
      code: 'VERSION_INVALID',
      stage: 'version',
      message: `无法识别 Spine 导出版本「${exportVersion}」，不会自动转换或使用其他版本。`,
    });
  const route = `${match[1]}.${match[2]}`;
  if (!SUPPORTED_SPINE_VERSIONS.includes(route as SpineVersion))
    throw new ResourceError({
      code: 'VERSION_UNSUPPORTED',
      stage: 'version',
      message: `不支持 Spine ${exportVersion}；支持 ${SUPPORTED_SPINE_VERSIONS.join('、')}，不会跨版本加载。`,
    });
  if (format === 'binary' && route === '3.7')
    throw new ResourceError({
      code: 'BINARY_37_UNSUPPORTED',
      stage: 'version',
      message: `Spine ${exportVersion} 的 3.7 二进制暂不支持，请使用相同版本的 JSON 导出。`,
    });
  if (format === 'binary' && exportVersion === '3.8.75')
    throw new ResourceError({
      code: 'BINARY_HISTORICAL_EXPORT',
      stage: 'version',
      message:
        '官方 Spine 3.8 runtime 明确拒绝 3.8.75 二进制导出；请用较新的 3.8 编辑器重新导出。',
    });
  return {
    version: route as SpineVersion,
    exportVersion,
    format,
    animations: [],
    diagnostics: exportVersion.includes('-beta')
      ? [
          {
            code: 'VERSION_PRERELEASE',
            stage: 'version',
            message: `资源使用 Spine ${exportVersion} beta 导出，按相同 ${route} runtime 加载；具体数据仍由官方解析器校验。`,
          },
        ]
      : [],
  };
}

/** 识别 JSON 骨骼，普通配置和 spritesheet 返回空值，不产生 Spine 错误。 */
export function identifySkeletonJson(text: string): SkeletonIdentification | undefined {
  let value: unknown;
  try {
    value = JSON.parse(text.replace(/^\uFEFF/u, ''));
  } catch {
    throw new ResourceError({
      code: 'JSON_INVALID',
      stage: 'discovery',
      message: 'JSON 内容损坏，无法解析。',
    });
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const object = value as Record<string, unknown>;
  const header = object.skeleton;
  const hasHeader = !!header && typeof header === 'object' && !Array.isArray(header);
  const hasVersion = hasHeader && Object.hasOwn(header, 'spine');
  if (!hasVersion && !Array.isArray(object.bones)) return undefined;
  const identification = identifyExportVersion(
    hasHeader ? (header as Record<string, unknown>).spine : undefined,
    'json',
  );
  if (!Array.isArray(object.bones) || !object.bones.length)
    throw new ResourceError({
      code: 'JSON_BONES_INVALID',
      stage: 'discovery',
      message: `Spine ${identification.exportVersion} JSON 缺少有效 bones 骨骼列表。`,
    });
  const animations = object.animations;
  if (
    animations !== undefined &&
    (!animations || typeof animations !== 'object' || Array.isArray(animations))
  )
    throw new ResourceError({
      code: 'JSON_ANIMATIONS_INVALID',
      stage: 'discovery',
      message: `Spine ${identification.exportVersion} JSON 的 animations 必须是动画名称对象。`,
    });
  return { ...identification, animations: Object.keys(animations ?? {}) };
}
