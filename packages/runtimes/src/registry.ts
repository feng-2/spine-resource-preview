import type { RuntimeAdapter, RuntimeLoadOptions, RuntimeSession } from './types.js';

/** 只加载骨骼导出版本对应的官方模块，不允许失败后跨版本重试。 */
export async function loadRuntime(options: RuntimeLoadOptions): Promise<RuntimeSession> {
  options.signal?.throwIfAborted();
  if (options.resource.version === '3.7' && options.resource.format === 'binary') {
    throw new Error('暂不支持 Spine 3.7 .skel，请使用同版本 JSON 导出');
  }
  const version = options.resource.version;
  let adapter: RuntimeAdapter;
  if (version === '3.7' || version === '3.8') {
    adapter = await (await import('./legacy/index.js')).getLegacyAdapter(version);
  } else {
    adapter = await (await import('./modern/index.js')).getModernAdapter(version);
  }
  options.signal?.throwIfAborted();
  if (adapter.version !== version) throw new Error(`运行时路由错误：${version}`);
  const session = await adapter.load(options);
  try {
    options.signal?.throwIfAborted();
    return session;
  } catch (error) {
    await session.dispose();
    throw error;
  }
}
