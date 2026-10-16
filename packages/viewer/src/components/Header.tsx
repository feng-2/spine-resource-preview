import { LOGO_URL } from '../assets.js';
import { LanguageMenu } from './LanguageMenu.js';
import { createTranslator, LOCALE_OPTIONS, type Locale } from '../i18n.js';

/** 共享品牌、语言设置与来源刷新入口。 */
interface HeaderProps {
  /** 当前界面语言。 */
  locale: Locale;
  /** 是否正在扫描。 */
  loading: boolean;
  /** 预览视图按钮与刷新入口保持在同一行。 */
  ready: boolean;
  fitted: boolean;
  onToggleFit(): void;
  /** 来源支持时显示刷新按钮。 */
  onRefresh?: (() => void) | undefined;
  /** 保存显式语言选择。 */
  onLanguageChange(locale: Locale): void;
}

/** 共享品牌、语言设置与来源刷新入口。 */
export function Header({
  locale,
  loading,
  ready,
  fitted,
  onToggleFit,
  onRefresh,
  onLanguageChange,
}: HeaderProps) {
  const t = createTranslator(locale);
  return (
    <header className="app-header">
      <div className="brand">
        <img className="brand-icon" src={LOGO_URL} alt="" />
        <div>
          <h1>{t('appTitle')}</h1>
          <p>{t('appSubtitle')}</p>
        </div>
      </div>
      <div className="header-actions">
        <button
          disabled={!ready}
          onClick={onToggleFit}
          title={t(fitted ? 'restoreTitle' : 'fitTitle')}
        >
          {t(fitted ? 'restore' : 'fit')}
        </button>
        {onRefresh && (
          <button onClick={onRefresh} disabled={loading}>
            {t('refresh')}
          </button>
        )}
        <LanguageMenu
          value={locale}
          options={LOCALE_OPTIONS}
          label={t('language')}
          onChange={onLanguageChange}
        />
      </div>
    </header>
  );
}
