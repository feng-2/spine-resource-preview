/** 支持的 Spine 主、次版本。 */
export type SpineVersion = '3.7' | '3.8' | '4.0' | '4.1' | '4.2' | '4.3';
/** 骨骼导出格式。 */
export type SkeletonFormat = 'json' | 'binary';

/** 可序列化的文件描述，不持有浏览器或编辑器对象。 */
export interface ResourceFile {
  /** 来源内稳定身份。 */
  id: string;
  /** 来源根目录下的相对路径。 */
  path: string;
  /** 文件字节数。 */
  size: number;
  /** 宿主提供的可访问图片地址，浏览器导入可省略。 */
  url?: string;
}

/** 一次图片访问的地址及其独立清理责任。 */
export interface ImageLease {
  /** 图片可访问地址。 */
  url: string;
  /** 释放临时地址，允许重复调用。 */
  release(): void;
}

/** 各端统一文件来源；读取按需进行，图片不通过资源发现预加载。 */
export interface ResourceProvider {
  /** 已枚举文件，非递归场景只包含直接子文件。 */
  readonly files: readonly ResourceFile[];
  /** 读取 UTF-8 文本。 */
  readText(file: ResourceFile, signal?: AbortSignal): Promise<string>;
  /** 读取骨骼二进制。 */
  readBytes(file: ResourceFile, signal?: AbortSignal): Promise<Uint8Array>;
  /** 获取图片地址及释放函数。 */
  imageUrl(file: ResourceFile, signal?: AbortSignal): Promise<ImageLease>;
  /** 解析依赖路径；宿主可按需读取未枚举的子目录图片。 */
  resolve?(path: string, signal?: AbortSignal): Promise<ResourceFile | undefined>;
}

/** 用户可定位的资源诊断。 */
export interface Diagnostic {
  /** 稳定错误码。 */
  code: string;
  /** 发生阶段。 */
  stage: 'discovery' | 'version' | 'dependency' | 'load' | 'render' | 'cleanup';
  /** 中文说明。 */
  message: string;
  /** 文件或资源路径。 */
  path?: string;
}

/** 骨骼及其全部页面依赖，均只持有描述信息。 */
export interface SpineResource {
  /** 骨骼文件稳定身份。 */
  id: string;
  /** 保留目录的展示名称。 */
  name: string;
  /** 对应官方 runtime 的主、次版本。 */
  version: SpineVersion;
  /** 原始完整导出版本。 */
  exportVersion: string;
  /** JSON 或二进制格式。 */
  format: SkeletonFormat;
  /** 骨骼根文件。 */
  skeleton: ResourceFile;
  /** 图集文本。 */
  atlas: ResourceFile;
  /** 图集按顺序引用的页面。 */
  pages: readonly {
    /** atlas 中的原始页名。 */
    name: string;
    /** 已解析的文件。 */
    file: ResourceFile;
    /** atlas 明确声明的预乘标记，未声明时由 runtime 策略决定。 */
    pma?: boolean;
  }[];
  /** JSON 可提前读取动画名；二进制在 runtime 加载后补充。 */
  animations: readonly string[];
}

/** 一次资源发现的范围与首选对象。 */
export interface DiscoveryOptions {
  /** 默认递归发现已枚举的骨骼文件。 */
  recursive?: boolean;
  /** 相对根目录，空字符串代表来源根。 */
  rootPath?: string;
  /** 所选骨骼、atlas 或图片的身份。 */
  preferredFileId?: string;
  /** 扁平多文件导入允许唯一文件名回退。 */
  allowBasenameFallback?: boolean;
  /** 排除发现范围内的目录名/相对路径，显式根目录自身不排除。 */
  exclude?: readonly string[];
  /** 骨骼候选处理进度，不包含图片预加载。 */
  onProgress?: (progress: {
    /** 已处理候选数量。 */
    processed: number;
    /** 候选总数。 */
    total: number;
    /** 当前候选路径。 */
    path: string;
  }) => void;
  /** 取消标识。 */
  signal?: AbortSignal;
}

/** 可用资源与独立失败诊断，单套失败不阻止其他套使用。 */
export interface DiscoveryResult {
  /** 依赖完整的骨骼资源。 */
  resources: readonly SpineResource[];
  /** 发现及版本错误。 */
  diagnostics: readonly Diagnostic[];
  /** 唯一匹配的首选资源。 */
  preferredResourceId?: string;
}
