import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { ResourceProvider, SpineResource, SpineVersion } from '@spine-preview/core';
import type { RuntimeAdapter } from '../src/types.js';

// 只替换 GPU 设施；JSON/binary、动画轨道、约束和姿态范围仍由同版本官方 runtime 执行。
vi.mock('spine-webgl-40', async (importOriginal) => gpuFree(await importOriginal()));
vi.mock('spine-webgl-41', async (importOriginal) => gpuFree(await importOriginal()));
vi.mock('spine-webgl-42', async (importOriginal) => gpuFree(await importOriginal()));
vi.mock('spine-webgl-43', async (importOriginal) => gpuFree(await importOriginal()));

function gpuFree(original: typeof import('spine-webgl-42')) {
  return {
    ...original,
    ManagedWebGLRenderingContext: class {
      constructor(public gl: WebGLRenderingContext) {}
      dispose() {}
    },
    GLTexture: class extends original.FakeTexture {
      constructor(
        public context: { gl: WebGLRenderingContext },
        image: HTMLImageElement,
      ) {
        super(image);
      }
      update() {}
    },
    SceneRenderer: class {
      skeletonRenderer = {};
      dispose() {}
    },
  };
}

import { adapter as v40 } from '../src/modern/v40.js';
import { adapter as v41 } from '../src/modern/v41.js';
import { adapter as v42 } from '../src/modern/v42.js';
import { adapter as v43 } from '../src/modern/v43.js';

function prepare(version: SpineVersion, binary: boolean) {
  const extension = binary ? 'skel' : 'json';
  const file = (path: string) => ({ id: path, path, size: 1 });
  const resource: SpineResource = {
    id: 'spineboy',
    name: 'spineboy',
    version,
    exportVersion: `${version}.0`,
    format: binary ? 'binary' : 'json',
    skeleton: file(`spineboy.${extension}`),
    atlas: file('spineboy.atlas'),
    pages: [{ name: 'spineboy.png', file: file('spineboy.png') }],
    animations: [],
  };
  const bytes = (path: string) =>
    readFileSync(
      new URL(`../../../fixtures/official/${version}/spineboy/${path}`, import.meta.url),
    );
  const provider: ResourceProvider = {
    files: [],
    async readText(file) {
      return bytes(file.path).toString();
    },
    async readBytes(file) {
      return new Uint8Array(bytes(file.path));
    },
    async imageUrl() {
      return { url: 'test.png', release() {} };
    },
  };
  const gl = { isContextLost: () => false, getParameter() {}, pixelStorei() {} };
  const canvas = Object.assign(new EventTarget(), {
    getContext: () => gl,
  }) as unknown as HTMLCanvasElement;
  return { resource, provider, canvas };
}

afterEach(() => vi.unstubAllGlobals());

describe('现代适配器的固定动画范围', () => {
  test.each(
    [v40, v41, v42, v43].flatMap((adapter) =>
      [false, true].map((binary) => ({ adapter, binary })),
    ),
  )(
    '$adapter.version binary=$binary 独立采样整个动作、缓存范围并保持播放进度',
    async ({ adapter, binary }: { adapter: RuntimeAdapter; binary: boolean }) => {
      vi.stubGlobal(
        'Image',
        class {
          onload: (() => void) | null = null;
          onerror: (() => void) | null = null;
          width = 1024;
          height = 1024;
          set src(_value: string) {
            queueMicrotask(() => this.onload?.());
          }
          removeAttribute() {}
        },
      );
      const first = await adapter.load(prepare(adapter.version, binary));
      const control = await adapter.load(prepare(adapter.version, binary));
      try {
        first.play('idle', true);
        control.play('idle', true);
        first.update(0.3);
        control.update(0.3);
        const before = first.getBounds();
        const run = first.getAnimationBounds!('run')!;
        expect(run.width).toBeGreaterThan(0);
        expect(run.height).toBeGreaterThan(0);
        expect(first.getBounds()).toEqual(before);
        first.update(0.2);
        control.update(0.2);
        expect(first.getBounds()).toEqual(control.getBounds());
        expect(first.getAnimationBounds!('run')).toEqual(run);
        // 外部消费者修改返回对象不能污染缓存。
        run.width = 0;
        expect(first.getAnimationBounds!('run')!.width).toBeGreaterThan(0);
        expect(first.getAnimationBounds!('missing')).toBeUndefined();
        const idle = first.getAnimationBounds!('idle')!;
        expect(idle.x).toBeLessThanOrEqual(before.x + 1);
        expect(idle.y).toBeLessThanOrEqual(before.y + 1);
        expect(idle.x + idle.width).toBeGreaterThanOrEqual(before.x + before.width - 1);
        expect(idle.y + idle.height).toBeGreaterThanOrEqual(before.y + before.height - 1);
        first.setSkin('default');
        expect(first.getAnimationBounds!('idle')).toEqual(idle);
      } finally {
        await first.dispose();
        await control.dispose();
      }
      expect(() => first.getAnimationBounds!('idle')).toThrow('释放');
    },
  );
});
