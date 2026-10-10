import { afterEach, describe, expect, test, vi } from 'vitest';
import type { ResourceProvider, SpineResource } from '@spine-preview/core';
import { CleanupScope, decodeImage, loadModernSession } from '../src/modern/common';

const skeleton = { id: 'test.json', path: 'test.json', size: 1 };
const atlas = { id: 'test.atlas', path: 'test.atlas', size: 1 };
const resource: SpineResource = {
  id: skeleton.id,
  name: 'test',
  version: '4.2',
  exportVersion: '4.2.22',
  format: 'json',
  skeleton,
  atlas,
  pages: [
    { name: 'one.png', file: { id: 'one.png', path: 'one.png', size: 1 } },
    { name: 'two.png', file: { id: 'two.png', path: 'two.png', size: 1 } },
  ],
  animations: [],
};

afterEach(() => vi.unstubAllGlobals());

describe('现代runtime失败与取消的所有权', () => {
  test('清理异常仍释放其他资源，只重试失败项', () => {
    const released: number[] = [];
    let firstAttempt = true;
    const scope = new CleanupScope();
    scope.own(() => released.push(1));
    scope.own(() => {
      released.push(2);
      if (firstAttempt) {
        firstAttempt = false;
        throw new Error('释放错误');
      }
    });
    scope.own(() => released.push(3));
    expect(() => scope.dispose()).toThrow(AggregateError);
    scope.dispose();
    scope.dispose();
    expect(released).toEqual([3, 2, 1, 2]);
  });

  test('中途第二张图片失败仍释放已解码图片与所有lease', async () => {
    const releases: string[] = [];
    class TestImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      crossOrigin = '';
      private address = '';
      set src(value: string) {
        this.address = value;
        queueMicrotask(() => (value === 'two.png' ? this.onerror?.() : this.onload?.()));
      }
      removeAttribute() {
        releases.push(`image:${this.address}`);
      }
    }
    vi.stubGlobal('Image', TestImage);
    const provider: ResourceProvider = {
      files: [],
      async readText() {
        return '{"skeleton":{"spine":"4.2.22"}}';
      },
      async readBytes() {
        return new Uint8Array();
      },
      async imageUrl(file) {
        return {
          url: file.path,
          release() {
            releases.push(`lease:${file.path}`);
          },
        };
      },
    };
    const canvas = { getContext: vi.fn() } as unknown as HTMLCanvasElement;
    const build = vi.fn();
    await expect(
      loadModernSession('4.2', { canvas, resource, provider }, build),
    ).rejects.toThrow('无法解码');
    expect(releases).toEqual([
      'image:two.png',
      'lease:two.png',
      'image:one.png',
      'lease:one.png',
    ]);
    expect(canvas.getContext).not.toHaveBeenCalled();
    expect(build).not.toHaveBeenCalled();
  });

  test('图片等待时取消会卸下回调并停止图片请求', async () => {
    let image: TestImage | undefined;
    class TestImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      crossOrigin = '';
      src = '';
      removed = false;
      constructor() {
        image = this;
      }
      removeAttribute() {
        this.removed = true;
      }
    }
    vi.stubGlobal('Image', TestImage);
    const controller = new AbortController();
    const promise = decodeImage('waiting.png', controller.signal);
    controller.abort();
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(image?.removed).toBe(true);
    expect(image?.onload).toBeNull();
    expect(image?.onerror).toBeNull();
  });
});
