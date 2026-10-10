import type { RuntimeAdapter } from '../types';

/** 版本独立的按需模块入口，不跨版本兜底、不加载外部CDN。 */
export async function getModernAdapter(
  version: '4.0' | '4.1' | '4.2' | '4.3',
): Promise<RuntimeAdapter> {
  switch (version) {
    case '4.0':
      return (await import('./v40')).adapter;
    case '4.1':
      return (await import('./v41')).adapter;
    case '4.2':
      return (await import('./v42')).adapter;
    case '4.3':
      return (await import('./v43')).adapter;
  }
}
