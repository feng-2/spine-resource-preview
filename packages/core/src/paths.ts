import { ResourceError } from './diagnostics.js';

/** 归一化来源根目录内路径，拒绝绝对路径和越过来源根的依赖引用。 */
export function normalizeResourcePath(path: string): string {
  const replaced = path.replaceAll('\\', '/');
  if (replaced.startsWith('/') || /^[a-z]:/iu.test(replaced) || replaced.includes('\0'))
    throw new ResourceError({
      code: 'PATH_INVALID',
      stage: 'dependency',
      path,
      message: `资源路径必须是来源根目录内的相对路径：「${path}」`,
    });
  const segments: string[] = [];
  for (const segment of replaced.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      if (!segments.length)
        throw new ResourceError({
          code: 'PATH_OUTSIDE_ROOT',
          stage: 'dependency',
          path,
          message: `依赖路径越过来源根目录：「${path}」`,
        });
      segments.pop();
    } else segments.push(segment);
  }
  return segments.join('/');
}

/** 获取相对路径文件名，不改变大小写或解码百分号。 */
export function resourceBasename(path: string): string {
  return path.split('/').at(-1) ?? '';
}

/** 获取相对路径父目录，来源根目录返回空字符串。 */
export function resourceDirectory(path: string): string {
  const position = path.lastIndexOf('/');
  return position < 0 ? '' : path.slice(0, position);
}

/** 根据文件自身目录定位引用，允许来源根目录内的合法父级相对路径。 */
export function resolveDependencyPath(filePath: string, dependency: string): string {
  // 引用本身不得采用绝对路径，不能通过与父目录拼接掩盖这一错误。
  if (/^(?:[a-z]:|[/\\])/iu.test(dependency)) return normalizeResourcePath(dependency);
  const parent = resourceDirectory(normalizeResourcePath(filePath));
  return normalizeResourcePath(parent ? `${parent}/${dependency}` : dependency);
}
