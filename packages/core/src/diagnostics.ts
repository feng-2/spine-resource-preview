import type { Diagnostic } from './types.js';

/** 携带结构化中文诊断的核心错误，调用方可保留具体阶段与错误码。 */
export class ResourceError extends Error {
  /** 适合界面展示和协议传递的错误信息。 */
  readonly diagnostic: Diagnostic;

  /** 建立可定位错误，不把底层错误对象加入跨宿主协议。 */
  constructor(diagnostic: Diagnostic) {
    super(diagnostic.message);
    this.name = 'ResourceError';
    this.diagnostic = diagnostic;
  }
}

/** 将未知异常转换为中文定位诊断，已知核心错误保持其错误码和阶段。 */
export function toDiagnostic(
  error: unknown,
  path: string,
  stage: Diagnostic['stage'] = 'discovery',
): Diagnostic {
  if (error instanceof ResourceError)
    return { ...error.diagnostic, path: error.diagnostic.path ?? path };
  return {
    code: stage === 'dependency' ? 'DEPENDENCY_READ_FAILED' : 'FILE_READ_FAILED',
    stage,
    path,
    message: `读取「${path}」失败：${error instanceof Error ? error.message : String(error)}`,
  };
}
