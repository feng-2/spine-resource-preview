import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import * as spine from 'spine-webgl-41';

const fixture = (name: string) =>
  readFileSync(new URL('../../../fixtures/official/4.1/' + name, import.meta.url));

describe('官方 4.1 JSON/binary 真实资源', () => {
  test.each(['spineboy', 'tank'])(
    '两种格式解析并推进所有动作，边界有效且动作列表相同：%s',
    (basename) => {
      const path = `${basename}/`;
      const read = (name: string) => fixture(path + name);
      const atlas = new spine.TextureAtlas(read(`${basename}.atlas`).toString());
      // Node中的无GPU纹理只提供atlas真实尺寸，骨骼仍由官方完整解析器读取。
      for (const page of atlas.pages)
        page.setTexture(
          new spine.FakeTexture({
            width: page.width,
            height: page.height,
          } as HTMLImageElement),
        );
      const attachmentLoader = new spine.AtlasAttachmentLoader(atlas);
      const json = new spine.SkeletonJson(attachmentLoader).readSkeletonData(
        read(`${basename}.json`).toString(),
      );
      const binary = new spine.SkeletonBinary(attachmentLoader).readSkeletonData(
        new Uint8Array(read(`${basename}.skel`)),
      );
      expect(json.version).toMatch(/^4[.]1/);
      expect(binary.version).toMatch(/^4[.]1/);
      expect(binary.animations.map((animation) => animation.name)).toEqual(
        json.animations.map((animation) => animation.name),
      );
      expect(
        json.animations.some(
          (animation) => animation.name === (basename === 'tank' ? 'drive' : 'run'),
        ),
      ).toBe(true);
      for (const data of [json, binary]) {
        const skeleton = new spine.Skeleton(data);
        const state = new spine.AnimationState(new spine.AnimationStateData(data));
        for (const animation of data.animations) {
          state.clearTracks();
          state.setAnimation(0, animation.name, true);
          for (let frame = 0; frame < 10; frame++) {
            state.update(1 / 60);
            state.apply(skeleton);
            skeleton.updateWorldTransform();
          }
          const bounds = skeleton.getBoundsRect();
          expect(Object.values(bounds).every(Number.isFinite)).toBe(true);
          expect(bounds.width).toBeGreaterThan(0);
          expect(bounds.height).toBeGreaterThan(0);
        }
      }
    },
  );
});
