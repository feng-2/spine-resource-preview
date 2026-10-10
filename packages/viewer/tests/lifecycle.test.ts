import { describe, expect, it, vi } from 'vitest';
import type { ResourceProvider, SpineResource } from '@spine-preview/core';
import type { PreviewController, PreviewOptions } from '@spine-preview/runtimes';
import {
  PreviewLifecycle,
  type PreviewFactory,
  type PreviewTarget,
} from '../src/lifecycle.js';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

const provider: ResourceProvider = {
  files: [],
  readText: async () => '',
  readBytes: async () => new Uint8Array(),
  imageUrl: async () => ({ url: '', release() {} }),
};

function resource(id: string): SpineResource {
  return {
    id,
    name: id,
    version: '4.2',
    exportVersion: '4.2.0',
    format: 'json',
    skeleton: { id, path: `${id}.json`, size: 0 },
    atlas: { id: `${id}.atlas`, path: `${id}.atlas`, size: 0 },
    pages: [],
    animations: ['idle'],
  };
}

function controller(dispose: () => Promise<void> = async () => {}): PreviewController {
  return {
    version: '4.2',
    animations: ['idle'],
    skins: [],
    play: vi.fn(),
    setPaused: vi.fn(),
    setSpeed: vi.fn(),
    setZoom: vi.fn(),
    toggleFit: vi.fn(),
    dispose: vi.fn(dispose),
  };
}

function target(id: string): PreviewTarget {
  return {
    host: {} as HTMLElement,
    resource: resource(id),
    provider,
    options: { onChange: vi.fn(), onError: vi.fn() },
    ready: vi.fn(),
    failed: vi.fn(),
  };
}

