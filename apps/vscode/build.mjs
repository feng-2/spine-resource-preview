import { build as bundle, context } from 'esbuild';
import { build as viteBuild } from 'vite';
import { cp, mkdir, rm } from 'node:fs/promises';
import { copyLicenses } from '../../scripts/copy-licenses.mjs';

// 扩展宿主只打包 core 和 VS Code API 适配，不引入浏览器 renderer。
const host = {
  entryPoints: ['src/host/extension.ts'],
  outfile: 'dist/extension.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  external: ['vscode'],
  sourcemap: false,
};
const watch = process.argv.includes('--watch');
await mkdir('dist', { recursive: true });
await mkdir('assets', { recursive: true });
// 插件图标从唯一共享 logo 同步，每次构建覆盖旧占位图标。
await cp('../../packages/viewer/src/assets/logo.png', 'assets/icon.png');
await rm('dist/licenses', { recursive: true, force: true });
// Web 与 VSIX 共用完整的第三方许可收集逻辑。
await copyLicenses('dist/licenses');
// 插件说明中的官方示例截图随 VSIX 发布，保留该素材的原始许可。
await mkdir('dist/licenses/example-assets', { recursive: true });
await cp('../../fixtures/official/4.2/LICENSE', 'dist/licenses/example-assets/LICENSE');
if (watch) {
  const runner = await context(host);
  await runner.watch();
  await viteBuild({ build: { watch: {} } });
} else {
  await bundle(host);
  await viteBuild();
}
