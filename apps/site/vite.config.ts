import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// Actions 自动使用当前仓库地址；本地构建可通过环境变量设置公开仓库链接。
const repository =
  process.env.VITE_REPOSITORY_URL ||
  (process.env.GITHUB_REPOSITORY
    ? `https://github.com/${process.env.GITHUB_REPOSITORY}`
    : '');
if (repository && new URL(repository).protocol !== 'https:')
  throw new Error('宣传页仓库链接必须使用 HTTPS。');

// 发布信息直接来自插件源码清单，版本和 publisher 只需维护一处。
const extension = JSON.parse(
  readFileSync(new URL('../vscode/package.json', import.meta.url), 'utf8'),
) as {
  /** 已注册的商店发布者。 */
  publisher: string;
  /** 插件版本。 */
  version: string;
  /** 插件最低支持的编辑器版本。 */
  engines: { vscode: string };
};
const extensionId = `${extension.publisher}.spine-resource-preview`;

/** 构建时查询公开商店状态；离线或索引延迟时保留可用的 VSIX 安装说明。 */
async function marketplacePublished(): Promise<boolean> {
  // 可选覆盖用于离线构建和两种展示状态的本地验证，不在用户浏览器发起查询。
  const override = process.env.VITE_EXTENSION_PUBLISHED;
  if (override !== undefined) {
    if (override !== 'true' && override !== 'false')
      throw new Error('VITE_EXTENSION_PUBLISHED 只能是 true 或 false。');
    return override === 'true';
  }
  try {
    const response = await fetch(
      'https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json;api-version=7.2-preview.1',
        },
        body: JSON.stringify({
          filters: [
            {
              criteria: [{ filterType: 7, value: extensionId }],
              pageNumber: 1,
              pageSize: 1,
            },
          ],
          flags: 1,
        }),
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!response.ok) return false;
    const data = (await response.json()) as {
      results?: {
        extensions?: { extensionName?: string; publisher?: { publisherName?: string } }[];
      }[];
    };
    return (
      data.results?.some((result) =>
        result.extensions?.some(
          (item) =>
            `${item.publisher?.publisherName}.${item.extensionName}`.toLowerCase() ===
            extensionId.toLowerCase(),
        ),
      ) ?? false
    );
  } catch {
    console.warn('Marketplace 状态暂不可读，宣传页将显示 VSIX 安装说明。');
    return false;
  }
}

/** 宣传页使用相对资源路径，可部署到账号域名或任意仓库子目录。 */
export default defineConfig(async () => ({
  base: './',
  define: {
    __REPOSITORY_URL__: JSON.stringify(repository),
    __EXTENSION__: JSON.stringify({
      id: extensionId,
      version: extension.version,
      minimumVSCode: extension.engines.vscode.replace(/^\^/, ''),
      marketplaceUrl: `https://marketplace.visualstudio.com/items?itemName=${extensionId}`,
      published: await marketplacePublished(),
    }),
  },
  server: { host: '127.0.0.1', port: 5181, strictPort: true },
  preview: { host: '127.0.0.1', port: 4181, strictPort: true },
  build: { sourcemap: false, target: ['chrome108', 'safari16'] },
}));
