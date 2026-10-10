import { cp, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));

/** Web 与 VSIX 共用许可收集，包含直接依赖及实际打包的传递依赖。 */
export async function copyLicenses(outputPath) {
  const output = resolve(outputPath);
  await mkdir(output, { recursive: true });
  for (const version of ['3.7', '3.8']) {
    const directory = resolve(output, `spine-${version}`);
    await mkdir(directory, { recursive: true });
    for (const name of ['LICENSE', 'source.json'])
      await cp(resolve(projectRoot, 'vendor', version, name), resolve(directory, name));
  }
  const runtimeRequire = createRequire(
    resolve(projectRoot, 'packages/runtimes/package.json'),
  );
  for (const version of ['40', '41', '42', '43']) {
    const name = `spine-webgl-${version}`;
    const webglRoot = dirname(runtimeRequire.resolve(`${name}/package.json`));
    const coreRequire = createRequire(resolve(webglRoot, 'package.json'));
    const coreRoot = dirname(
      coreRequire.resolve('@esotericsoftware/spine-core/package.json'),
    );
    for (const [label, source] of [
      [name, webglRoot],
      [`spine-core-${version}`, coreRoot],
    ]) {
      const directory = resolve(output, label);
      await mkdir(directory, { recursive: true });
      await cp(resolve(source, 'LICENSE'), resolve(directory, 'LICENSE'));
    }
  }
  const viewerRequire = createRequire(
    resolve(projectRoot, 'packages/viewer/package.json'),
  );
  const reactDomRoot = dirname(viewerRequire.resolve('react-dom/package.json'));
  const reactDomRequire = createRequire(resolve(reactDomRoot, 'package.json'));
  for (const name of ['react', 'react-dom', 'scheduler']) {
    const source = dirname(
      (name === 'scheduler' ? reactDomRequire : viewerRequire).resolve(
        `${name}/package.json`,
      ),
    );
    const directory = resolve(output, name);
    await mkdir(directory, { recursive: true });
    await cp(resolve(source, 'LICENSE'), resolve(directory, 'LICENSE'));
  }
  await cp(resolve(projectRoot, 'LICENSE'), resolve(output, 'LICENSE'));
  await cp(resolve(projectRoot, 'THIRD_PARTY_NOTICES.md'), resolve(output, 'NOTICE.md'));
}

// 直接运行时服务于 Web 构建；作为模块导入时不产生文件写入副作用。
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await copyLicenses(process.argv[2] || 'dist/licenses');
