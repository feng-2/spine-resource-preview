import { defineConfig } from 'vitest/config';

/** 核心与生命周期测试在 Node 中执行；真实 WebGL 使用浏览器验收。 */
export default defineConfig({
  test: {
    include: ['packages/**/tests/**/*.test.ts', 'apps/**/tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20_000,
  },
});
