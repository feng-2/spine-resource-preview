import type { Diagnostic } from '@spine-preview/core';
import type { PreviewState } from '@spine-preview/runtimes';
import { createTranslator, formatDiagnostic, type Locale } from '../i18n.js';

/** 单行加载状态、动画指标与可展开的诊断。 */
interface StatusBarProps {
  /** 当前界面语言。 */
  locale: Locale;
  /** 当前运行时采样信息，原始文本允许选择复制。 */
  animation: string | undefined;
  ready: boolean;
  view: PreviewState;
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

/** 单行加载状态、动画指标与可展开的诊断。 */
export function StatusBar({
  locale,
  animation,
  ready,
  view,
  status,
  error,
  diagnostics,
  revision,
  open,
  onRetry,
}: StatusBarProps) {
  const t = createTranslator(locale);
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const bounds = ready ? view.animationBounds : undefined;
  const duration = ready ? view.animationDuration : undefined;
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
        <span className="status-animation">
          {animation !== undefined
            ? t('currentAnimation', { name: animation })
            : t(ready ? 'setupPose' : 'noAnimation')}
        </span>
        <div className="status-metrics">
          <span>
            {t('animationSize', {
              width: bounds ? number.format(Math.ceil(bounds.width)) : '—',
              height: bounds ? number.format(Math.ceil(bounds.height)) : '—',
            })}
          </span>
          <span>
            {t('animationDuration', {
              seconds: duration !== undefined ? number.format(duration) : '—',
            })}
          </span>
          <span>FPS: {ready && view.fps !== undefined ? Math.round(view.fps) : '—'}</span>
        </div>
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
