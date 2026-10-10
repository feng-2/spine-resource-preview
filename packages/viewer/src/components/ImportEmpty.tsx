import { createTranslator, type Locale } from '../i18n.js';

/** 画布内导入说明，按来源能力显示操作入口。 */
interface ImportEmptyProps {
  /** 当前界面语言。 */
  locale: Locale;
  /** 是否正在扫描或加载。 */
  busy: boolean;
  /** 当前资源是否加载失败。 */
  failed: boolean;
  /** 来源是否支持拖放。 */
  canDrop: boolean;
  /** 请求选择完整资源文件。 */
  onFiles?: (() => void) | undefined;
  /** 请求选择目录。 */
  onFolder?: (() => void) | undefined;
  /** 失败后请求刷新来源。 */
  onReload?: (() => void) | undefined;
}

/** 画布内导入说明，按来源能力显示操作入口。 */
export function ImportEmpty({
  locale,
  busy,
  failed,
  canDrop,
  onFiles,
  onFolder,
  onReload,
}: ImportEmptyProps) {
  const t = createTranslator(locale);
  return (
    <div className="canvas-empty">
      <section className="import-panel" aria-label={t('importArea')}>
        <span className="upload-icon" aria-hidden="true">
          ↥
        </span>
        <h2>
          {busy
            ? t('preparing')
            : failed
              ? t('loadFailed')
              : canDrop
                ? t('dropTitle')
                : t('openTitle')}
        </h2>
        <p>
          {t(canDrop ? 'dropPrefix' : 'choosePrefix')}
          <strong>{t('importFiles')}</strong>
          {t(canDrop ? 'dropSuffix' : 'chooseSuffix')}
        </p>
        <div className="import-buttons">
          {onFiles && (
            <button className="primary" onClick={onFiles}>
              {t('chooseFiles')}
            </button>
          )}
          {onFolder && <button onClick={onFolder}>{t('chooseFolder')}</button>}
          {failed && onReload && <button onClick={onReload}>{t('reload')}</button>}
        </div>
        <p className="format-note">
          {t('supported')}
          <br />
          {t('binary37Note')}
          <br />
          {t('imageNote')}
        </p>
      </section>
    </div>
  );
}
