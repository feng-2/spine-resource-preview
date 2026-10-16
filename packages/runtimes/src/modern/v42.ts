import * as spine from 'spine-webgl-42';
import type { PoseBounds, RuntimeAdapter, RuntimeLoadOptions } from '../types';
import { sampleAnimationBounds } from '../animation-bounds.js';
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

/** 只建立 4.2 官方对象；类型检查保留本版本的 API 差异。 */
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
    const texture = new PageTexture(context, image, page.pma);
    scope.own(() => texture.dispose());
    page.setTexture(texture);
  }
  const attachmentLoader = new spine.AtlasAttachmentLoader(atlas);
  const data =
    typeof assets.skeleton === 'string'
      ? new spine.SkeletonJson(attachmentLoader).readSkeletonData(assets.skeleton)
      : new spine.SkeletonBinary(attachmentLoader).readSkeletonData(assets.skeleton);
  checkExportVersion(data.version, '4.2');
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
      sampleSkeleton.setToSetupPose();
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
      skeleton.setToSetupPose();
      state.setAnimation(0, name, loop);
      state.apply(skeleton);
      skeleton.updateWorldTransform(spine.Physics.reset);
    },
    setSkin(name) {
      skeleton.setSkinByName(name);
      animationBounds.clear();
      skeleton.setSlotsToSetupPose();
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
        renderer.drawSkeleton(skeleton, true);
      } finally {
        renderer.end();
      }
    },
  };
}

/** 4.2 导出数据的官方适配器。 */
export const adapter: RuntimeAdapter = {
  version: '4.2',
  load(options: RuntimeLoadOptions) {
    return loadModernSession('4.2', options, (assets, gl, scope) =>
      buildBackend(options.canvas, assets, gl, scope),
    );
  },
};
