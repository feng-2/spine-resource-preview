import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

/** Webview 构建使用相对 chunk 地址，不连接开发服务器或外部 CDN。 */
export default defineConfig({
  // HTML 由扩展宿主生成；入口只输出脚本与样式。
  base: './',
  // 保持 React hooks 使用同一个模块实例。
  resolve: { dedupe: ['react', 'react-dom'] },
  // 所有 runtime chunk 都随 VSIX 本地打包。
  build: {
    outDir: 'dist/webview',
    emptyOutDir: true,
    sourcemap: false,
    target: 'chrome108',
    rollupOptions: {
      input: fileURLToPath(new URL('./src/webview/main.tsx', import.meta.url)),
      output: {
        entryFileNames: 'main.js',
        assetFileNames: '[name][extname]',
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
    },
  },
});
