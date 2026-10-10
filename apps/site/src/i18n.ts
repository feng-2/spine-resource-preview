import { LANGUAGES } from '@spine-preview/viewer/languages';
import type { LanguageOption } from '@spine-preview/viewer/language-menu';
import { SITE_LOCALES, type SiteLocale } from './locales/index.js';

/** 无有效偏好时统一使用英文，不自动跟随操作系统语言。 */
export const DEFAULT_SITE_LOCALE: SiteLocale = 'en';
/** 保留网站原有存储键，与预览工具的语言偏好相互独立。 */
export const SITE_LOCALE_STORAGE_KEY = 'spine-resource-preview.site.locale';
/** 语言种类、顺序与自称直接读取共享登记表。 */
export const SITE_LANGUAGE_OPTIONS: readonly LanguageOption<SiteLocale>[] =
  Object.entries(LANGUAGES).map(([value, { label, description }]) => ({
    value: value as SiteLocale,
    label,
    description,
  }));

/** 验证存储值，拒绝未支持语言及对象原型属性。 */
export function isSiteLocale(value: unknown): value is SiteLocale {
  return typeof value === 'string' && Object.hasOwn(SITE_LOCALES, value);
}

/** 已保存的十种语言均可恢复，存储禁用或损坏时安全回退英文。 */
export function readSiteLocale(storage?: Pick<Storage, 'getItem'>): SiteLocale {
  try {
    const value = (storage ?? globalThis.localStorage)?.getItem(SITE_LOCALE_STORAGE_KEY);
    return isSiteLocale(value) ? value : DEFAULT_SITE_LOCALE;
  } catch {
    return DEFAULT_SITE_LOCALE;
  }
}

/** 明确选择只保存到网站偏好，失败时不影响当前语言切换。 */
export function saveSiteLocale(
  locale: SiteLocale,
  storage?: Pick<Storage, 'setItem'>,
): void {
  if (!isSiteLocale(locale)) return;
  try {
    (storage ?? globalThis.localStorage)?.setItem(SITE_LOCALE_STORAGE_KEY, locale);
  } catch {
    /* 隐私模式或存储限制下仍保留本次页面语言。 */
  }
}
