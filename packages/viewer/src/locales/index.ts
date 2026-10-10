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
  en: { label: 'English', description: 'English', messages: en },
  'zh-CN': { label: '简体中文', description: 'Simplified Chinese', messages: zhCN },
  'zh-TW': { label: '繁體中文', description: 'Traditional Chinese', messages: zhTW },
  ja: { label: '日本語', description: 'Japanese', messages: ja },
  ko: { label: '한국어', description: 'Korean', messages: ko },
  de: { label: 'Deutsch', description: 'German', messages: de },
  fr: { label: 'Français', description: 'French', messages: fr },
  es: { label: 'Español', description: 'Spanish', messages: es },
  'pt-BR': {
    label: 'Português (Brasil)',
    description: 'Portuguese (Brazil)',
    messages: ptBR,
  },
  ru: { label: 'Русский', description: 'Russian', messages: ru },
} as const;
