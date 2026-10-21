import * as spine from 'spine-webgl-41';
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

/** 将每页输入统一上传为PMA，避免混合图集页拆分绘制破坏裁剪。 */
class PageTexture extends spine.GLTexture {
  private sourcePma = false;

  constructor(
    context: spine.ManagedWebGLRenderingContext,
    image: HTMLImageElement,
    pma: boolean,
  ) {
    super(context, image);
    this.sourcePma = pma;
    this.update(false);
  }

  /** 重建纹理时也恢复该页的上传策略，不更改 runtime 全局标记。 */
  override update(useMipMaps: boolean): void {
    const gl = this.context.gl;
    const previous = gl.getParameter(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !this.sourcePma);
    try {
      super.update(useMipMaps);
    } finally {
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, previous);
    }
  }
}

/** 计算当前插槽附件的世界范围和骨骼锚点，不改变姿态。 */
function slotPose(
  skeleton: spine.Skeleton,
  name: string,
  vertices: number[],
): SlotPose | undefined {
  const slot = skeleton.slots.find((candidate) => candidate.data.name === name);
  if (!slot) return undefined;
  const anchor = { x: slot.bone.worldX, y: slot.bone.worldY };
  const attachment = slot.attachment;
  if (!attachment) return { anchor };
  if (attachment instanceof spine.RegionAttachment) {
    vertices.length = 8;
    attachment.computeWorldVertices(slot, vertices, 0, 2);
    const bounds = boundsFromVertices(vertices, 8);
    return bounds ? { anchor, bounds } : { anchor };
  }
  if (
    attachment instanceof spine.VertexAttachment &&
    attachment.worldVerticesLength > 0
  ) {
    const count = attachment.worldVerticesLength;
    vertices.length = count;
    attachment.computeWorldVertices(slot, 0, count, vertices, 0, 2);
    const bounds = boundsFromVertices(vertices, count);
    return bounds ? { anchor, bounds } : { anchor };
  }
  return { anchor };
}

/** 只建立 4.1 官方对象；类型检查保留本版本的 API 差异。 */
function buildBackend(
  canvas: HTMLCanvasElement,
  assets: PreparedAssets,
  gl: WebGLRenderingContext,
  scope: CleanupScope,
): ModernBackend {
  const context = new spine.ManagedWebGLRenderingContext(gl);
  const atlas = new spine.TextureAtlas(assets.atlasText);
  for (const page of atlas.pages) {
    const image = assets.images.get(page.name);
    if (!image) throw new Error(`图集页图片缺失：${page.name}`);
    const texture = new PageTexture(context, image, page.pma);
    scope.own(() => texture.dispose());
    page.setTexture(texture);
  }
  const attachmentLoader = new spine.AtlasAttachmentLoader(atlas);
  const data =
    typeof assets.skeleton === 'string'
      ? new spine.SkeletonJson(attachmentLoader).readSkeletonData(assets.skeleton)
      : new spine.SkeletonBinary(attachmentLoader).readSkeletonData(assets.skeleton);
  checkExportVersion(data.version, '4.1');
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
  skeleton.updateWorldTransform();
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
      sampleSkeleton.setToSetupPose();
      sampleState.setAnimation(0, name, false);
      try {
        const bounds = sampleAnimationBounds(animation.duration, (seconds) => {
          sampleState.update(seconds);
          sampleState.apply(sampleSkeleton);
          sampleSkeleton.updateWorldTransform();
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
      skeleton.setToSetupPose();
      state.setAnimation(0, name, loop);
      state.apply(skeleton);
      skeleton.updateWorldTransform();
    },
    setSkin(name) {
      skeleton.setSkinByName(name);
      animationBounds.clear();
      skeleton.setSlotsToSetupPose();
      state.apply(skeleton);
      skeleton.updateWorldTransform();
    },
    update(seconds) {
      state.update(seconds);
      state.apply(skeleton);
      skeleton.updateWorldTransform();
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
        renderer.drawSkeleton(skeleton, true);
      } finally {
        renderer.end();
      }
    },
  };
}

/** 4.1 导出数据的官方适配器。 */
export const adapter: RuntimeAdapter = {
  version: '4.1',
  load(options: RuntimeLoadOptions) {
    return loadModernSession('4.1', options, (assets, gl, scope) =>
      buildBackend(options.canvas, assets, gl, scope),
    );
  },
};
