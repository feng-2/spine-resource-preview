import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  EditorSource,
  parseHostMessage,
  readDroppedUris,
} from '../src/webview/source.js';
import type { ViewerSnapshot } from '@spine-preview/viewer';
import type { WebviewMessage } from '@spine-preview/core';

/** 构造只含元数据的宿主索引，图片不使用 base64。 */
function snapshot(revision: number) {
  return {
    type: 'snapshot',
    revision,
    label: '测试来源',
    files: [
      { id: 'file:///hero.json', path: 'hero.json', size: 2 },
      {
        id: 'file:///page.png',
        path: 'page.png',
        size: 4,
        url: 'https://local.invalid/page.png',
      },
    ],
    result: { resources: [], diagnostics: [] },
  };
}

afterEach(() => vi.useRealTimers());

describe('Webview 来源代际和按需读取', () => {
  it('订阅立即回放，使用请求身份匹配回复，图片只返回 URL', async () => {
    const messages: WebviewMessage[] = [];
    const source = new EditorSource({ postMessage: (message) => messages.push(message) });
    let current: ViewerSnapshot | undefined;
    source.subscribe((value) => {
      current = value;
    });
    expect(current?.revision).toBe(0);
    source.receive(snapshot(1));
    const provider = current!.provider!;
    const result = provider.readText(provider.files[0]!);
    expect(messages).toEqual([
      { type: 'read', requestId: '1:1', fileId: 'file:///hero.json', format: 'text' },
    ]);
    source.receive({ type: 'read-result', requestId: 'unknown', text: 'wrong' });
    source.receive({ type: 'read-result', requestId: '1:1', text: '{}' });
    expect(await result).toBe('{}');
    expect((await provider.imageUrl(provider.files[1]!)).url).toBe(
      'https://local.invalid/page.png',
    );
    expect(messages).toHaveLength(1);
    source.dispose();
  });

  it('新索引取消旧读取，晚到状态和旧 provider 请求不能覆盖新来源', async () => {
    const source = new EditorSource({ postMessage: vi.fn() });
    let current: ViewerSnapshot | undefined;
    source.subscribe((value) => {
      current = value;
    });
    source.receive(snapshot(1));
    const old = current!.provider!;
    const pending = old.readBytes(old.files[0]!);
    const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    source.receive({ type: 'status', revision: 2, loading: true, message: '新扫描' });
    await rejected;
    source.receive({ type: 'status', revision: 1, loading: false, message: '旧失败' });
    expect(current?.message).toBe('新扫描');
    expect(current?.provider).toBeNull();
    await expect(old.readText(old.files[0]!)).rejects.toMatchObject({
      name: 'AbortError',
    });
    source.dispose();
  });

  it('一项读取错误只拒绝该请求，不影响同代际其他请求与来源状态', async () => {
    const source = new EditorSource({ postMessage: vi.fn() });
    let current: ViewerSnapshot | undefined;
    source.subscribe((value) => {
      current = value;
    });
    source.receive(snapshot(1));
    const provider = current!.provider!;
    const first = provider.readText(provider.files[0]!);
    const failed = expect(first).rejects.toThrow('文件损坏');
    const second = provider.readBytes(provider.files[0]!);
    source.receive({ type: 'read-result', requestId: '1:1', error: '文件损坏' });
    source.receive({ type: 'read-result', requestId: '1:2', bytes: [1, 2, 3] });
    await failed;
    expect(await second).toEqual(new Uint8Array([1, 2, 3]));
    expect(current?.provider).toBe(provider);
    expect(current?.revision).toBe(1);
    expect(parseHostMessage({ ...snapshot(2), files: [{ id: 'x' }] })).toBeUndefined();
    source.dispose();
  });

  it('单个请求取消和关闭页面均释放等待，超时可诊断', async () => {
    vi.useFakeTimers();
    const source = new EditorSource({ postMessage: vi.fn() });
    let current: ViewerSnapshot | undefined;
    source.subscribe((value) => {
      current = value;
    });
    source.receive(snapshot(1));
    const provider = current!.provider!;
    const controller = new AbortController();
    const first = provider.readText(provider.files[0]!, controller.signal);
    const cancelled = expect(first).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await cancelled;
    const second = provider.readText(provider.files[0]!);
    const timed = expect(second).rejects.toThrow('超时');
    await vi.advanceTimersByTimeAsync(30000);
    await timed;
    const third = provider.readText(provider.files[0]!);
    const closed = expect(third).rejects.toMatchObject({ name: 'AbortError' });
    source.dispose();
    await closed;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('解析标准 Explorer URI 列表及 ResourceURLs，忽略无 URI 文件拖入', () => {
    expect(
      readDroppedUris({
        getData: (type) =>
          type === 'text/uri-list' ? '#资源\r\nfile:///a\r\nfile:///a\r\nfile:///b' : '',
      }),
    ).toEqual(['file:///a', 'file:///b']);
    expect(
      readDroppedUris({
        getData: (type) => (type === 'ResourceURLs' ? '["file:///folder"]' : ''),
      }),
    ).toEqual(['file:///folder']);
    expect(readDroppedUris({ getData: () => '' })).toEqual([]);
    expect(
      parseHostMessage({ type: 'status', revision: -1, loading: true, message: '错误' }),
    ).toBeUndefined();
    expect(
      parseHostMessage({ type: 'read-result', requestId: '1:1', bytes: [300] }),
    ).toBeUndefined();
  });
});
