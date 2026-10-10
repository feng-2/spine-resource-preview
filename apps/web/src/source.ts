import { discoverResources } from '@spine-preview/core';
import type { ViewerSnapshot, ViewerSource } from '@spine-preview/viewer';
import { BrowserFiles, droppedFiles } from './files.js';

/** 浏览器导入来源，文件读取代际由此管理，不让迟到错误覆盖新资源。 */
export class BrowserSource implements ViewerSource {
  private readonly listeners = new Set<(snapshot: ViewerSnapshot) => void>();
  private snapshot: ViewerSnapshot = {
    revision: 0,
    label: '',
    provider: null,
    result: { resources: [], diagnostics: [] },
    loading: false,
    message: '准备就绪，请导入完整的 Spine 资源。',
  };
  private controller: AbortController | undefined;
  private readonly fileInput = document.createElement('input');
  private readonly folderInput = document.createElement('input');
  private files: readonly File[] = [];

  constructor() {
    this.fileInput.type = 'file';
    this.fileInput.multiple = true;
    this.fileInput.accept = '.json,.skel,.atlas,image/*';
    this.folderInput.type = 'file';
    this.folderInput.multiple = true;
    this.folderInput.setAttribute('webkitdirectory', '');
    for (const input of [this.fileInput, this.folderInput]) {
      input.hidden = true;
      document.body.append(input);
      input.addEventListener('change', () => {
        const files = [...(input.files ?? [])];
        input.value = '';
        if (files.length) void this.importFiles(() => Promise.resolve(files));
      });
    }
  }

  subscribe(listener: (snapshot: ViewerSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  async chooseFiles(): Promise<void> {
    this.fileInput.click();
  }
  async chooseFolder(): Promise<void> {
    this.folderInput.click();
  }
  async refresh(): Promise<void> {
    if (this.files.length) await this.importFiles(() => Promise.resolve(this.files));
  }
  async drop(transfer: DataTransfer): Promise<void> {
    await this.importFiles((signal) => droppedFiles(transfer, signal));
  }

  /** 关闭入口和未完成读取，已加载 session 由共用 viewer 清理。 */
  dispose(): void {
    this.controller?.abort();
    this.listeners.clear();
    this.fileInput.remove();
    this.folderInput.remove();
  }

  private async importFiles(
    readFiles: (signal: AbortSignal) => Promise<readonly File[]>,
  ): Promise<void> {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    const revision = this.snapshot.revision + 1;
    this.publish({
      revision,
      label: '',
      provider: null,
      result: { resources: [], diagnostics: [] },
      loading: true,
      message: '正在识别骨骼版本并匹配依赖…',
    });
    try {
      const selected = await readFiles(controller.signal);
      controller.signal.throwIfAborted();
      this.files = selected;
      const provider = new BrowserFiles(selected);
      const flat = selected.every((file) => !file.webkitRelativePath.includes('/'));
      const result = await discoverResources(provider, {
        recursive: true,
        allowBasenameFallback: flat,
        signal: controller.signal,
      });
      controller.signal.throwIfAborted();
      this.publish({
        revision,
        label: '',
        provider,
        result,
        loading: false,
        message: result.resources.length
          ? `发现 ${result.resources.length} 套可用资源。`
          : '未找到完整可用资源，请查看诊断并重新导入。',
      });
    } catch (error) {
      if (controller.signal.aborted || this.controller !== controller) return;
      const message = error instanceof Error ? error.message : String(error);
      this.publish({
        revision,
        label: '',
        provider: null,
        result: {
          resources: [],
          diagnostics: [{ code: 'IMPORT_FAILED', stage: 'discovery', message }],
        },
        loading: false,
        message,
      });
    }
  }

  private publish(snapshot: ViewerSnapshot): void {
    this.snapshot = snapshot;
    for (const listener of this.listeners) listener(snapshot);
  }
}
