import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));

// 检查独立发布目录，确保源码映射、工作区链接和测试素材不会混入交付。
async function files(directory) {
  return readdir(directory, { recursive: true });
}

const web = resolve(projectRoot, 'apps/web/dist');
const html = await readFile(resolve(web, 'index.html'), 'utf8');
const references = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
assert(references.length > 0);
assert(references.every((reference) => reference.startsWith('./assets/')));
const webFiles = await files(web);
assert(!webFiles.some((name) => name.endsWith('.map')));
for (const name of [
  'spine-3.7',
  'spine-3.8',
  'spine-webgl-40',
  'spine-webgl-41',
  'spine-webgl-42',
  'spine-webgl-43',
  'react',
  'react-dom',
  'scheduler',
  'spine-core-40',
  'spine-core-41',
  'spine-core-42',
  'spine-core-43',
]) {
  await stat(resolve(web, 'licenses', name, 'LICENSE'));
}

assert.deepEqual(
  await readFile(resolve(web, 'licenses/LICENSE')),
  await readFile(resolve(projectRoot, 'LICENSE')),
);
assert.deepEqual(
  await readFile(resolve(web, 'licenses/NOTICE.md')),
  await readFile(resolve(projectRoot, 'THIRD_PARTY_NOTICES.md')),
);

const stage = resolve(projectRoot, 'apps/vscode/dist/vsix-stage');
const manifest = JSON.parse(await readFile(resolve(stage, 'package.json'), 'utf8'));
assert.equal(manifest.name, 'spine-resource-preview');
assert(!manifest.dependencies && !manifest.devDependencies);
assert.equal(manifest.main, './dist/extension.cjs');
const stageFiles = await files(stage);
assert(!stageFiles.some((name) => /(?:node_modules|fixtures|\.map$)/.test(name)));
for (const name of [
  'dist/extension.cjs',
  'package.nls.json',
  'package.nls.zh-cn.json',
  'dist/webview/main.js',
  'dist/webview/main.css',
]) {
  await stat(resolve(stage, name));
}

// 发布包必须包含每种命令语言及完整的项目/第三方许可。
for (const name of (await readdir(resolve(projectRoot, 'apps/vscode'))).filter((name) =>
  /^package[.]nls.*[.]json$/.test(name),
))
  await stat(resolve(stage, name));
assert.equal(manifest.license, 'MIT');
for (const name of ['LICENSE', 'THIRD_PARTY_NOTICES.md'])
  assert.deepEqual(
    await readFile(resolve(stage, name)),
    await readFile(resolve(projectRoot, name)),
  );
assert.deepEqual(
  await readFile(resolve(stage, 'dist/licenses/NOTICE.md')),
  await readFile(resolve(projectRoot, 'THIRD_PARTY_NOTICES.md')),
);
for (const name of [
  'spine-3.7',
  'spine-3.8',
  'spine-webgl-40',
  'spine-webgl-41',
  'spine-webgl-42',
  'spine-webgl-43',
  'spine-core-40',
  'spine-core-41',
  'spine-core-42',
  'spine-core-43',
  'react',
  'react-dom',
  'scheduler',
])
  await stat(resolve(stage, 'dist/licenses', name, 'LICENSE'));

const sourceLogo = await readFile(
  resolve(projectRoot, 'packages/viewer/src/assets/logo.png'),
);
for (const name of ['assets/icon.png', 'dist/webview/logo.png']) {
  assert.deepEqual(await readFile(resolve(stage, name)), sourceLogo);
}
const vsix = await stat(
  resolve(projectRoot, 'apps/vscode/dist/spine-resource-preview.vsix'),
);
assert(vsix.size > 0);
console.log(
  JSON.stringify(
    {
      webReferences: references,
      mapFiles: 0,
      standaloneExtension: `${manifest.publisher}.${manifest.name}@${manifest.version}`,
      vsixBytes: vsix.size,
      logoSha256: createHash('sha256').update(sourceLogo).digest('hex'),
    },
    null,
    2,
  ),
);
