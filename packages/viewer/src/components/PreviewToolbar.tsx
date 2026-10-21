import type { SpineResource } from '@spine-preview/core';
import { createTranslator, type Locale } from '../i18n.js';

/** 画布上方的资源版本信息与本地处理提示。 */
interface PreviewToolbarProps {
  /** 当前界面语言。 */
  locale: Locale;
  /** 当前选中的资源。 */
  resource: SpineResource | undefined;
  /** 当前骨架声明的全部插槽。 */
  slots: readonly string[];
  /** 当前高亮插槽。 */
  selectedSlot: string | undefined;
  /** 选择或取消一个插槽。 */
  onSelectSlot(name: string): void;
}

/** 左上角展示资源版本和插槽，右上角展示本地处理提示。 */
export function PreviewToolbar({
  locale,
  resource,
  slots,
  selectedSlot,
  onSelectSlot,
}: PreviewToolbarProps) {
  const t = createTranslator(locale);
  return (
    <div className="preview-overlay-top">
      <div className="preview-overlay-column">
        {resource && (
          <div className="preview-info">
            {t('assetSummary', {
              exportVersion: resource.exportVersion,
              version: resource.version,
              count: resource.pages.length,
            })}
          </div>
        )}
        {slots.length > 0 && (
          <div className="slot-picker" role="group" aria-label={t('slots')}>
            <div className="slot-picker-heading">
              <span>{t('slots')}</span>
              <span>{slots.length}</span>
            </div>
            <div className="slot-picker-list">
              {slots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  className={slot === selectedSlot ? 'selected' : undefined}
                  aria-pressed={slot === selectedSlot}
                  title={slot}
                  onClick={() => onSelectSlot(slot)}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <span className="local-badge">
        <span aria-hidden="true" />
        {t('privacy')}
      </span>
    </div>
  );
}
