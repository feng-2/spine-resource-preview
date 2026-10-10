import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';

// 工作区包名保留 scoped 名称；VSIX 清单在独立 stage 中生成，不修改原清单。
const stage = resolve('dist/vsix-stage');
await rm(stage, { recursive: true, force: true });
await mkdir(stage, { recursive: true });
const manifest = JSON.parse(await readFile('package.json', 'utf8'));
manifest.name = 'spine-resource-preview';
// 宿主与所有 Webview 依赖均已打包，独立安装不解析 workspace 软链接。
delete manifest.dependencies;
delete manifest.devDependencies;
delete manifest.scripts;
delete manifest.private;
await writeFile(`${stage}/package.json`, `${JSON.stringify(manifest, null, 2)}\n`);
for (const file of [
  'README.md',
  '.vscodeignore',
  'assets',
  ...(await readdir('.')).filter((name) =>
    /^package[.]nls(?:[.][a-z-]+)?[.]json$/.test(name),
  ),
])
  await cp(file, `${stage}/${file}`, { recursive: true });
// 项目许可证与第三方说明使用唯一根目录原文，避免发布包中的副本过期。
for (const file of ['LICENSE', 'THIRD_PARTY_NOTICES.md'])
  await cp(`../../${file}`, `${stage}/${file}`);
for (const file of ['extension.cjs', 'webview', 'licenses'])
  await cp(`dist/${file}`, `${stage}/dist/${file}`, { recursive: true });
const require = createRequire(import.meta.url);
const manager = resolve(dirname(require.resolve('@vscode/vsce/package.json')), 'vsce');
const output = resolve('dist/spine-resource-preview.vsix');
// Marketplace 的相对链接默认以仓库根为基础，需要显式保留扩展子目录。
const repositoryUrl = manifest.repository.url.replace(/\.git$/, '').replace(/\/$/, '');
const repositoryDirectory = manifest.repository.directory.replace(/^\/+|\/+$/g, '');
const contentUrl = `${repositoryUrl}/blob/main/${repositoryDirectory}/`;
const imagesUrl = `${repositoryUrl}/raw/main/${repositoryDirectory}/`;
const code = await new Promise((success, failure) => {
  const child = spawn(
    process.execPath,
    [
      manager,
      'package',
      '--no-dependencies',
      '--baseContentUrl',
      contentUrl,
      '--baseImagesUrl',
      imagesUrl,
      '--out',
      output,
    ],
    { cwd: stage, stdio: 'inherit' },
  );
  child.on('error', failure);
  child.on('exit', success);
});
if (code !== 0) throw new Error(`VSIX 打包失败，退出码 ${code}`);
