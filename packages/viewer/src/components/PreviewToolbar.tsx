import type { SpineResource } from '@spine-preview/core';
import { createTranslator, type Locale } from '../i18n.js';

/** 资源版本元信息与单一视图切换入口。 */
interface PreviewToolbarProps {
  /** 当前界面语言。 */
  locale: Locale;
  /** 当前选中的资源。 */
  resource: SpineResource | undefined;
  /** 未选资源时展示的真实来源路径。 */
  label: string;
  /** 控制器是否就绪。 */
  ready: boolean;
  /** 控制器实际的fit状态。 */
  fitted: boolean;
  /** 在适应与100%恢复之间切换。 */
  onToggleFit(): void;
}

/** 资源版本元信息与单一视图切换入口。 */
export function PreviewToolbar({
  locale,
  resource,
  label,
  ready,
  fitted,
  onToggleFit,
}: PreviewToolbarProps) {
  const t = createTranslator(locale);
  return (
    <div className="preview-toolbar">
      <div className="asset-heading">
        <strong>{resource?.name ?? t('canvasTitle')}</strong>
        <span>
          {resource
            ? t('assetSummary', {
                exportVersion: resource.exportVersion,
                version: resource.version,
                count: resource.pages.length,
              })
            : label || t('waiting')}
        </span>
      </div>
      <div className="view-actions">
        <button
          disabled={!ready}
          onClick={onToggleFit}
          title={t(fitted ? 'restoreTitle' : 'fitTitle')}
        >
          {t(fitted ? 'restore' : 'fit')}
        </button>
      </div>
    </div>
  );
}
