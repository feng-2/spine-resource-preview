import type {
  Diagnostic,
  DiscoveryOptions,
  DiscoveryResult,
  ResourceFile,
  ResourceProvider,
  SpineResource,
} from './types.js';
import { abortable, throwIfAborted } from './cancellation.js';
import { ResourceError, toDiagnostic } from './diagnostics.js';
import {
  normalizeResourcePath,
  resourceBasename,
  resourceDirectory,
  resolveDependencyPath,
} from './paths.js';
import { identifySkeletonJson } from './versions.js';
import { identifySkeletonBinary } from './binary.js';
import { readAtlasPages } from './atlas.js';

/** 默认忽略的大型构建或版本控制目录；显式扫描根目录本身不受排除影响。 */
export const DEFAULT_EXCLUDED_DIRECTORIES: readonly string[] = Object.freeze([
  'node_modules',
  '.git',
  '.svn',
  'dist',
  'build',
  'coverage',
  '.cache',
  '.next',
]);

function relativeToRoot(path: string, root: string): string | undefined {
  if (!root) return path;
  if (!path.startsWith(`${root}/`)) return undefined;
  return path.slice(root.length + 1);
}

function isExcluded(relative: string, rules: readonly string[]): boolean {
  const directory = resourceDirectory(relative);
  const segments = directory.split('/');
  return rules.some((rule) => {
    const normalized = normalizeResourcePath(rule);
    if (!normalized) return false;
    return normalized.includes('/')
      ? directory === normalized || directory.startsWith(`${normalized}/`)
      : segments.includes(normalized);
  });
}

function uniqueMatch(
  files: readonly ResourceFile[],
  description: string,
): ResourceFile | undefined {
  if (files.length > 1)
    throw new ResourceError({
      code: 'DEPENDENCY_AMBIGUOUS',
      stage: 'dependency',
      message: `${description}存在同名歧义：${files.map((file) => file.path).join('、')}。请使用保留目录关系的文件夹导入。`,
    });
  return files[0];
}

