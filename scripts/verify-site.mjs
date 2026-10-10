import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const siteRoot = resolve(projectRoot, 'dist/site');
// 两个 HTML 都必须独立使用相对路径，避免仓库名或自定义域名改变时资源失效。
for (const directory of ['', 'app']) {
  const html = await readFile(join(siteRoot, directory, 'index.html'), 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
  assert(refs.length > 0);
  for (const reference of refs) {
    assert(reference.startsWith('./assets/'), `非相对资源地址：${reference}`);
    await stat(resolve(siteRoot, directory, reference));
  }
}
const all = await readdir(siteRoot, { recursive: true });
assert(!all.some((name) => name.endsWith('.map')));
assert(
  !all.some((name) => /[.](skel|atlas|vsix)$/.test(name)),
  '站点不应包含示例骨骼、图集或 VSIX。',
);
assert(
  !all.some((name) => name.endsWith('.json') && !/(?:^|\/)licenses\//.test(name)),
  '仅许可证目录允许 runtime 来源 JSON。',
);
await stat(resolve(siteRoot, '.nojekyll'));
assert.deepEqual(
  await readFile(resolve(siteRoot, 'vscode/README.md')),
  await readFile(resolve(projectRoot, 'apps/vscode/README.md')),
);
await stat(resolve(siteRoot, 'licenses/example-assets/LICENSE'));
await stat(resolve(siteRoot, 'assets/screenshots/preview-en.jpg'));
// 检查插件文档和宣传截图同步，防止部署后出现缺图或旧版截图。
const extensionScreenshot = await readFile(
  resolve(projectRoot, 'assets/screenshots/vscode-preview-en.jpg'),
);
for (const path of [
  'assets/screenshots/vscode-preview-en.jpg',
  'vscode/assets/preview.jpg',
])
  assert.deepEqual(await readFile(resolve(siteRoot, path)), extensionScreenshot);
assert.deepEqual(
  await readFile(resolve(siteRoot, 'licenses/LICENSE')),
  await readFile(resolve(projectRoot, 'LICENSE')),
);
for (const prefix of ['licenses', 'app/licenses']) {
  assert.deepEqual(
    await readFile(resolve(siteRoot, prefix, 'NOTICE.md')),
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
    await stat(resolve(siteRoot, prefix, name, 'LICENSE'));
}
// 宣传页与工具的构建来源分别完整保留，不依赖另一份部署。
const builtWeb = await readdir(resolve(projectRoot, 'apps/web/dist/assets'));
for (const name of builtWeb)
  assert.deepEqual(
    await readFile(resolve(siteRoot, 'app/assets', name)),
    await readFile(resolve(projectRoot, 'apps/web/dist/assets', name)),
  );
console.log(
  '站点检查通过：宣传页 + Web 工具，相对资源路径，许可完整，无 source map / 测试资源。',
);
