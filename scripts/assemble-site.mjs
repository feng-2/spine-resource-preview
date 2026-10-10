import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(projectRoot, 'dist/site');
// 只重建专用站点目录，不删除其他构建产物。
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(resolve(projectRoot, 'apps/site/dist'), output, { recursive: true });
await cp(resolve(projectRoot, 'apps/web/dist'), resolve(output, 'app'), {
  recursive: true,
});
// 宣传页附带项目文档、真实截图来源与自身使用的前端依赖许可。
await cp(resolve(projectRoot, 'apps/web/dist/licenses'), resolve(output, 'licenses'), {
  recursive: true,
});
for (const name of ['README.md', 'README.zh-CN.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md'])
  await cp(resolve(projectRoot, name), resolve(output, name));
await cp(
  resolve(projectRoot, 'assets/screenshots'),
  resolve(output, 'assets/screenshots'),
  { recursive: true },
);
await mkdir(resolve(output, 'licenses/example-assets'), { recursive: true });
await cp(
  resolve(projectRoot, 'fixtures/official/4.2/LICENSE'),
  resolve(output, 'licenses/example-assets/LICENSE'),
);
// 文档中的本地图片和素材许可链接也保留可访问目标，仅复制文档，不复制样本骨骼/纹理。
for (const name of [
  'packages/viewer/src/assets/logo.png',
  'fixtures/official/4.2/LICENSE',
  'fixtures/official/README.md',
]) {
  await mkdir(dirname(resolve(output, name)), { recursive: true });
  await cp(resolve(projectRoot, name), resolve(output, name));
}
await mkdir(resolve(output, 'vscode'), { recursive: true });
await cp(
  resolve(projectRoot, 'apps/vscode/README.md'),
  resolve(output, 'vscode/README.md'),
);
// 插件说明页的相对图片链接保留独立可访问的来源。
await mkdir(resolve(output, 'vscode/assets'), { recursive: true });
await cp(
  resolve(projectRoot, 'assets/screenshots/vscode-preview-en.jpg'),
  resolve(output, 'vscode/assets/preview.jpg'),
);
await writeFile(resolve(output, '.nojekyll'), '');
console.log(`站点已生成：${output}\n宣传页 ./ · 预览工具 ./app/`);