describe('独占预览生命周期', () => {
  it('恢复动作的就绪回调失败先释放已创建实例，再报告错误', async () => {
    const disposed = deferred<void>();
    const next = controller(() => disposed.promise);
    const lifecycle = new PreviewLifecycle(
      vi.fn<PreviewFactory>().mockResolvedValue(next),
    );
    const selected = target('hot-reloaded');
    const error = new Error('Restored animation failed');
    selected.ready = vi.fn(() => {
      throw error;
    });
    const loaded = lifecycle.replace(selected);
    await Promise.resolve();
    await Promise.resolve();
    expect(next.dispose).toHaveBeenCalledOnce();
    expect(selected.failed).not.toHaveBeenCalled();
    disposed.resolve();
    await loaded;
    expect(selected.failed).toHaveBeenCalledExactlyOnceWith(error);
    await lifecycle.replace(null);
    expect(next.dispose).toHaveBeenCalledOnce();
  });

  it('就绪后恢复失败且释放失败时，下一次选择必须先重试释放', async () => {
    const dispose = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('cleanup failed'))
      .mockResolvedValue(undefined);
    const old = controller(dispose);
    const next = controller();
    const factory = vi
      .fn<PreviewFactory>()
      .mockResolvedValueOnce(old)
      .mockResolvedValueOnce(next);
    const lifecycle = new PreviewLifecycle(factory);
    const failed = target('hot-reloaded');
    failed.ready = vi.fn(() => {
      throw new Error('Restored animation failed');
    });
    await lifecycle.replace(failed);
    expect(failed.failed).toHaveBeenCalledOnce();
    const retried = target('retry');
    await lifecycle.replace(retried);
    expect(dispose).toHaveBeenCalledTimes(2);
    expect(factory).toHaveBeenCalledTimes(2);
    expect(retried.ready).toHaveBeenCalledWith(next);
    await lifecycle.replace(null);
  });

  it('等待旧控制器释放，才创建新资源', async () => {
    const disposed = deferred<void>();
    const old = controller(() => disposed.promise);
    const next = controller();
    const factory = vi
      .fn<PreviewFactory>()
      .mockResolvedValueOnce(old)
      .mockResolvedValueOnce(next);
    const lifecycle = new PreviewLifecycle(factory);
    await lifecycle.replace(target('old'));
    const switched = lifecycle.replace(target('new'));
    await Promise.resolve();
    expect(old.dispose).toHaveBeenCalledOnce();
    expect(factory).toHaveBeenCalledTimes(1);
    disposed.resolve();
    await switched;
    expect(factory).toHaveBeenCalledTimes(2);
    await lifecycle.replace(null);
    expect(next.dispose).toHaveBeenCalledOnce();
  });

  it('过期创建即使忽略取消，也必须释放自身且不覆盖新选择', async () => {
    const loaded = deferred<PreviewController>();
    const disposed = deferred<void>();
    const old = controller(() => disposed.promise);
    const newer = controller();
    const factory = vi
      .fn<PreviewFactory>()
      .mockImplementationOnce(() => loaded.promise)
      .mockResolvedValueOnce(newer);
    const lifecycle = new PreviewLifecycle(factory);
    const previous = target('old');
    const current = target('new');
    void lifecycle.replace(previous);
    await Promise.resolve();
    const changed = lifecycle.replace(current);
    expect(factory.mock.calls[0]![3].signal?.aborted).toBe(true);
    loaded.resolve(old);
    await Promise.resolve();
    await Promise.resolve();
    expect(previous.ready).not.toHaveBeenCalled();
    expect(factory).toHaveBeenCalledTimes(1);
    disposed.resolve();
    await changed;
    expect(current.ready).toHaveBeenCalledWith(newer);
    expect(previous.failed).not.toHaveBeenCalled();
    await lifecycle.replace(null);
  });

  it('StrictMode 的创建、清理、重新创建只启动最新目标', async () => {
    const next = controller();
    const factory = vi.fn<PreviewFactory>().mockResolvedValue(next);
    const lifecycle = new PreviewLifecycle(factory);
    const first = target('strict');
    const second = target('strict');
    void lifecycle.replace(first);
    void lifecycle.replace(null);
    await lifecycle.replace(second);
    expect(factory).toHaveBeenCalledOnce();
    expect(first.ready).not.toHaveBeenCalled();
    expect(second.ready).toHaveBeenCalledOnce();
    await lifecycle.replace(null);
  });

  it('旧任务晚到失败和状态回调不能污染新目标', async () => {
    const loading = deferred<PreviewController>();
    let options!: PreviewOptions;
    const next = controller();
    const factory = vi
      .fn<PreviewFactory>()
      .mockImplementationOnce((_host, _resource, _provider, received) => {
        options = received;
        return loading.promise;
      })
      .mockResolvedValueOnce(next);
    const lifecycle = new PreviewLifecycle(factory);
    const old = target('old');
    void lifecycle.replace(old);
    await Promise.resolve();
    const current = target('new');
    const switched = lifecycle.replace(current);
    options.onError?.(new Error('old render failed'));
    options.onChange?.({ zoom: 8, fitted: true, paused: true });
    loading.reject(new Error('late failure'));
    await switched;
    expect(old.options.onChange).not.toHaveBeenCalled();
    expect(old.options.onError).not.toHaveBeenCalled();
    expect(old.failed).not.toHaveBeenCalled();
    expect(current.ready).toHaveBeenCalledOnce();
    await lifecycle.replace(null);
  });

  it('释放失败时保留实例并阻止新建，之后重试清理', async () => {
    const dispose = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('dispose failed'))
      .mockResolvedValue(undefined);
    const old = controller(dispose);
    const next = controller();
    const factory = vi
      .fn<PreviewFactory>()
      .mockResolvedValueOnce(old)
      .mockResolvedValueOnce(next);
    const lifecycle = new PreviewLifecycle(factory);
    await lifecycle.replace(target('old'));
    const failed = target('first-new');
    await lifecycle.replace(failed);
    expect(failed.failed).toHaveBeenCalledOnce();
    expect(factory).toHaveBeenCalledTimes(1);
    const retried = target('retry');
    await lifecycle.replace(retried);
    expect(dispose).toHaveBeenCalledTimes(2);
    expect(retried.ready).toHaveBeenCalledWith(next);
    await lifecycle.replace(null);
  });
});
