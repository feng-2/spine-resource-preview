import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const collectionPath = 'fixtures/official';
const manifestPath = `${collectionPath}/download-manifest.json`;
const repository = 'https://github.com/EsotericSoftware/spine-runtimes';

// 与项目运行时来源一致的固定官方提交，不使用随时变化的分支下载地址。
const versions = [
  ['3.7', '9639bcc81722d7178fd9d1cdc1a3d55a4c91f989'],
  ['3.8', '8b4844bd4b193ba9e54487ed397a777993cbad56'],
  ['4.0', '425ce416bb218b28caeec47b317aa57cd7140375'],
  ['4.1', '77a5db0ec6d16331f5efbaa7662bba9355bd3424'],
  ['4.2', 'e7dc1435fa4a0083ab431f1b28e083c14a1f5c68'],
  ['4.3', '1ad4e94bc3f16f4908a87a97d31e0de657f1788a'],
];

// 一个目录只放一份相关 atlas；PMA 组单独保存，骨骼字节不改变，只统一文件名。
const cases = [
  { name: 'spineboy', example: 'spineboy', atlasStem: 'spineboy' },
  { name: 'tank', example: 'tank', atlasStem: 'tank' },
  { name: 'raptor', example: 'raptor', atlasStem: 'raptor' },
  { name: 'spineboy-pma', example: 'spineboy', atlasStem: 'spineboy-pma' },
];

const downloads = new Map();
const files = [];

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function coreApi() {
  // 用开发依赖转译公共入口，不需要先构建其它包，也不复制一份 atlas/二进制识别逻辑。
  const result = await build({
    entryPoints: [path.join(projectRoot, 'packages/core/src/index.ts')],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`
  );
}

async function fetchBytes(url) {
  if (
    !url.startsWith('https://raw.githubusercontent.com/EsotericSoftware/spine-runtimes/')
  )
    throw new Error(`只允许从官方仓库下载夹具：${url}`);
  let pending = downloads.get(url);
  if (!pending) {
    pending = (async () => {
      let latestError;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
          if (!response.ok) throw new Error(`下载失败 ${response.status}：${url}`);
          return Buffer.from(await response.arrayBuffer());
        } catch (error) {
          latestError = error;
          if (attempt < 2)
            await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
        }
      }
      throw latestError;
    })();
    downloads.set(url, pending);
  }
  return pending;
}

async function saveOfficial(commit, upstreamPath, outputPath, extra = {}) {
  const url = `https://raw.githubusercontent.com/EsotericSoftware/spine-runtimes/${commit}/${upstreamPath}`;
  const bytes = await fetchBytes(url);
  const absolute = path.join(projectRoot, outputPath);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, bytes);
  files.push({
    path: outputPath,
    upstreamPath,
    url,
    commit,
    sha256: sha256(bytes),
    size: bytes.byteLength,
    ...extra,
  });
  return bytes;
}

async function collectGroup(core, version, commit, sample) {
  const directory = `${collectionPath}/${version}/${sample.name}`;
  const upstreamDirectory = `examples/${sample.example}/export`;
  const jsonPath = `${directory}/${sample.atlasStem}.json`;
  const jsonBytes = await saveOfficial(
    commit,
    `${upstreamDirectory}/${sample.example}-pro.json`,
    jsonPath,
  );
  const identifiedJson = core.identifySkeletonJson(jsonBytes.toString('utf8'));
  if (!identifiedJson || identifiedJson.version !== version)
    throw new Error(`官方资源版本不匹配：${jsonPath}`);
  files.find((file) => file.path === jsonPath).exportVersion =
    identifiedJson.exportVersion;
  const atlasPath = `${directory}/${sample.atlasStem}.atlas`;
  const atlasBytes = await saveOfficial(
    commit,
    `${upstreamDirectory}/${sample.atlasStem}.atlas`,
    atlasPath,
  );
  const pages = core.readAtlasPages(atlasBytes.toString('utf8'));
  // 实际读取所有页名，包括多页和相对图片目录，不能假设 atlas 只有一张同名 PNG。
  await Promise.all(
    pages.map(async (page) => {
      const upstreamPage = core.resolveDependencyPath(
        `${upstreamDirectory}/${sample.atlasStem}.atlas`,
        page.name,
      );
      const outputPage = core.resolveDependencyPath(atlasPath, page.name);
      await saveOfficial(commit, upstreamPage, outputPage);
    }),
  );
  const formats = ['json'];
  if (version !== '3.7') {
    const binaryPath = `${directory}/${sample.atlasStem}.skel`;
    const bytes = await saveOfficial(
      commit,
      `${upstreamDirectory}/${sample.example}-pro.skel`,
      binaryPath,
      { exportVersion: identifiedJson.exportVersion },
    );
    const identifiedBinary = core.identifySkeletonBinary(bytes);
    if (
      identifiedBinary.version !== version ||
      identifiedBinary.exportVersion !== identifiedJson.exportVersion
    )
      throw new Error(`JSON 与 binary 导出版本不一致：${binaryPath}`);
    formats.push('binary');
  }
  console.log(
    `已下载 ${version}/${sample.name}：${formats.join('+')}，${pages.length} 页，${identifiedJson.exportVersion}`,
  );
  return {
    version,
    commit,
    name: sample.name,
    directory,
    exportVersion: identifiedJson.exportVersion,
    formats,
    atlas: atlasPath,
    pages: pages.map((page) => ({
      name: page.name,
      ...(page.pma !== undefined ? { pma: page.pma } : {}),
    })),
    premultipliedExample: sample.name.endsWith('-pma'),
    source: `${repository}/tree/${commit}/${upstreamDirectory}`,
  };
}

async function parallelMap(items, concurrency, action) {
  let cursor = 0;
  const results = new Array(items.length);
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await action(items[index]);
      }
    }),
  );
  return results;
}

