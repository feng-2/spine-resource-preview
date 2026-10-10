import { ResourceError } from './diagnostics.js';
import { identifyExportVersion, type SkeletonIdentification } from './versions.js';

/** 按 Spine BinaryInput 规范读取长度前缀字符串，仅用于头识别。 */
class HeaderReader {
  constructor(
    /** 只读的原始文件字节。 */
    private readonly bytes: Uint8Array,
    /** 当前头读取位置，不进入附件和动画数据。 */
    public position = 0,
  ) {}

  readString(): string | null {
    let length = 0;
    let shift = 0;
    for (let count = 0; count < 5; count++) {
      const byte = this.bytes[this.position++];
      if (byte === undefined) throw new Error('长度字段截断');
      if (count === 4 && byte > 15) throw new Error('长度字段溢出');
      length += (byte & 0x7f) * 2 ** shift;
      if ((byte & 0x80) === 0) {
        if (length === 0) return null;
        if (length === 1) return '';
        // 版本和旧 hash 极短；限制头读取范围，避免对损坏长度分配大量内存。
        if (length > 1024 || this.position + length - 1 > this.bytes.length)
          throw new Error('头字符串截断或过长');
        const text = new TextDecoder('utf-8', { fatal: true }).decode(
          this.bytes.subarray(this.position, this.position + length - 1),
        );
        this.position += length - 1;
        return text;
      }
      shift += 7;
    }
    throw new Error('长度字段无法终止');
  }
}

/** 按实际头格式识别完整二进制版本；3.x 字符串 hash，4.x 固定八字节 hash。 */
export function identifySkeletonBinary(bytes: Uint8Array): SkeletonIdentification {
  const candidates: {
    /** 读取到的原始版本。 */ version: string;
    /** 版本字段后的偏移。 */ offset: number;
  }[] = [];
  // 两种头各自只接受对应年代的版本，不能把错误偏移中碰巧出现的文本当成路由。
  for (const family of ['legacy', 'modern'] as const) {
    try {
      const reader = new HeaderReader(bytes, family === 'modern' ? 8 : 0);
      if (family === 'legacy') reader.readString();
      const version = reader.readString();
      if (version && /^\d+\.\d+(?:[.\w-]*)$/u.test(version)) {
        const major = Number(version.split('.')[0]);
        if ((family === 'legacy' && major < 4) || (family === 'modern' && major >= 4))
          candidates.push({ version, offset: reader.position });
      }
    } catch {
      // 损坏头或不对应的头布局不参与版本判断，不扫描整个文件中的任意版本字符串。
    }
  }
  if (candidates.length !== 1)
    throw new ResourceError({
      code: candidates.length ? 'BINARY_HEADER_AMBIGUOUS' : 'BINARY_HEADER_INVALID',
      stage: 'version',
      message: candidates.length
        ? '二进制骨骼头存在版本歧义，无法安全选择 runtime。'
        : '无法读取 Spine 二进制骨骼头；文件可能损坏、截断或不是 .skel 导出。',
    });
  const candidate = candidates[0]!;
  const identification = identifyExportVersion(candidate.version, 'binary');
  // 检查版本头后的最小尺寸字段；完整附件与动画解析仍交给同版本官方 runtime。
  const required =
    identification.version === '4.2' || identification.version === '4.3' ? 21 : 17;
  if (bytes.length < candidate.offset + required)
    throw new ResourceError({
      code: 'BINARY_HEADER_TRUNCATED',
      stage: 'version',
      message: `Spine ${candidate.version} 二进制尺寸头被截断。`,
    });
  return identification;
}
