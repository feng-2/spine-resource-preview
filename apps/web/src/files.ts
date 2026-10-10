import type { ImageLease, ResourceFile, ResourceProvider } from '@spine-preview/core';

/** 多文件导入来源，保留重复路径身份，依赖匹配由核心明确诊断。 */
export class BrowserFiles implements ResourceProvider {
  readonly files: readonly ResourceFile[];
  private readonly originals = new Map<string, File>();

  /** 文件夹保留相对路径，扁平多选不猜目录关系。 */
  constructor(files: readonly File[]) {
    const counts = new Map<string, number>();
    this.files = [...new Set(files)].map((file) => {
      const path = (file.webkitRelativePath || file.name)
        .replaceAll('\\', '/')
        .replace(/^\/+/, '');
      const count = counts.get(path) ?? 0;
      counts.set(path, count + 1);
      const id = count ? `${path}#${count}` : path;
      this.originals.set(id, file);
      return { id, path, size: file.size };
    });
  }

  async readText(file: ResourceFile, signal?: AbortSignal): Promise<string> {
    signal?.throwIfAborted();
    const result = await this.get(file).text();
    signal?.throwIfAborted();
    return result;
  }

  async readBytes(file: ResourceFile, signal?: AbortSignal): Promise<Uint8Array> {
    signal?.throwIfAborted();
    const result = new Uint8Array(await this.get(file).arrayBuffer());
    signal?.throwIfAborted();
    return result;
  }

  async imageUrl(file: ResourceFile, signal?: AbortSignal): Promise<ImageLease> {
    signal?.throwIfAborted();
    const url = URL.createObjectURL(this.get(file));
    let released = false;
    return {
      url,
      release: () => {
        if (released) return;
        released = true;
        URL.revokeObjectURL(url);
      },
    };
  }

  private get(file: ResourceFile): File {
    const original = this.originals.get(file.id);
    if (!original) throw new Error(`导入来源中没有文件：${file.path}`);
    return original;
  }
}

/** 收集一棵拖入目录，浏览器批次读到空才结束。 */
async function readEntry(entry: FileSystemEntry, signal?: AbortSignal): Promise<File[]> {
  signal?.throwIfAborted();
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) =>
      (entry as FileSystemFileEntry).file(resolve, reject),
    );
    signal?.throwIfAborted();
    Object.defineProperty(file, 'webkitRelativePath', {
      value: entry.fullPath.replace(/^\//, ''),
      configurable: true,
    });
    return [file];
  }
  if (!entry.isDirectory) return [];
  const reader = (entry as FileSystemDirectoryEntry).createReader();
  const children: FileSystemEntry[] = [];
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
      reader.readEntries(resolve, reject),
    );
    signal?.throwIfAborted();
    if (!batch.length) break;
    children.push(...batch);
  }
  return (await Promise.all(children.map((child) => readEntry(child, signal)))).flat();
}

/** drop 回调期间同步取得浏览器条目，随后异步读目录。 */
export function droppedFiles(
  transfer: DataTransfer,
  signal?: AbortSignal,
): Promise<File[]> {
  signal?.throwIfAborted();
  const items = [...transfer.items].filter((item) => item.kind === 'file');
  if (!items.length) return Promise.resolve([...transfer.files]);
  const requests = items.map((item) => {
    const entry = item.webkitGetAsEntry?.();
    if (entry) return readEntry(entry, signal);
    const file = item.getAsFile();
    return Promise.resolve(file ? [file] : []);
  });
  return Promise.all(requests).then((parts) => parts.flat());
}
