import * as spine from 'spine-webgl-43';
import type { PoseBounds, RuntimeAdapter, RuntimeLoadOptions } from '../types';
import { sampleAnimationBounds } from '../animation-bounds.js';
import {
  loadModernSession,
  checkExportVersion,
  type ModernBackend,
  type PreparedAssets,
  CleanupScope,
} from './common';

/** 只建立 4.3 官方对象；类型检查保留本版本的 API 差异。 */
function buildBackend(
  canvas: HTMLCanvasElement,
  assets: PreparedAssets,
  gl: WebGLRenderingContext,
  scope: CleanupScope,
): ModernBackend {
  const context = new spine.ManagedWebGLRenderingContext(gl);
  scope.own(() => context.dispose());
  const atlas = new spine.TextureAtlas(assets.atlasText);
  for (const page of atlas.pages) {
    const image = assets.images.get(page.name);
    if (!image) throw new Error(`图集页图片缺失：${page.name}`);
    const texture = new spine.GLTexture(context, image, page.pma);
    scope.own(() => texture.dispose());
    page.setTexture(texture);
  }
  const attachmentLoader = new spine.AtlasAttachmentLoader(atlas);
  const data =
    typeof assets.skeleton === 'string'
      ? new spine.SkeletonJson(attachmentLoader).readSkeletonData(assets.skeleton)
      : new spine.SkeletonBinary(attachmentLoader).readSkeletonData(assets.skeleton);
  checkExportVersion(data.version, '4.3');
  const skeleton = new spine.Skeleton(data);
  const state = new spine.AnimationState(new spine.AnimationStateData(data));
  scope.own(() => {
    state.clearTracks();
    state.clearListeners();
  });
  const animationBounds = new Map<string, PoseBounds>();
  scope.own(() => animationBounds.clear());
  const renderer = new spine.SceneRenderer(canvas, context, true);
  scope.own(() => renderer.dispose());
  renderer.skeletonRenderer.pmaAdditiveBatching = false;
  skeleton.updateWorldTransform(spine.Physics.reset);
  return {
    animations: data.animations.map((animation) => animation.name),
    skins: data.skins.map((skin) => skin.name),
    getAnimationDuration(name) {
      return data.findAnimation(name)?.duration;
    },
    getAnimationBounds(name) {
      const animation = data.findAnimation(name);
      if (!animation) return undefined;
      const cached = animationBounds.get(name);
      if (cached) return { ...cached };
      const sampleSkeleton = new spine.Skeleton(data);
      const sampleState = new spine.AnimationState(new spine.AnimationStateData(data));
      if (skeleton.skin) sampleSkeleton.setSkin(skeleton.skin);
      sampleSkeleton.setupPose();
      sampleState.setAnimation(0, name, false);
      let first = true;
      try {
        const bounds = sampleAnimationBounds(animation.duration, (seconds) => {
          sampleSkeleton.update(seconds);
          sampleState.update(seconds);
          sampleState.apply(sampleSkeleton);
          sampleSkeleton.updateWorldTransform(
            first ? spine.Physics.reset : spine.Physics.update,
          );
          first = false;
          return sampleSkeleton.getBoundsRect();
        });
        animationBounds.set(name, bounds);
        return { ...bounds };
      } finally {
        sampleState.clearTracks();
        sampleState.clearListeners();
      }
    },
    play(name, loop) {
      if (!data.findAnimation(name)) throw new Error(`动作不存在：${name}`);
      state.clearTracks();
      skeleton.setupPose();
      state.setAnimation(0, name, loop);
      state.apply(skeleton);
      skeleton.updateWorldTransform(spine.Physics.reset);
    },
    setSkin(name) {
      skeleton.setSkin(name);
      animationBounds.clear();
      skeleton.setupPoseSlots();
      state.apply(skeleton);
      skeleton.updateWorldTransform(spine.Physics.reset);
    },
    update(seconds) {
      skeleton.update(seconds);
      state.update(seconds);
      state.apply(skeleton);
      skeleton.updateWorldTransform(spine.Physics.update);
    },
    getBounds() {
      return skeleton.getBoundsRect();
    },
    render(camera) {
      renderer.camera.position.x = camera.centerX;
      renderer.camera.position.y = camera.centerY;
      renderer.camera.setViewport(
        camera.width / camera.zoom,
        camera.height / camera.zoom,
      );
      renderer.camera.zoom = 1;
      renderer.begin();
      try {
        renderer.drawSkeleton(skeleton);
      } finally {
        renderer.end();
      }
    },
  };
}

/** 4.3 导出数据的官方适配器。 */
export const adapter: RuntimeAdapter = {
  version: '4.3',
  load(options: RuntimeLoadOptions) {
    return loadModernSession('4.3', options, (assets, gl, scope) =>
      buildBackend(options.canvas, assets, gl, scope),
    );
  },
};
