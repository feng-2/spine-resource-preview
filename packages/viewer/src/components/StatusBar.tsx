import type { Diagnostic } from '@spine-preview/core';
import { createTranslator, formatDiagnostic, type Locale } from '../i18n.js';

/** 底部状态、原始原因诊断和固定隐私提示。 */
interface StatusBarProps {
  /** 当前界面语言。 */
  locale: Locale;
  /** 已整理的加载状态或实际错误。 */
  status: string;
  /** 状态是否需要处理。 */
  error: boolean;
  /** 发现和runtime诊断。 */
  diagnostics: readonly Diagnostic[];
  /** 资源来源代际，切换后重置展开状态。 */
  revision: number;
  /** 是否默认展开诊断。 */
  open: boolean;
  /** 当前失败资源的重试入口。 */
  onRetry?: (() => void) | undefined;
}

/** 底部状态、原始原因诊断和固定隐私提示。 */
export function StatusBar({
  locale,
  status,
  error,
  diagnostics,
  revision,
  open,
  onRetry,
}: StatusBarProps) {
  const t = createTranslator(locale);
  return (
    <section className="status-bar" aria-label={t('importStatus')}>
      <div className="status-row">
        <div className="status-message">
          <span role="status" aria-live="polite" data-error={error}>
            {status}
          </span>
          {onRetry && (
            <button className="retry-button" onClick={onRetry}>
              {t('reloadCurrent')}
            </button>
          )}
        </div>
        <span className="local-badge">
          <span aria-hidden="true" />
          {t('privacy')}
        </span>
      </div>
      {diagnostics.length > 0 && (
        <details key={revision} open={open}>
          <summary>{t('diagnosticCount', { count: diagnostics.length })}</summary>
          <ul>
            {diagnostics.map((diagnostic, index) => (
              <li key={`${diagnostic.code}:${diagnostic.path}:${index}`}>
                <strong>
                  {diagnostic.path
                    ? t('diagnosticPath', { path: diagnostic.path, message: '' })
                    : ''}
                </strong>
                {formatDiagnostic(locale, diagnostic)}
                <span className="diagnostic-code"> {diagnostic.code}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
