import { defineConfig } from 'vite';

/** 独立 Web 应用采用相对构建路径和本地固定开发端口。 */
export default defineConfig({
  base: './',
  server: { host: '127.0.0.1', port: 5180, strictPort: true },
  preview: { host: '127.0.0.1', port: 4180, strictPort: true },
  build: { sourcemap: false, target: ['chrome108', 'safari16'] },
});
