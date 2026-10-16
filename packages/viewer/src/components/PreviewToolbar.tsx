import type { SpineResource } from '@spine-preview/core';
import { createTranslator, type Locale } from '../i18n.js';

/** 画布上方的资源版本信息与本地处理提示。 */
interface PreviewToolbarProps {
  /** 当前界面语言。 */
  locale: Locale;
  /** 当前选中的资源。 */
  resource: SpineResource | undefined;
}

/** 左上角展示资源版本，右上角展示本地处理提示。 */
export function PreviewToolbar({ locale, resource }: PreviewToolbarProps) {
  const t = createTranslator(locale);
  return (
    <div className="preview-overlay-top">
      {resource && (
        <div className="preview-info">
          {t('assetSummary', {
            exportVersion: resource.exportVersion,
            version: resource.version,
            count: resource.pages.length,
          })}
        </div>
      )}
      <span className="local-badge">
        <span aria-hidden="true" />
        {t('privacy')}
      </span>
    </div>
  );
}