async function scanCollection(directoryRoot = collectionPath) {
  const entries = [];
  const scan = async (relative) => {
    const absolute = path.join(projectRoot, directoryRoot, relative);
    for (const entry of await readdir(absolute, { withFileTypes: true })) {
      const next = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await scan(next);
      else if (entry.isFile()) {
        const info = await stat(path.join(projectRoot, directoryRoot, next));
        entries.push({ id: next, path: next, size: info.size });
      }
    }
  };
  await scan('');
  return entries;
}

/** 为真实目录建立只读来源，保留子目录关系，不跨目录借用依赖。 */
async function collectionProvider(directoryRoot) {
  const listed = await scanCollection(directoryRoot);
  return {
    files: listed,
    readText: (file) =>
      readFile(path.join(projectRoot, directoryRoot, file.path), 'utf8'),
    readBytes: async (file) =>
      new Uint8Array(await readFile(path.join(projectRoot, directoryRoot, file.path))),
    imageUrl: async () => {
      throw new Error('发现阶段不应申请图片地址');
    },
  };
}

/** 整体导入不能产生意外缺页或 atlas 歧义，负例和 beta 诊断仍须保留。 */
async function verifyWholeFixtures(core, manifest, officialCount, betaNotices) {
  const regressionRoot = 'fixtures/regression';
  const sources = JSON.parse(
    await readFile(path.join(projectRoot, regressionRoot, 'SOURCES.json'), 'utf8'),
  );
  for (const source of sources) {
    const bytes = await readFile(path.join(projectRoot, regressionRoot, source.file));
    if (sha256(bytes) !== source.sha256)
      throw new Error(`回归夹具哈希错误：${source.file}`);
  }
  const regression = await core.discoverResources(
    await collectionProvider(regressionRoot),
  );
  const expectedRegression = sources.filter(
    (source) => !source.file.startsWith('../') && /[.](json|skel)$/.test(source.file),
  );
  if (
    regression.diagnostics.length ||
    regression.resources.length !== expectedRegression.length
  )
    throw new Error(
      `回归集合不完整：${JSON.stringify(regression.diagnostics)}，${regression.resources.length}/${expectedRegression.length}`,
    );
  const whole = await core.discoverResources(await collectionProvider('fixtures'));
  const expectedTotal = officialCount + expectedRegression.length;
  if (whole.resources.length !== expectedTotal)
    throw new Error(
      `完整 fixtures 索引数量错误：${whole.resources.length}/${expectedTotal}`,
    );
  const unexpected = whole.diagnostics.filter(
    (diagnostic) =>
      diagnostic.code !== 'VERSION_PRERELEASE' &&
      !manifest.negativeResources.some(
        (negative) =>
          negative.expectedDiagnostic === diagnostic.code &&
          negative.path === `fixtures/${diagnostic.path}`,
      ),
  );
  if (unexpected.length)
    throw new Error(`完整 fixtures 出现非预期诊断：${JSON.stringify(unexpected)}`);
  if (whole.diagnostics.length !== betaNotices + manifest.negativeResources.length)
    throw new Error(`完整 fixtures 诊断数量错误：${whole.diagnostics.length}`);
  console.log(
    `整体导入验证通过：${whole.resources.length} 个骨骼，${betaNotices} 条 beta 说明，${manifest.negativeResources.length} 条预期负例；回归集合 ${regression.resources.length} 个骨骼，无诊断。`,
  );
}

