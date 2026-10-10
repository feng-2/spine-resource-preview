import type { AnchorHTMLAttributes } from 'react';

/** 工具、文档和外部资源统一在新标签打开，保留当前宣传页并隔离窗口引用。 */
export function NewTabLink({
  children,
  ...props
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'target' | 'rel'>) {
  return (
    <a {...props} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
