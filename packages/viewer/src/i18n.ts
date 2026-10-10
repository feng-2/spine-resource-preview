import type { Diagnostic } from '@spine-preview/core';
import type { en } from './locales/en.js';
import { LOCALES } from './locales/index.js';

/** 当前支持的界面语言，不跟随浏览器系统语言。 */
export type Locale = keyof typeof LOCALES;
/** 英文包定义所有可用文案键。 */
export type MessageKey = keyof typeof en;
/** 插值数据直接作为文本，不执行 HTML 或替换表达式。 */
export type TranslationParams = Readonly<Record<string, string | number>>;
/** 没有有效保存值时固定使用英文。 */
export const DEFAULT_LOCALE: Locale = 'en';
/** 两端共用的语言偏好键。 */
export const LOCALE_STORAGE_KEY = 'spine-resource-preview.locale';

/** 两端共享的语言选项，由登记表生成以避免与词条支持范围脱节。 */
export const LOCALE_OPTIONS: ReadonlyArray<{
  value: Locale;
  label: string;
  description: string;
}> = Object.entries(LOCALES).map(([value, { label, description }]) => ({
  value: value as Locale,
  label,
  description,
}));

/** 检查存储与选择器中的语言值，排除原型属性和未登记的语言。 */
export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && Object.hasOwn(LOCALES, value);
}

/** 翻译一条文案；遗漏插值保留原占位符，便于发现调用问题。 */
export function translate(
  locale: Locale,
  key: MessageKey,
  params: TranslationParams = {},
): string {
  const template = LOCALES[isLocale(locale) ? locale : DEFAULT_LOCALE].messages[key];
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.hasOwn(params, name) ? String(params[name]) : match,
  );
}

/** 创建界面专用翻译函数，不改变任何资源或动画名称。 */
export function createTranslator(locale: Locale) {
  return (key: MessageKey, params?: TranslationParams) => translate(locale, key, params);
}

