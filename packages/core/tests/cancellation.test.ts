import { describe, expect, it, vi } from 'vitest';
import {
  abortable,
  createMemoryProvider,
  discoverResources,
  OperationGate,
} from '../src/index.js';

describe('取消、任务替换与依赖所有权', () => {
  it('预先取消不执行读取，读取不响应取消时立即拒绝且处理迟到失败', async () => {
    const canceled = new AbortController();
    canceled.abort();
    const read = vi.fn(async () => 1);
    expect(() => abortable(read, canceled.signal)).toThrow('已取消');
    expect(read).not.toHaveBeenCalled();
    let rejectRead!: (reason: Error) => void;
    const pending = new Promise<number>((_resolve, reject) => {
      rejectRead = reject;
    });
    const controller = new AbortController();
    const started = vi.fn(() => pending);
    const result = abortable(started, controller.signal);
    await vi.waitFor(() => expect(started).toHaveBeenCalled());
    controller.abort();
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    rejectRead(new Error('已取消后的迟到失败'));
    await Promise.resolve();
  });

  it('连续导入取消旧扫描，晚到异常不能覆盖新任务状态', async () => {
    const gate = new OperationGate();
    const old = gate.begin();
    let rejectOld!: (reason: Error) => void;
    const delay = new Promise<void>((_resolve, reject) => {
      rejectOld = reject;
    });
    const beforeRead = vi.fn(async () => delay);
    const provider = createMemoryProvider([{ path: 'hero.json', text: '{}' }], {
      beforeRead,
    });
    const oldDiscovery = discoverResources(provider, { signal: old.signal });
    await vi.waitFor(() => expect(beforeRead).toHaveBeenCalled());
    const current = gate.begin();
    await expect(oldDiscovery).rejects.toMatchObject({ name: 'AbortError' });
    const latest = await discoverResources(
      createMemoryProvider([{ path: 'new.json', text: '{}' }]),
      { signal: current.signal },
    );
    rejectOld(new Error('旧任务迟到错误'));
    await Promise.resolve();
    expect(old.isCurrent()).toBe(false);
    expect(current.isCurrent()).toBe(true);
    expect(latest.diagnostics).toEqual([]);
    gate.cancel();
    expect(current.isCurrent()).toBe(false);
  });

  it('发现部分页后缺失依赖不会获取任何图片 lease，其他套仍可索引', async () => {
    const skeleton = '{"skeleton":{"spine":"4.2.22"},"bones":[{"name":"root"}]}';
    const provider = createMemoryProvider([
      { path: 'broken.json', text: skeleton },
      { path: 'broken.atlas', text: 'first.png\nsize: 1,1\n\nabsent.png\nsize: 1,1' },
      { path: 'first.png' },
      { path: 'good/hero.json', text: skeleton },
      { path: 'good/hero.atlas', text: 'ok.png\nsize: 1,1' },
      { path: 'good/ok.png' },
    ]);
    const image = vi.spyOn(provider, 'imageUrl');
    const result = await discoverResources(provider);
    expect(result.resources.map((resource) => resource.id)).toEqual(['good/hero.json']);
    expect(result.diagnostics[0]?.code).toBe('PAGE_MISSING');
    expect(image).not.toHaveBeenCalled();
  });

  it('内存图片地址释放失败可重试，成功后重复释放无副作用', async () => {
    const release = vi.fn().mockImplementationOnce(() => {
      throw new Error('受控释放失败');
    });
    const provider = createMemoryProvider(
      [{ path: 'page.png', imageUrl: 'data:image/png;base64,' }],
      { releaseImage: release },
    );
    const lease = await provider.imageUrl(provider.files[0]!);
    expect(() => lease.release()).toThrow('受控释放失败');
    lease.release();
    lease.release();
    expect(release).toHaveBeenCalledTimes(2);
  });
});
