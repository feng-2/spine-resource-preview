/** 旧官方 runtime 中使用的可释放对象，不包含应用调度或输入。 */
export interface LegacyDisposable {
  /** 删除对象持有的 GPU 资源。 */
  dispose(): void;
}

/** 旧版官方 atlas 所需的纹理接口。 */
export interface LegacyTexture extends LegacyDisposable {
  /** 返回已解码页面尺寸。 */
  getImage(): { /** 页宽。 */ width: number; /** 页高。 */ height: number };
  /** 应用官方 atlas 中的最小化与放大过滤器枚举。 */
  setFilters(min: number, mag: number): void;
  /** 应用官方 atlas 中的水平与垂直寻址模式。 */
  setWraps(u: number, v: number): void;
}

/** 骨骼共享数据，只读取原始动画和皮肤名称。 */
export interface LegacySkeletonData {
  /** 原始动画数据的名称。 */
  animations: {
    /** 动画名。 */ name: string;
    /** 原始时长（秒）。 */ duration: number;
  }[];
  /** 官方解析结果保留的完整导出版本。 */
  version: string;
  /** 原始皮肤数据的名称。 */
  skins: { /** 皮肤名。 */ name: string }[];
  /** setup pose 中的插槽数据。 */
  slots: { /** 插槽名。 */ name: string }[];
}

/** 旧 runtime 中插槽所属的骨骼世界变换。 */
export interface LegacyBone {
  /** 世界横坐标。 */
  worldX: number;
  /** 世界纵坐标。 */
  worldY: number;
}

/** 所有旧版附件的共同身份。 */
export interface LegacyAttachment {
  /** 附件名。 */
  name: string;
}

/** 旧版区域附件使用骨骼进行世界顶点变换。 */
export interface LegacyRegionAttachment extends LegacyAttachment {
  /** 将四个区域顶点转换到世界坐标。 */
  computeWorldVertices(
    bone: LegacyBone,
    worldVertices: number[],
    offset: number,
    stride: number,
  ): void;
}

/** 旧版网格、包围盒、路径及点附件共享的顶点数据。 */
export interface LegacyVertexAttachment extends LegacyAttachment {
  /** 可输出的世界顶点值数量。 */
  worldVerticesLength: number;
  /** 使用插槽当前姿态和变形转换顶点。 */
  computeWorldVertices(
    slot: LegacySlot,
    start: number,
    count: number,
    worldVertices: number[],
    offset: number,
    stride: number,
  ): void;
}

/** 独立骨骼实例中的当前插槽状态。 */
export interface LegacySlot {
  /** 插槽 setup pose 数据。 */
  data: { /** 插槽名。 */ name: string };
  /** 所属骨骼的当前世界变换。 */
  bone: LegacyBone;
  /** 当前附件；空插槽为 null。 */
  attachment: LegacyAttachment | null;
}

/** 旧版官方骨骼实例，纵轴保持向上。 */
export interface LegacySkeleton {
  /** 当前骨骼中的全部插槽。 */
  slots: LegacySlot[];
  /** 从初始数据恢复骨骼、插槽和约束。 */
  setToSetupPose(): void;
  /** 恢复皮肤切换后的插槽姿态。 */
  setSlotsToSetupPose(): void;
  /** 切换已经验证存在的原始皮肤。 */
  setSkinByName(name: string): void;
  /** 推进骨骼内部时间。 */
  update(seconds: number): void;
  /** 根据当前局部姿态计算官方约束与世界变换。 */
  updateWorldTransform(): void;
  /** 取得当前区域和网格附件的世界边界。 */
  getBounds(offset: LegacyVector, size: LegacyVector, temp: number[]): void;
}

/** 旧 runtime 用于返回坐标的可变向量。 */
export interface LegacyVector {
  /** 横坐标。 */
  x: number;
  /** 纵坐标。 */
  y: number;
  /** 设置两个坐标并返回向量本身。 */
  set(x: number, y: number): LegacyVector;
}

/** 无自动 ticker 的官方动画状态。 */
export interface LegacyAnimationState {
  /** 清除所有播放轨道。 */
  clearTracks(): void;
  /** 清除应用监听。 */
  clearListeners(): void;
  /** 在轨道零从头设置动作。 */
  setAnimation(track: number, name: string, loop: boolean): unknown;
  /** 使用秒推进官方动画时间。 */
  update(seconds: number): void;
  /** 将动画姿态应用至骨骼。 */
  apply(skeleton: LegacySkeleton): boolean;
}