async function verifyCollection(core, manifest) {
  // 离线复核所有网络来源文件，保存后的内容必须与下载清单哈希完全一致。
  for (const file of manifest.files) {
    const bytes = await readFile(path.join(projectRoot, file.path));
    if (sha256(bytes) !== file.sha256 || bytes.byteLength !== file.size)
      throw new Error(`夹具完整性检查失败：${file.path}`);
  }
  const provider = await collectionProvider(collectionPath);
  const discovery = await core.discoverResources(provider);
  const errors = discovery.diagnostics.filter(
    (diagnostic) => diagnostic.code !== 'VERSION_PRERELEASE',
  );
  if (errors.length)
    throw new Error(`完整集合发现失败：${JSON.stringify(errors, null, 2)}`);
  const expectedCount = manifest.resources.reduce(
    (sum, group) => sum + group.formats.length,
    0,
  );
  if (discovery.resources.length !== expectedCount)
    throw new Error(
      `索引数量错误：预期 ${expectedCount}，实际 ${discovery.resources.length}`,
    );
  for (const version of versions.map(([version]) => version)) {
    const expected = manifest.resources
      .filter((group) => group.version === version)
      .reduce((sum, group) => sum + group.formats.length, 0);
    const actual = discovery.resources.filter(
      (resource) => resource.version === version,
    ).length;
    if (actual !== expected)
      throw new Error(`${version} 资源数不一致：${actual}/${expected}`);
  }
  for (const negative of manifest.negativeResources) {
    const bytes = await readFile(path.join(projectRoot, negative.path));
    let code;
    try {
      core.identifySkeletonBinary(bytes);
    } catch (error) {
      code = error.diagnostic?.code;
    }
    if (code !== negative.expectedDiagnostic)
      throw new Error(`负例未被正确拒绝：${negative.path}`);
  }
  await verifyWholeFixtures(core, manifest, expectedCount, discovery.diagnostics.length);
  const totalBytes = manifest.files.reduce((sum, file) => sum + file.size, 0);
  console.log(
    `验证通过：${manifest.resources.length} 个独立资源组，${discovery.resources.length} 个骨骼，${(totalBytes / 1024 / 1024).toFixed(2)} MiB，${discovery.diagnostics.length} 条 beta 说明。`,
  );
  return {
    groups: manifest.resources.length,
    skeletons: discovery.resources.length,
    totalBytes,
    betaNotices: discovery.diagnostics.length,
  };
}

async function main() {
  const core = await coreApi();
  if (process.argv.includes('--check')) {
    const manifest = JSON.parse(
      await readFile(path.join(projectRoot, manifestPath), 'utf8'),
    );
    await verifyCollection(core, manifest);
    return;
  }
  const versionRecords = await parallelMap(versions, 4, async ([version, commit]) => {
    const licensePath = `${collectionPath}/${version}/LICENSE`;
    await saveOfficial(commit, 'LICENSE', licensePath);
    return { version, commit, license: licensePath };
  });
  const work = versions.flatMap(([version, commit]) =>
    cases.map((sample) => ({ version, commit, sample })),
  );
  const resources = await parallelMap(work, 4, ({ version, commit, sample }) =>
    collectGroup(core, version, commit, sample),
  );
  // 不支持的 3.7 binary 单独存放在正样本根之外，整体导入 official 不会夹入负例。
  const negativePath = 'fixtures/negative/official-3.7-binary/spineboy.skel';
  const legacyCommit = versions[0][1];
  await saveOfficial(
    legacyCommit,
    'examples/spineboy/export/spineboy-pro.skel',
    negativePath,
  );
  await saveOfficial(
    legacyCommit,
    'LICENSE',
    'fixtures/negative/official-3.7-binary/LICENSE',
  );
  const manifest = {
    schemaVersion: 1,
    repository,
    versions: versionRecords,
    resources,
    negativeResources: [
      {
        path: negativePath,
        version: '3.7',
        exportVersion: resources.find(
          (group) => group.version === '3.7' && group.name === 'spineboy',
        ).exportVersion,
        format: 'binary',
        expectedDiagnostic: 'BINARY_37_UNSUPPORTED',
      },
    ],
    files: files.sort((a, b) => a.path.localeCompare(b.path)),
  };
  await mkdir(path.join(projectRoot, collectionPath), { recursive: true });
  await writeFile(
    path.join(projectRoot, manifestPath),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  // 下载完成即检查完整性，结果通过命令输出，不在资源目录生成过程报告。
  await verifyCollection(core, manifest);
}

await main();
