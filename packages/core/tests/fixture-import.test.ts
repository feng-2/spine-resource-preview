import { readFile, readdir, stat } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
  discoverResources,
  resourceDirectory,
  type ResourceProvider,
} from '../src/index.js';

/** 模拟保留真实相对路径的目录导入，不提供文件名回退或图片预加载。 */
async function directoryProvider(root: URL): Promise<ResourceProvider> {
  const files: ResourceProvider['files'][number][] = [];
  async function scan(directory = ''): Promise<void> {
    for (const entry of await readdir(new URL(directory, root), {
      withFileTypes: true,
    })) {
      const path = `${directory}${entry.name}`;
      if (entry.isDirectory()) await scan(`${path}/`);
      else if (entry.isFile())
        files.push({ id: path, path, size: (await stat(new URL(path, root))).size });
    }
  }
  await scan();
  return {
    files,
    readText: (file) => readFile(new URL(file.path, root), 'utf8'),
    readBytes: async (file) => new Uint8Array(await readFile(new URL(file.path, root))),
    imageUrl: async () => {
      throw new Error('发现阶段不能申请图片');
    },
  };
}

const fixtureRoot = new URL('../../../fixtures/', import.meta.url);

describe('真实 fixtures 的文件夹导入', () => {
  it.each(['3.7/spineboy-ess', '3.8/spineboy-ess', '3.8/spineboy-pro'])(
    '回归样本 %s 可独立导入，不借用其它目录依赖',
    async (directory) => {
      const result = await discoverResources(
        await directoryProvider(new URL(`regression/${directory}/`, fixtureRoot)),
        { allowBasenameFallback: false },
      );
      expect(result.diagnostics).toEqual([]);
      expect(result.resources).toHaveLength(1);
      expect(result.resources[0]?.pages).toHaveLength(1);
      expect(resourceDirectory(result.resources[0]!.atlas.path)).toBe('');
      expect(resourceDirectory(result.resources[0]!.pages[0]!.file.path)).toBe('');
    },
  );

  it('整个 fixtures 只保留已知 beta 说明和 3.7 binary 负例', async () => {
    const result = await discoverResources(await directoryProvider(fixtureRoot), {
      allowBasenameFallback: false,
    });
    expect(result.resources).toHaveLength(47);
    expect(
      result.resources.filter((resource) =>
        resource.skeleton.path.startsWith('regression/'),
      ),
    ).toHaveLength(3);
    const notices = result.diagnostics.filter(
      (item) => item.code === 'VERSION_PRERELEASE',
    );
    expect(notices).toHaveLength(8);
    expect(notices.every((item) => item.path?.startsWith('official/4.3/'))).toBe(true);
    expect(
      result.diagnostics.filter((item) => item.code !== 'VERSION_PRERELEASE'),
    ).toEqual([
      expect.objectContaining({
        code: 'BINARY_37_UNSUPPORTED',
        path: 'negative/official-3.7-binary/spineboy.skel',
      }),
    ]);
    for (const resource of result.resources) {
      const directory = resourceDirectory(resource.skeleton.path);
      expect(resourceDirectory(resource.atlas.path)).toBe(directory);
      for (const page of resource.pages)
        expect(resourceDirectory(page.file.path)).toBe(directory);
    }
  });
});