/** 原始官方 WebGL shader；统一使用支持双色 tint 的分支。 */
export interface LegacyShader extends LegacyDisposable {
  /** 激活绘制程序。 */
  bind(): void;
  /** 取消绘制程序。 */
  unbind(): void;
  /** 设置整型 uniform。 */
  setUniformi(name: string, value: number): void;
  /** 设置投影矩阵 uniform。 */
  setUniform4x4f(name: string, values: Float32Array): void;
}

/** 原始官方多边形批处理器。 */
export interface LegacyBatcher extends LegacyDisposable {
  /** 开始一个透明骨骼绘制批次。 */
  begin(shader: LegacyShader): void;
  /** 提交剩余顶点并结束批次。 */
  end(): void;
}

/** 仅声明已在官方 3.7/3.8 产物核实的共同 API，算法仍来自对应 vendor。 */
export interface LegacyRuntime {
  /** 官方向量构造器。 */
  Vector2: new (x?: number, y?: number) => LegacyVector;
  /** 官方 atlas 解析器，页纹理必须在回调前准备完成。 */
  TextureAtlas: new (text: string, load: (path: string) => LegacyTexture) => unknown;
  /** 官方附件加载器，保留旋转、linked mesh 和 clipping 等语义。 */
  AtlasAttachmentLoader: new (atlas: unknown) => unknown;
  /** 官方同版本 JSON 骨骼解析器。 */
  SkeletonJson: new (loader: unknown) => {
    /** 使用原始 JSON 建立骨骼数据，不转换导出版本。 */
    readSkeletonData(json: unknown): LegacySkeletonData;
  };
  /** 仅 3.8 官方产物包含二进制解析器，3.7 明确缺失。 */
  SkeletonBinary?: new (loader: unknown) => {
    /** 使用原始二进制建立骨骼数据。 */
    readSkeletonData(bytes: Uint8Array): LegacySkeletonData;
  };
  /** 官方独立骨骼实例构造器。 */
  Skeleton: new (data: LegacySkeletonData) => LegacySkeleton;
  /** 官方区域附件类型，用于区分顶点计算签名。 */
  RegionAttachment: new (...args: unknown[]) => LegacyRegionAttachment;
  /** 官方顶点附件类型，用于读取网格和包围盒几何。 */
  VertexAttachment: new (...args: unknown[]) => LegacyVertexAttachment;
  /** 官方动画状态配置构造器。 */
  AnimationStateData: new (data: LegacySkeletonData) => unknown;
  /** 官方动画状态构造器。 */
  AnimationState: new (data: unknown) => LegacyAnimationState;
  /** 官方 WebGL 命名空间。 */
  webgl: {
    /** 借用现有原生 context，避免官方 canvas 分支安装无法解除的匿名监听。 */
    ManagedWebGLRenderingContext: new (
      gl: WebGLRenderingContext | WebGL2RenderingContext,
    ) => unknown;
    /** 官方页面纹理构造器。 */
    GLTexture: new (
      context: unknown,
      image: HTMLImageElement,
      mipmaps?: boolean,
    ) => LegacyTexture;
    /** 官方双色 tint shader 工厂及固定 uniform 名。 */
    Shader: {
      /** 官方投影矩阵 uniform。 */
      MVP_MATRIX: string;
      /** 官方页采样器 uniform。 */
      SAMPLER: string;
      /** 创建官方双色纹理 shader。 */
      newTwoColoredTextured(context: unknown): LegacyShader;
    };
    /** 官方批处理器构造器。 */
    PolygonBatcher: new (context: unknown, twoColor?: boolean) => LegacyBatcher;
    /** 官方 SkeletonRenderer 构造器。 */
    SkeletonRenderer: new (
      context: unknown,
      twoColor?: boolean,
    ) => {
      /** 所有页面上传后均以 PMA 绘制。 */
      premultipliedAlpha: boolean;
      /** 使用官方裁剪、draw order、tint 与 blend mode 绘制骨骼。 */
      draw(batcher: LegacyBatcher, skeleton: LegacySkeleton): void;
    };
  };
}
