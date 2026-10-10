import { posix } from 'node:path';
import type { Uri } from 'vscode';
import type { ImageLease, ResourceFile, ResourceProvider } from '@spine-preview/core';

/** 可注入的编辑器文件系统；测试不依赖真实 VS Code 进程。 */
export interface ScannerServices {
  /** 枚举目录中的名称及 FileType 标志。 */
  readDirectory(uri: Uri): PromiseLike<[string, number][]>;
  /** 读取文件大小及 FileType 标志。 */
  stat(uri: Uri): PromiseLike<{ type: number; size: number }>;
  /** 按需读取文本或骨骼字节。 */
  readFile(uri: Uri): PromiseLike<Uint8Array>;
  /** 将本地图片 URI 转换为受限 Webview URL。 */
  imageUri(uri: Uri): string;
}

/** 扫描范围与状态回调。 */
export interface ScanOptions {
  /** 来源目录；文件入口使用父目录。 */
  root: Uri;
  /** 目录入口递归，文件入口只枚举同级文件。 */
  recursive: boolean;
  /** 多文件导入只枚举这些文件所属目录。 */
  directories?: readonly Uri[];
  /** 多项拖放中显式选择的文件夹，只对这些根递归发现。 */
  recursiveDirectories?: readonly Uri[];
  /** 取消上一次扫描。 */
  signal?: AbortSignal;
  /** 扫描进度，只报告元数据，不读取图片内容。 */
  progress?: (count: number) => void;
}

/** 带授权文件表的宿主 provider，按需解析的依赖也加入授权范围。 */
export interface HostProvider extends ResourceProvider {
  /** 来源根目录，供 Webview 本地访问授权。 */
  readonly root: Uri;
  /** 包含已枚举及 resolve 成功依赖的最新描述。 */
  allFiles(): readonly ResourceFile[];
  /** 按稳定身份查找授权文件，拒绝任意磁盘路径请求。 */
  get(fileId: string): ResourceFile | undefined;
}

const ignoredDirectories = new Set([
  '.git',
  'node_modules',
  '.pnpm',
  '.cache',
  '.turbo',
  'dist',
  'build',
]);

/** 取消检查用于每次编辑器异步操作前后，防止晚到任务登记资源。 */
export function checkCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('扫描或读取已取消', 'AbortError');
}

/** URI 路径相对化；跨 scheme/authority 的文件不能混入同一个 provider。 */
export function relativeUriPath(root: Uri, uri: Uri): string {
  if (root.scheme !== uri.scheme || root.authority !== uri.authority)
    throw new Error('文件不属于同一 URI 来源');
  const relative = posix.relative(root.path, uri.path);
  if (relative.startsWith('../') || relative === '..' || posix.isAbsolute(relative))
    throw new Error('资源依赖不能越过当前导入根目录');
  return relative;
}

/** 枚举骨骼发现范围；resolve 仍允许同一来源根下的子目录图片和 atlas。 */
export async function scanProvider(
  services: ScannerServices,
  options: ScanOptions,
): Promise<HostProvider> {
  const known = new Map<string, { file: ResourceFile; uri: Uri }>();
  const listed: ResourceFile[] = [];
  const listedIds = new Set<string>();
  const describe = async (
    uri: Uri,
    signal?: AbortSignal,
  ): Promise<ResourceFile | undefined> => {
    checkCancelled(signal);
    const id = uri.toString();
    const cached = known.get(id);
    if (cached) return cached.file;
    const info = await services.stat(uri);
    checkCancelled(signal);
    // Symlink 标志可以与 File 联合；目录不作为可读取资源授权。
    if (!(info.type & 1)) return undefined;
    const file: ResourceFile = {
      id,
      path: relativeUriPath(options.root, uri),
      size: info.size,
      url: services.imageUri(uri),
    };
    known.set(id, { file, uri });
    return file;
  };
  const visited = new Set<string>();
  const visit = async (directory: Uri, recursive: boolean): Promise<void> => {
    checkCancelled(options.signal);
    const visitId = `${directory.toString()}:${recursive}`;
    if (visited.has(visitId)) return;
    visited.add(visitId);
    const children = await services.readDirectory(directory);
    checkCancelled(options.signal);
    for (const [name, type] of children) {
      checkCancelled(options.signal);
      const uri = directory.with({ path: posix.join(directory.path, name) });
      if (type & 1) {
        const file = await describe(uri, options.signal);
        if (file && !listedIds.has(file.id)) {
          listedIds.add(file.id);
          listed.push(file);
          options.progress?.(listed.length);
        }
      } else if (recursive && type & 2 && !(type & 64) && !ignoredDirectories.has(name)) {
        // 不递归符号链接目录，避免目录循环或读取未授权来源。
        await visit(uri, recursive);
      }
    }
  };
  for (const directory of options.directories ?? [options.root]) {
    const recursive =
      options.recursive ||
      !!options.recursiveDirectories?.some(
        (root) => root.toString() === directory.toString(),
      );
    await visit(directory, recursive);
  }
  const bytes = async (file: ResourceFile, signal?: AbortSignal): Promise<Uint8Array> => {
    checkCancelled(signal);
    const entry = known.get(file.id);
    if (!entry) throw new Error('文件不属于当前预览来源，请刷新后重试');
    const data = await services.readFile(entry.uri);
    checkCancelled(signal);
    return data;
  };
  return {
    root: options.root,
    files: listed,
    allFiles: () => [...known.values()].map((entry) => entry.file),
    get: (id) => known.get(id)?.file,
    readBytes: bytes,
    readText: async (file, signal) => new TextDecoder().decode(await bytes(file, signal)),
    imageUrl: async (file, signal): Promise<ImageLease> => {
      checkCancelled(signal);
      const entry = known.get(file.id);
      if (!entry) throw new Error('图片不属于当前预览来源');
      return {
        url: services.imageUri(entry.uri),
        release() {
          /* Webview URI 没有临时 Blob 所有权。 */
        },
      };
    },
    resolve: async (path, signal) => {
      checkCancelled(signal);
      const normalized = posix.normalize(path.replaceAll('\\', '/'));
      if (
        posix.isAbsolute(normalized) ||
        normalized === '..' ||
        normalized.startsWith('../')
      )
        return undefined;
      const uri = options.root.with({ path: posix.join(options.root.path, normalized) });
      try {
        return await describe(uri, signal);
      } catch (error) {
        checkCancelled(signal);
        // FileNotFound 作为缺少依赖交给 core；权限与读取错误保留具体原因。
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          error.code === 'FileNotFound'
        )
          return undefined;
        throw error;
      }
    },
  };
}
