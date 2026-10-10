import { defineConfig } from 'vite';

// Actions 自动使用当前仓库地址；本地构建可通过环境变量设置公开仓库链接。
const repository =
  process.env.VITE_REPOSITORY_URL ||
  (process.env.GITHUB_REPOSITORY
    ? `https://github.com/${process.env.GITHUB_REPOSITORY}`
    : '');
if (repository && new URL(repository).protocol !== 'https:')
  throw new Error('宣传页仓库链接必须使用 HTTPS。');

/** 宣传页使用相对资源路径，可部署到账号域名或任意仓库子目录。 */
export default defineConfig({
  base: './',
  define: { __REPOSITORY_URL__: JSON.stringify(repository) },
  server: { host: '127.0.0.1', port: 5181, strictPort: true },
  preview: { host: '127.0.0.1', port: 4181, strictPort: true },
  build: { sourcemap: false, target: ['chrome108', 'safari16'] },
});