/** 读取偏好；Webview 禁用存储、SSR 与损坏值均安全回退英文。 */
export function readLocale(storage?: Pick<Storage, 'getItem'>): Locale {
  try {
    const value = (storage ?? globalThis.localStorage)?.getItem(LOCALE_STORAGE_KEY);
    return isLocale(value) ? value : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

/** 保存显式选择，存储不可访问时仅保留本次界面状态。 */
export function saveLocale(locale: Locale, storage?: Pick<Storage, 'setItem'>): void {
  try {
    (storage ?? globalThis.localStorage)?.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Webview 或隐私模式可拒绝持久化，但不能影响当前预览。
  }
}

const SOURCE_STATUS_KEYS: Readonly<Record<string, MessageKey>> = {
  // 宿主语言和预览语言可独立切换，已知状态始终按当前预览语言显示。
  ...Object.fromEntries(
    Object.values(LOCALES).flatMap(({ messages }) =>
      (['editorInitial', 'preparing', 'scanCancelled'] as const).map((key) => [
        messages[key],
        key,
      ]),
    ),
  ),
  '准备就绪，请导入完整的 Spine 资源。': 'welcome',
  'Ready. Import a complete set of Spine resources.': 'welcome',
  'Choose resource files or a folder.': 'chooseResources',
  'Right-click a resource file or folder, or choose local resources.': 'editorInitial',
  '右键资源文件或文件夹，或选择本地资源。': 'editorInitial',
  '正在识别骨骼版本并匹配依赖…': 'scanning',
  'Scanning resources…': 'scanning',
  'Preparing the resource index…': 'preparing',
  '正在准备资源索引…': 'preparing',
  'No previewable resources found. Check diagnostics or import again.': 'noResources',
  'No complete resources found. Check the diagnostics and import again.': 'noResources',
  '未找到完整可用资源，请查看诊断并重新导入。': 'noResources',
  'This drop contains no editor URI. Use the context menu or Choose files / Choose folder.':
    'editorDropWarning',
  'Scan cancelled. Refresh to try again.': 'scanCancelled',
  '扫描已取消，可以刷新重试。': 'scanCancelled',
};

/** 识别两端正常来源状态；警告及未知宿主错误不能被正常播放状态盖掉。 */
export function isInformationalSourceStatus(message: string): boolean {
  const key = SOURCE_STATUS_KEYS[message];
  return (
    !message ||
    Boolean(key && key !== 'editorDropWarning' && key !== 'scanCancelled') ||
    /^(?:Found \d+ (?:available )?resources\.|发现 \d+ 套可用资源。)$/.test(message)
  );
}

/** 翻译两端已知来源状态；不能识别的实际错误及路径完整原样保留。 */
export function formatSourceStatus(locale: Locale, message: string): string {
  const key = SOURCE_STATUS_KEYS[message];
  if (key) return translate(locale, key);
  const found =
    /^(?:Found (\d+) (?:available )?resources\.|发现 (\d+) 套可用资源。)$/.exec(message);
  return found
    ? translate(locale, 'foundResources', { count: found[1] ?? found[2]! })
    : message;
}

const DIAGNOSTIC_KEYS: Readonly<Record<string, MessageKey>> = {
  VERSION_MISSING: 'diagnosticVersionMissing',
  VERSION_INVALID: 'diagnosticVersionInvalid',
  VERSION_UNSUPPORTED: 'diagnosticVersionUnsupported',
  BINARY_37_UNSUPPORTED: 'diagnosticBinary37',
  BINARY_HISTORICAL_EXPORT: 'diagnosticHistoricalBinary',
  VERSION_PRERELEASE: 'diagnosticPrerelease',
  JSON_INVALID: 'diagnosticJsonInvalid',
  JSON_BONES_INVALID: 'diagnosticBonesInvalid',
  JSON_ANIMATIONS_INVALID: 'diagnosticAnimationsInvalid',
  DEPENDENCY_READ_FAILED: 'diagnosticDependencyRead',
  FILE_READ_FAILED: 'diagnosticFileRead',
  BINARY_HEADER_AMBIGUOUS: 'diagnosticBinaryAmbiguous',
  BINARY_HEADER_INVALID: 'diagnosticBinaryInvalid',
  BINARY_HEADER_TRUNCATED: 'diagnosticBinaryTruncated',
  PATH_INVALID: 'diagnosticPathInvalid',
  PATH_OUTSIDE_ROOT: 'diagnosticPathOutside',
  ATLAS_PMA_INVALID: 'diagnosticAtlasPma',
  ATLAS_PAGE_DUPLICATE: 'diagnosticAtlasDuplicate',
  ATLAS_EMPTY: 'diagnosticAtlasEmpty',
  DEPENDENCY_AMBIGUOUS: 'diagnosticDependencyAmbiguous',
  DEPENDENCY_PATH_MISMATCH: 'diagnosticDependencyMismatch',
  ATLAS_MISSING: 'diagnosticAtlasMissing',
  PAGE_MISSING: 'diagnosticPageMissing',
  PREFERRED_FILE_AMBIGUOUS: 'diagnosticPreferredAmbiguous',
  PREFERRED_FILE_UNASSOCIATED: 'diagnosticPreferredUnassociated',
  IMPORT_FAILED: 'diagnosticImportFailed',
  SCAN_FAILED: 'diagnosticScanFailed',
  PREVIEW_LOAD_FAILED: 'diagnosticLoadFailed',
  RENDER_FAILED: 'diagnosticRenderFailed',
};

/** 本地化已知错误的说明，同时完整保留原始原因；未知错误原样显示。 */
export function formatDiagnostic(locale: Locale, diagnostic: Diagnostic): string {
  const key = DIAGNOSTIC_KEYS[diagnostic.code];
  if (!key) return diagnostic.message;
  const description = translate(locale, key);
  return diagnostic.message && diagnostic.message !== description
    ? translate(locale, 'diagnosticWithCause', { description, cause: diagnostic.message })
    : description;
}
