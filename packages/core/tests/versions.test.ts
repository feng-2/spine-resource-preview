import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  identifySkeletonBinary,
  identifySkeletonJson,
  identifyExportVersion,
  ResourceError,
  SUPPORTED_SPINE_VERSIONS,
} from '../src/index.js';

function skeleton(version: string): string {
  return JSON.stringify({
    skeleton: { spine: version },
    bones: [{ name: 'root' }],
    animations: { idle: {}, run: {} },
  });
}

describe('原始 JSON 版本识别', () => {
  it.each(SUPPORTED_SPINE_VERSIONS)(
    '%s 只路由同主次版本并保留完整导出号与动画名',
    (version) => {
      expect(identifySkeletonJson(skeleton(`${version}.99`))).toMatchObject({
        version,
        exportVersion: `${version}.99`,
        format: 'json',
        animations: ['idle', 'run'],
      });
    },
  );

  it('普通配置、spritesheet 和含 skeleton 配置字段的 JSON 均跳过', () => {
    for (const text of [
      '{}',
      '[]',
      '{"frames":{},"meta":{}}',
      '{"skeleton":{"path":"hero.json"}}',
    ])
      expect(identifySkeletonJson(text)).toBeUndefined();
  });

  it('缺失、未知和错误版本保留具体诊断，不猜最新版本', () => {
    const cases = [
      ['{"bones":[{"name":"root"}]}', 'VERSION_MISSING'],
      [skeleton('4.4.0'), 'VERSION_UNSUPPORTED'],
      [skeleton('4.2-snapshot'), 'VERSION_INVALID'],
      ['{broken', 'JSON_INVALID'],
    ];
    for (const [text, code] of cases) {
      try {
        identifySkeletonJson(text!);
        throw new Error('应拒绝数据');
      } catch (error) {
        expect((error as ResourceError).diagnostic.code).toBe(code);
      }
    }
  });

  it('beta 导出保留同版本路由与明确说明，3.8.75 历史二进制单独拒绝', () => {
    const beta = identifySkeletonJson(skeleton('4.3.75-beta'))!;
    expect(beta.version).toBe('4.3');
    expect(beta.exportVersion).toBe('4.3.75-beta');
    expect(beta.diagnostics[0]?.code).toBe('VERSION_PRERELEASE');
    expect(() => identifyExportVersion('3.8.75', 'binary')).toThrow('官方 Spine 3.8');
    expect(identifyExportVersion('3.8.75', 'json').version).toBe('3.8');
  });

  it('JSON 损坏骨骼和动画结构在建立依赖前失败，UTF-8 BOM 可识别', () => {
    expect(() =>
      identifySkeletonJson('{"skeleton":{"spine":"4.2.22"},"bones":[]}'),
    ).toThrow('bones');
    expect(() =>
      identifySkeletonJson(
        '{"skeleton":{"spine":"4.2.22"},"bones":[{}],"animations":[]}',
      ),
    ).toThrow('animations');
    expect(identifySkeletonJson(`\uFEFF${skeleton('3.8.99')}`)?.version).toBe('3.8');
  });
});

describe('官方完整二进制夹具识别', () => {
  it.each(['3.8', '4.0', '4.1', '4.2', '4.3'] as const)(
    '%s 完整官方 spineboy 文件使用实际头格式',
    async (version) => {
      const bytes = await readFile(
        new URL(
          `../../../fixtures/official/${version}/spineboy/spineboy.skel`,
          import.meta.url,
        ),
      );
      const actual = identifySkeletonBinary(bytes);
      expect(actual.version).toBe(version);
      expect(actual.format).toBe('binary');
      expect(actual.exportVersion.startsWith(`${version}.`)).toBe(true);
      expect(bytes.byteLength).toBeGreaterThan(60_000);
    },
  );

  it('完整官方 3.7 文件专门拒绝，不能错误交给 3.8 runtime', async () => {
    const bytes = await readFile(
      new URL(
        '../../../fixtures/negative/official-3.7-binary/spineboy.skel',
        import.meta.url,
      ),
    );
    try {
      identifySkeletonBinary(bytes);
      throw new Error('应拒绝 3.7 binary');
    } catch (error) {
      expect((error as ResourceError).diagnostic.code).toBe('BINARY_37_UNSUPPORTED');
    }
  });

  it('固定 commit 夹具哈希与来源记录一致，保留上游许可证', async () => {
    const root = new URL('../../../', import.meta.url);
    const manifest = JSON.parse(
      await readFile(new URL('fixtures/official/download-manifest.json', root), 'utf8'),
    ) as {
      /** 官方版本及许可证。 */
      versions: { version: string; commit: string; license: string }[];
      /** 原始文件的来源与哈希。 */
      files: { path: string; sha256: string; commit: string }[];
    };
    expect(manifest.versions).toHaveLength(6);
    for (const source of manifest.versions) {
      const path =
        source.version === '3.7'
          ? 'fixtures/negative/official-3.7-binary/spineboy.skel'
          : `fixtures/official/${source.version}/spineboy/spineboy.skel`;
      const record = manifest.files.find((file) => file.path === path);
      expect(record).toBeDefined();
      const bytes = await readFile(new URL(path, root));
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(record!.sha256);
      expect(source.commit).toMatch(/^[a-f\d]{40}$/u);
      expect(record!.commit).toBe(source.commit);
      expect(await readFile(new URL(source.license, root), 'utf8')).toContain(
        'Spine Runtimes',
      );
    }
  });

  it('截断头、随机数据和版本之后截断的真实文件均失败', async () => {
    const bytes = await readFile(
      new URL('../../../fixtures/official/4.2/spineboy/spineboy.skel', import.meta.url),
    );
    expect(() => identifySkeletonBinary(bytes.subarray(0, 8))).toThrow('二进制骨骼头');
    expect(() =>
      identifySkeletonBinary(new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff])),
    ).toThrow('二进制骨骼头');
    expect(() => identifySkeletonBinary(bytes.subarray(0, 20))).toThrow('尺寸头被截断');
  });
});
