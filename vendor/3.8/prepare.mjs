import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const manifest = JSON.parse(
  await readFile(new URL('./source.json', import.meta.url), 'utf8'),
);
const base = `https://raw.githubusercontent.com/EsotericSoftware/spine-runtimes/${manifest.commit}/`;
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const read = async (path) => {
  const response = await fetch(base + path);
  if (!response.ok) throw new Error(`下载官方来源失败：${response.status} ${path}`);
  return Buffer.from(await response.arrayBuffer());
};
// 只从已固定 commit 读取来源，重建前校验原始构建产物与许可证。
const source = await read(manifest.upstreamPath);
const license = await read('spine-ts/LICENSE');
if (hash(source) !== manifest.upstreamSha256 || hash(license) !== manifest.licenseSha256)
  throw new Error('官方来源哈希不匹配，拒绝覆盖已固定产物');
// 保持官方实现原样，仅移除失效映射注释并追加模块局部导出。
const module =
  source
    .toString('utf8')
    .replace(
      '//# sourceMappingURL=spine-webgl.js.map',
      '// 隔离模块省略外部 source map 引用。',
    ) +
  '\n// ESM 隔离封装：namespace 仅属于本模块；上游源码除 source map 注释外保持原样。\nexport default spine;\n';
if (hash(Buffer.from(module)) !== manifest.moduleSha256)
  throw new Error('模块封装哈希不匹配');
// 最终模块哈希也必须匹配，才允许写入本地已固定产物。
await writeFile(new URL('./spine-webgl.mjs', import.meta.url), module);
await writeFile(new URL('./LICENSE', import.meta.url), license);
