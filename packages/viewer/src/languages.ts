/** 站点和预览工具共用语言代码与自称，独立于各自词条和存储偏好。 */
export const LANGUAGES = {
  en: { label: 'English', description: 'English', compactLabel: 'EN' },
  'zh-CN': { label: '简体中文', description: 'Simplified Chinese', compactLabel: '简中' },
  'zh-TW': {
    label: '繁體中文',
    description: 'Traditional Chinese',
    compactLabel: '繁中',
  },
  ja: { label: '日本語', description: 'Japanese', compactLabel: '日本語' },
  ko: { label: '한국어', description: 'Korean', compactLabel: '한국어' },
  de: { label: 'Deutsch', description: 'German', compactLabel: 'DE' },
  fr: { label: 'Français', description: 'French', compactLabel: 'FR' },
  es: { label: 'Español', description: 'Spanish', compactLabel: 'ES' },
  'pt-BR': {
    label: 'Português (Brasil)',
    description: 'Portuguese (Brazil)',
    compactLabel: 'PT-BR',
  },
  ru: { label: 'Русский', description: 'Russian', compactLabel: 'RU' },
} as const;

/** 当前两套界面支持的语言标识。 */
export type Language = keyof typeof LANGUAGES;
