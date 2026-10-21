import * as spine from 'spine-webgl-43';
import type { PoseBounds, RuntimeAdapter, RuntimeLoadOptions, SlotPose } from '../types';
import { sampleAnimationBounds } from '../animation-bounds.js';
import { boundsFromVertices } from '../slot-overlay.js';
import {
  loadModernSession,
  checkExportVersion,
  type ModernBackend,
  type PreparedAssets,
  CleanupScope,
} from './common';

/** 计算当前插槽姿态中的附件范围和骨骼锚点，不改变骨骼状态。 */
function slotPose(
  skeleton: spine.Skeleton,
  name: string,
  vertices: number[],
): SlotPose | undefined {
  const slot = skeleton.slots.find((candidate) => candidate.data.name === name);
  if (!slot) return undefined;
  // 4.3 渲染器使用约束后的 applied pose，锚点必须与绘制姿态一致。
  const anchor = {
    x: slot.bone.appliedPose.worldX,
    y: slot.bone.appliedPose.worldY,
  };
  const attachment = slot.pose.attachment;
  if (!attachment) return { anchor };
  if (attachment instanceof spine.RegionAttachment) {
    vertices.length = 8;
    attachment.computeWorldVertices(
      slot,
      attachment.getOffsets(slot.pose),
      vertices,
      0,
      2,
    );
    const bounds = boundsFromVertices(vertices, 8);
    return bounds ? { anchor, bounds } : { anchor };
  }
  if (
    attachment instanceof spine.VertexAttachment &&
    attachment.worldVerticesLength > 0
  ) {
    const count = attachment.worldVerticesLength;
    vertices.length = count;
    attachment.computeWorldVertices(skeleton, slot, 0, count, vertices, 0, 2);
    const bounds = boundsFromVertices(vertices, count);
    return bounds ? { anchor, bounds } : { anchor };
  }
  return { anchor };
}

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
  const slotVertices: number[] = [];
  const renderer = new spine.SceneRenderer(canvas, context, true);
  scope.own(() => renderer.dispose());
  renderer.skeletonRenderer.pmaAdditiveBatching = false;
  skeleton.updateWorldTransform(spine.Physics.reset);
  return {
    animations: data.animations.map((animation) => animation.name),
    skins: data.skins.map((skin) => skin.name),
    slots: data.slots.map((slot) => slot.name),
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
    getSlotPose(name) {
      return slotPose(skeleton, name, slotVertices);
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
