/** 公开跨宿主资源、版本、发现和诊断契约。 */
export type * from './types.js';
/** 公开扩展宿主与 Webview 的可序列化消息协议。 */
export type * from './protocol.js';
/** 公开按需建立完整资源索引的发现入口与默认排除目录。 */
export { discoverResources, DEFAULT_EXCLUDED_DIRECTORIES } from './discover.js';
/** 公开无需 runtime 的 JSON、二进制和完整版本识别。 */
export {
  identifySkeletonJson,
  identifyExportVersion,
  SUPPORTED_SPINE_VERSIONS,
} from './versions.js';
/** 公开骨骼头识别结果，不暴露具体 runtime 类型。 */
export type { SkeletonIdentification } from './versions.js';
/** 公开按两个真实年代头格式识别二进制的入口。 */
export { identifySkeletonBinary } from './binary.js';
/** 公开 atlas 全部页面与原始预乘标记的读取。 */
export { readAtlasPages } from './atlas.js';
/** 公开 atlas 页面诊断所用结构。 */
export type { AtlasPageReference } from './atlas.js';
/** 公开严格相对路径计算，供宿主来源适配复用。 */
export {
  normalizeResourcePath,
  resourceBasename,
  resourceDirectory,
  resolveDependencyPath,
} from './paths.js';
/** 公开结构化错误与诊断转换。 */
export { ResourceError, toDiagnostic } from './diagnostics.js';
/** 公开取消读取与过时代际过滤工具。 */
export { abortable, throwIfAborted, OperationGate } from './cancellation.js';
/** 公开任务令牌，调用方写状态前须检查有效性。 */
export type { OperationToken } from './cancellation.js';
/** 公开可受控的内存资源来源，不访问真实用户文件。 */
export { createMemoryProvider } from './testing.js';
/** 公开内存来源测试输入与错误注入配置。 */
export type { MemoryResourceInput, MemoryProviderOptions } from './testing.js';
