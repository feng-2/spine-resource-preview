import type { RuntimeAdapter } from '../types.js';
import { createLegacyAdapter } from './adapter.js';

const adapters = new Map<'3.7' | '3.8', Promise<RuntimeAdapter>>();

/** 按相同主、次版本懒加载固定官方旧 runtime；两个 namespace 保持模块隔离。 */
export function getLegacyAdapter(version: '3.7' | '3.8'): Promise<RuntimeAdapter> {
  if (version !== '3.7' && version !== '3.8')
    return Promise.reject(new Error(`旧版 Spine runtime 不支持版本：${String(version)}`));
  const cached = adapters.get(version);
  if (cached) return cached;
  const task = (
    version === '3.7'
      ? import('../../../../vendor/3.7/spine-webgl.mjs')
      : import('../../../../vendor/3.8/spine-webgl.mjs')
  )
    .then(({ default: runtime }) => createLegacyAdapter(version, runtime))
    .catch((error: unknown) => {
      // 源模块加载失败允许再次请求，不缓存失败的 Promise。
      adapters.delete(version);
      throw error;
    });
  adapters.set(version, task);
  return task;
}
