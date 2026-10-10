import type { CameraState, RuntimeSession, PoseBounds } from '../types.js';
import type {
  LegacyRuntime,
  LegacySkeleton,
  LegacySkeletonData,
  LegacyAnimationState,
  LegacyShader,
  LegacyBatcher,
  LegacyVector,
} from './contracts.js';
import type { LegacyOwnership } from './ownership.js';

/** 会话的活动对象；关闭后解除整组引用，避免长期保留 atlas 图片。 */
export interface LegacySessionObjects {
  /** 本次会话独占画布。 */
  canvas: HTMLCanvasElement;
  /** 官方 renderer 借用的原生上下文。 */
  gl: WebGLRenderingContext | WebGL2RenderingContext;
  /** 同版本骨骼实例。 */
  skeleton: LegacySkeleton;
  /** 同版本动画状态。 */
  state: LegacyAnimationState;
  /** 同版本双色 tint shader。 */
  shader: LegacyShader;
  /** 同版本官方批处理器。 */
  batcher: LegacyBatcher;
  /** 官方绘制器，保持 clipping 与 draw order 状态。 */
  renderer: InstanceType<LegacyRuntime['webgl']['SkeletonRenderer']>;
  /** 官方投影矩阵 uniform 名。 */
  matrixUniform: string;
  /** 官方纹理采样 uniform 名。 */
  samplerUniform: string;
  /** 边界计算复用的偏移向量。 */
  offset: LegacyVector;
  /** 边界计算复用的尺寸向量。 */
  size: LegacyVector;
}

/** 官方 3.7/3.8 的独立会话，不安装 ticker、DOM 输入或相机控制。 */
export class LegacySession implements RuntimeSession {
  /** 会话固定官方版本，不能在运行中转换。 */
  readonly version: '3.7' | '3.8';
  /** 原始动画名，顺序来自骨骼数据。 */
  readonly animations: readonly string[];
  /** 原始皮肤名，顺序来自骨骼数据。 */
  readonly skins: readonly string[];
  private objects: LegacySessionObjects | undefined;
  private readonly vertices: number[] = [];
  private readonly matrix = new Float32Array(16);

  /** 接收已准备好的官方对象和其完整清理责任，不追加异步任务。 */
  constructor(
    version: '3.7' | '3.8',
    data: LegacySkeletonData,
    objects: LegacySessionObjects,
    private readonly ownership: LegacyOwnership,
  ) {
    this.version = version;
    this.animations = Object.freeze(data.animations.map((animation) => animation.name));
    this.skins = Object.freeze(data.skins.map((skin) => skin.name));
    this.objects = objects;
  }

  play(name: string, loop: boolean): void {
    const { skeleton, state } = this.active();
    if (!this.animations.includes(name)) throw new Error(`Spine 动画不存在：${name}`);
    // 清除前动作轨道并恢复全部 setup pose，避免未被新动作覆盖的骨骼残留。
    state.clearTracks();
    skeleton.setToSetupPose();
    state.setAnimation(0, name, loop);
    state.apply(skeleton);
    skeleton.updateWorldTransform();
  }

  setSkin(name: string): void {
    const { skeleton, state } = this.active();
    if (!this.skins.includes(name)) throw new Error(`Spine 皮肤不存在：${name}`);
    skeleton.setSkinByName(name);
    skeleton.setSlotsToSetupPose();
    state.apply(skeleton);
    skeleton.updateWorldTransform();
  }

  update(seconds: number): void {
    const { skeleton, state } = this.active();
    if (!Number.isFinite(seconds) || seconds < 0)
      throw new RangeError('Spine 更新秒数必须为非负有限数');
    // 本层仅推进收到的秒数，暂停、速度与后台恢复由公共预览时钟控制。
    skeleton.update(seconds);
    state.update(seconds);
    state.apply(skeleton);
    skeleton.updateWorldTransform();
  }

  getBounds(): PoseBounds {
    const { skeleton, offset, size } = this.active();
    skeleton.getBounds(offset, size, this.vertices);
    if (![offset.x, offset.y, size.x, size.y].every(Number.isFinite))
      return { x: 0, y: 0, width: 0, height: 0 };
    return {
      x: offset.x,
      y: offset.y,
      width: Math.max(0, size.x),
      height: Math.max(0, size.y),
    };
  }

  render(camera: CameraState): void {
    const objects = this.active();
    const { gl, canvas, skeleton, shader, batcher, renderer } = objects;
    if (
      ![camera.width, camera.height, camera.zoom, camera.centerX, camera.centerY].every(
        Number.isFinite,
      ) ||
      camera.width <= 0 ||
      camera.height <= 0 ||
      camera.zoom <= 0
    )
      throw new RangeError('Spine 相机尺寸与缩放必须为正有限数');
    const dpr = Math.max(1, globalThis.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(camera.width * dpr));
    const height = Math.max(1, Math.round(camera.height * dpr));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.SCISSOR_TEST);
    gl.colorMask(true, true, true, true);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 1 倍缩放是一个骨骼单位对应一个逻辑像素；DPR 仅影响 framebuffer。
    const visibleWidth = camera.width / camera.zoom;
    const visibleHeight = camera.height / camera.zoom;
    this.matrix.fill(0);
    this.matrix[0] = 2 / visibleWidth;
    this.matrix[5] = 2 / visibleHeight;
    this.matrix[10] = -1;
    this.matrix[12] = (-2 * camera.centerX) / visibleWidth;
    this.matrix[13] = (-2 * camera.centerY) / visibleHeight;
    this.matrix[15] = 1;
    shader.bind();
    let drawing = false;
    try {
      shader.setUniformi(objects.samplerUniform, 0);
      shader.setUniform4x4f(objects.matrixUniform, this.matrix);
      batcher.begin(shader);
      drawing = true;
      renderer.draw(batcher, skeleton);
    } finally {
      // 绘制失败也结束批次，避免失败帧遗留程序绑定状态。
      try {
        if (drawing) batcher.end();
      } finally {
        shader.unbind();
      }
    }
  }

  dispose(): void {
    // 先关闭会话入口；即使某个 GPU 删除失败也不允许后续更新已关闭实例。
    this.objects = undefined;
    this.vertices.length = 0;
    this.ownership.dispose();
  }

  private active(): LegacySessionObjects {
    if (!this.objects) throw new Error('Spine 会话已释放');
    if (this.objects.gl.isContextLost())
      throw new Error('Spine WebGL 上下文已丢失，请重新加载资源');
    return this.objects;
  }
}