/** 发现六版本骨骼及完整依赖，只读取骨骼/atlas，不创建图片地址或预加载图片。 */
export async function discoverResources(
  provider: ResourceProvider,
  options: DiscoveryOptions = {},
): Promise<DiscoveryResult> {
  const signal = options.signal;
  throwIfAborted(signal);
  const root = normalizeResourcePath(options.rootPath ?? '');
  const diagnostics: Diagnostic[] = [];
  const files: ResourceFile[] = [];
  const byPath = new Map<string, ResourceFile[]>();
  const seenDescriptors = new Set<string>();
  for (const file of provider.files) {
    try {
      const path = normalizeResourcePath(file.path);
      if (!path) throw new Error('文件相对路径为空');
      // 同一稳定文件重复枚举可去重；不同文件的同名路径保留以便报告歧义。
      const identity = JSON.stringify([file.id, path]);
      if (seenDescriptors.has(identity)) continue;
      seenDescriptors.add(identity);
      files.push(file);
      const matches = byPath.get(path) ?? [];
      matches.push(file);
      byPath.set(path, matches);
    } catch (error) {
      diagnostics.push(toDiagnostic(error, file.path));
    }
  }
  // 即使调用方开启回退，有目录关系的批次仍须严格定位，不能跨目录借用缺失文件。
  const allowFallback =
    !!options.allowBasenameFallback &&
    files.every((file) => resourceDirectory(normalizeResourcePath(file.path)) === '');
  const resolveCache = new Map<string, Promise<ResourceFile | undefined>>();
  const resolveFile = async (
    path: string,
    description: string,
  ): Promise<ResourceFile | undefined> => {
    const exact = uniqueMatch(byPath.get(path) ?? [], description);
    if (exact) return exact;
    if (provider.resolve) {
      let lookup = resolveCache.get(path);
      if (!lookup) {
        lookup = abortable(() => provider.resolve!(path, signal), signal).then((file) => {
          if (file && normalizeResourcePath(file.path) !== path)
            throw new ResourceError({
              code: 'DEPENDENCY_PATH_MISMATCH',
              stage: 'dependency',
              path,
              message: `宿主返回了错误路径：请求「${path}」，得到「${file.path}」，不会跨目录替代依赖。`,
            });
          return file;
        });
        resolveCache.set(path, lookup);
      }
      const resolved = await lookup;
      if (resolved) return resolved;
    }
    if (!allowFallback) return undefined;
    return uniqueMatch(
      files.filter((file) => resourceBasename(file.path) === resourceBasename(path)),
      description,
    );
  };
  const atlases = files.filter((file) => /\.atlas$/iu.test(file.path));
  const exclusions = options.exclude ?? DEFAULT_EXCLUDED_DIRECTORIES;
  const candidates = files.filter((file) => {
    if (!/\.(?:json|skel)$/iu.test(file.path)) return false;
    const relative = relativeToRoot(normalizeResourcePath(file.path), root);
    return (
      relative !== undefined &&
      (options.recursive !== false || !relative.includes('/')) &&
      !isExcluded(relative, exclusions)
    );
  });
  const resources: SpineResource[] = [];
  const atlasTextCache = new Map<string, Promise<string>>();
  let processed = 0;
  for (const skeleton of candidates) {
    throwIfAborted(signal);
    const path = normalizeResourcePath(skeleton.path);
    let stage: Diagnostic['stage'] = 'discovery';
    try {
      uniqueMatch(byPath.get(path) ?? [], `骨骼「${path}」`);
      const identification = /\.json$/iu.test(path)
        ? identifySkeletonJson(
            await abortable(() => provider.readText(skeleton, signal), signal),
          )
        : identifySkeletonBinary(
            await abortable(() => provider.readBytes(skeleton, signal), signal),
          );
      if (identification) {
        stage = 'dependency';
        const expectedAtlas = path.replace(/\.(?:json|skel)$/iu, '.atlas');
        let atlas = await resolveFile(expectedAtlas, `atlas「${expectedAtlas}」`);
        if (!atlas) {
          // 不同名 atlas 仅在骨骼同目录唯一时推断，其他目录的同名 atlas 不参与。
          atlas = uniqueMatch(
            atlases.filter(
              (file) =>
                resourceDirectory(normalizeResourcePath(file.path)) ===
                resourceDirectory(path),
            ),
            `资源「${path}」所在目录的 atlas`,
          );
        }
        if (!atlas)
          throw new ResourceError({
            code: 'ATLAS_MISSING',
            stage: 'dependency',
            path: expectedAtlas,
            message: `Spine ${identification.exportVersion} 资源「${path}」缺少同目录 atlas。`,
          });
        let atlasText = atlasTextCache.get(atlas.id);
        if (!atlasText) {
          atlasText = abortable(() => provider.readText(atlas!, signal), signal);
          atlasTextCache.set(atlas.id, atlasText);
        }
        const references = readAtlasPages(await atlasText);
        const pages: SpineResource['pages'][number][] = [];
        for (const reference of references) {
          const expectedPage = resolveDependencyPath(atlas.path, reference.name);
          const file = await resolveFile(expectedPage, `页图片「${reference.name}」`);
          if (!file)
            throw new ResourceError({
              code: 'PAGE_MISSING',
              stage: 'dependency',
              path: expectedPage,
              message: `Spine ${identification.exportVersion} 资源「${path}」缺少页图片「${reference.name}」（预期路径：${expectedPage}）。`,
            });
          pages.push({
            name: reference.name,
            file,
            ...(reference.pma !== undefined ? { pma: reference.pma } : {}),
          });
        }
        resources.push({
          id: skeleton.id,
          name: path.replace(/\.(?:json|skel)$/iu, ''),
          version: identification.version,
          exportVersion: identification.exportVersion,
          format: identification.format,
          skeleton,
          atlas,
          pages,
          animations: identification.animations,
        });
        diagnostics.push(
          ...identification.diagnostics.map((diagnostic) => ({ ...diagnostic, path })),
        );
      }
    } catch (error) {
      // 取消必须向上退出，不能作为某一资源失败继续扫描并提交过期索引。
      throwIfAborted(signal);
      diagnostics.push(toDiagnostic(error, path, stage));
    }
    processed++;
    throwIfAborted(signal);
    options.onProgress?.({ processed, total: candidates.length, path });
  }
  let preferredResourceId: string | undefined;
  if (options.preferredFileId) {
    const preferred = options.preferredFileId;
    const preferredPath = files.find((file) => file.id === preferred)?.path;
    const matching = resources.filter(
      (resource) =>
        resource.skeleton.id === preferred ||
        resource.atlas.id === preferred ||
        resource.pages.some((page) => page.file.id === preferred),
    );
    if (matching.length === 1) preferredResourceId = matching[0]!.id;
    else if (matching.length > 1)
      diagnostics.push({
        code: 'PREFERRED_FILE_AMBIGUOUS',
        stage: 'discovery',
        ...(preferredPath ? { path: preferredPath } : {}),
        message: `所选文件关联多个骨骼，请从资源列表选择：${matching.map((resource) => resource.skeleton.path).join('、')}。`,
      });
    else
      diagnostics.push({
        code: 'PREFERRED_FILE_UNASSOCIATED',
        stage: 'discovery',
        ...(preferredPath ? { path: preferredPath } : {}),
        message: '所选文件未关联到完整 Spine 资源；可从列表选择同目录中的其他可用资源。',
      });
  }
  throwIfAborted(signal);
  return {
    resources,
    diagnostics,
    ...(preferredResourceId ? { preferredResourceId } : {}),
  };
}
