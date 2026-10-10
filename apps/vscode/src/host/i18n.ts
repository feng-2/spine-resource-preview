import { en } from './locales/en.js';
import { zhCN } from './locales/zh-CN.js';
import { zhTW } from './locales/zh-TW.js';
import { ja } from './locales/ja.js';
import { ko } from './locales/ko.js';
import { de } from './locales/de.js';
import { fr } from './locales/fr.js';
import { es } from './locales/es.js';
import { ptBR } from './locales/pt-BR.js';
import { ru } from './locales/ru.js';
import type { Diagnostic } from '@spine-preview/core';

/** 独立的宿主语言登记，不引入 React 或浏览器运行时。 */
export const HOST_LOCALES = {
  en: en,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  ja: ja,
  ko: ko,
  de: de,
  fr: fr,
  es: es,
  'pt-BR': ptBR,
  ru: ru,
} as const;

/** 宿主原生界面的文案键。 */
export type HostTextKey = keyof typeof en;
/** 宿主支持的语言。 */
export type HostLocale = keyof typeof HOST_LOCALES;

/** 区分简繁中文与葡萄牙语地区，其他语言匹配主语言并回退英文。 */
export function resolveHostLocale(language: string): HostLocale {
  const normalized = language.toLowerCase().replaceAll('_', '-');
  if (/^zh-(?:tw|hk|mo|hant)(?:-|$)/.test(normalized)) return 'zh-TW';
  if (/^zh(?:-|$)/.test(normalized)) return 'zh-CN';
  if (/^pt(?:-|$)/.test(normalized)) return 'pt-BR';
  const primary = normalized.split('-')[0]!;
  return Object.hasOwn(HOST_LOCALES, primary) ? (primary as HostLocale) : 'en';
}

/** 根据 VS Code 语言翻译原生提示，插值保留原始路径与错误内容。 */
export function getLocalizedMessage(
  language: string,
  key: HostTextKey,
  values: Readonly<Record<string, string | number>> = {},
): string {
  const template = HOST_LOCALES[resolveHostLocale(language)][key];
  return template.replace(/\{(\w+)\}/gu, (token, field: string) =>
    Object.hasOwn(values, field) ? String(values[field]) : token,
  );
}

/** 常见诊断的原生译文；未知错误保留原始说明供用户排查。 */
export function getLocalizedDiagnostic(language: string, diagnostic: Diagnostic): string {
  const keys: Readonly<Record<string, HostTextKey>> = {
    ATLAS_MISSING: 'diagnosticAtlasMissing',
    PAGE_MISSING: 'diagnosticPageMissing',
    DEPENDENCY_AMBIGUOUS: 'diagnosticDependencyAmbiguous',
    BINARY_37_UNSUPPORTED: 'diagnosticBinary37Unsupported',
    VERSION_PRERELEASE: 'diagnosticVersionPrerelease',
    PREFERRED_FILE_AMBIGUOUS: 'diagnosticPreferredAmbiguous',
    PREFERRED_FILE_UNASSOCIATED: 'diagnosticPreferredUnassociated',
  };
  const key = Object.hasOwn(keys, diagnostic.code) ? keys[diagnostic.code] : undefined;
  const message =
    diagnostic.code === 'SCAN_FAILED'
      ? getLocalizedMessage(language, 'scanFailed', {
          // 去除宿主添加的中文包装，原样保留文件系统返回的技术错误。
          reason: diagnostic.message.replace(/^无法扫描「[^」]*」：/u, ''),
        })
      : key
        ? getLocalizedMessage(language, key)
        : diagnostic.message;
  return [diagnostic.path, message, diagnostic.code].filter(Boolean).join('\n');
}
