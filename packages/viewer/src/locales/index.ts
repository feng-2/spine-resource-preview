import { LANGUAGES } from '../languages.js';
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

/** 语言统一登记；选项用本语言名称，便于任何界面语言下辨认。 */
export const LOCALES = {
  en: { ...LANGUAGES.en, messages: en },
  'zh-CN': { ...LANGUAGES['zh-CN'], messages: zhCN },
  'zh-TW': { ...LANGUAGES['zh-TW'], messages: zhTW },
  ja: { ...LANGUAGES.ja, messages: ja },
  ko: { ...LANGUAGES.ko, messages: ko },
  de: { ...LANGUAGES.de, messages: de },
  fr: { ...LANGUAGES.fr, messages: fr },
  es: { ...LANGUAGES.es, messages: es },
  'pt-BR': { ...LANGUAGES['pt-BR'], messages: ptBR },
  ru: { ...LANGUAGES.ru, messages: ru },
} as const;
