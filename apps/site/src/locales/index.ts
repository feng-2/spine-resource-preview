import type { Language } from '@spine-preview/viewer/languages';
import { en } from './en.js';
import { zhCN } from './zh-CN.js';
import { zhTW } from './zh-TW.js';
import { ja } from './ja.js';
import { ko } from './ko.js';
import { de } from './de.js';
import { fr } from './fr.js';
import { es } from './es.js';
import { ptBR } from './pt-BR.js';
import { ru } from './ru.js';
import type { SiteMessages } from './types.js';

/** 独立维护宣传词条；语言种类必须完整覆盖 viewer 的公开语言契约。 */
export const SITE_LOCALES = {
  en,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  ja,
  ko,
  de,
  fr,
  es,
  'pt-BR': ptBR,
  ru,
} satisfies Record<Language, SiteMessages>;

/** 网站和预览工具使用相同语言代码。 */
export type SiteLocale = Language;
export type { SiteMessages } from './types.js';
