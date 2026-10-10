import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_LOCALE,
  LOCALE_OPTIONS,
  isLocale,
  LOCALE_STORAGE_KEY,
  createTranslator,
  formatDiagnostic,
  formatSourceStatus,
  isInformationalSourceStatus,
  readLocale,
  saveLocale,
  translate,
} from '../src/i18n.js';
import { en } from '../src/locales/en.js';
import { LOCALES } from '../src/locales/index.js';

describe('界面语言与两端状态', () => {
  it.each(LOCALE_OPTIONS)('$value 语言包完整且插值字段与英文一致', ({ value }) => {
    const messages = LOCALES[value].messages;
    expect(Object.keys(messages).sort()).toEqual(Object.keys(en).sort());
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(messages[key].trim(), `${value}.${key}`).not.toBe('');
      const fields = (text: string) =>
        [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
      expect(fields(messages[key]), `${value}.${key}`).toEqual(fields(en[key]));
    }
  });

  it.each(LOCALE_OPTIONS)('$value 的偏好可恢复，插值不修改原始资源名', ({ value }) => {
    expect(readLocale({ getItem: () => value })).toBe(value);
    const name = 'walk/$&/{count}/奔跑';
    const result = translate(value, 'loadedResource', { name, count: 7 });
    expect(result).toContain(name);
    expect(result).toContain('7');
    expect(result).not.toContain('{name}');
    expect(formatSourceStatus(value, LOCALES.ja.messages.scanCancelled)).toBe(
      LOCALES[value].messages.scanCancelled,
    );
    expect(isInformationalSourceStatus(LOCALES[value].messages.scanCancelled)).toBe(
      false,
    );
  });

  it('非法偏好不允许读取原型属性', () => {
    for (const value of ['__proto__', 'constructor', 'toString', 'unknown', null])
      expect(isLocale(value)).toBe(false);
    expect(readLocale({ getItem: () => '__proto__' })).toBe('en');
  });

  it('默认英文，不根据系统语言选择中文；损坏偏好安全回退', () => {
    expect(DEFAULT_LOCALE).toBe('en');
    vi.stubGlobal('navigator', { language: 'zh-CN' });
    try {
      expect(readLocale({ getItem: () => null })).toBe('en');
      expect(readLocale({ getItem: () => 'unexpected' })).toBe('en');
      expect(readLocale({ getItem: () => 'zh-CN' })).toBe('zh-CN');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('保存显式选择，存储被禁用时读取及保存均不抛错', () => {
    const setItem = vi.fn();
    saveLocale('zh-CN', { setItem });
    expect(setItem).toHaveBeenCalledWith(LOCALE_STORAGE_KEY, 'zh-CN');
    expect(
      readLocale({
        getItem: () => {
          throw new Error('blocked');
        },
      }),
    ).toBe('en');
    expect(() =>
      saveLocale('en', {
        setItem: () => {
          throw new Error('blocked');
        },
      }),
    ).not.toThrow();
  });

  it('插值保留原始资源名、美元符和花括号，不对名称执行二次替换', () => {
    const name = 'walk/$&/{count}/奔跑';
    expect(translate('en', 'loadedResource', { name, count: 7 })).toBe(
      `Loaded ${name}. 7 animations available.`,
    );
    expect(createTranslator('zh-CN')('currentAnimation', { name })).toBe(
      `当前动画：${name}`,
    );
    expect(translate('en', 'loadedResource', { count: 0 })).toBe(
      'Loaded {name}. 0 animations available.',
    );
  });

  it('诊断附带本地化说明，保留实际版本、路径和原始runtime错误', () => {
    const message = '缺少 sub/page.png；runtime 4.2.80 rejected attachment';
    expect(
      formatDiagnostic('en', { code: 'PAGE_MISSING', stage: 'dependency', message }),
    ).toContain(message);
    expect(
      formatDiagnostic('en', { code: 'PAGE_MISSING', stage: 'dependency', message }),
    ).toContain('An atlas page image is missing.');
    expect(formatDiagnostic('zh-CN', { code: 'UNKNOWN', stage: 'render', message })).toBe(
      message,
    );
  });

  it('两端正常状态可翻译，宿主未知错误不能当作正常播放状态忽略', () => {
    expect(formatSourceStatus('zh-CN', 'Found 12 resources.')).toBe(
      '发现 12 套可用资源。',
    );
    expect(formatSourceStatus('en', '发现 2 套可用资源。')).toBe(
      'Found 2 available resources.',
    );
    expect(isInformationalSourceStatus('Found 12 resources.')).toBe(true);
    expect(isInformationalSourceStatus('Found 12 available resources.')).toBe(true);
    expect(isInformationalSourceStatus('EACCES: /project/spine')).toBe(false);
    expect(formatSourceStatus('en', 'EACCES: /project/spine')).toBe(
      'EACCES: /project/spine',
    );
    const warning =
      'This drop contains no editor URI. Use the context menu or Choose files / Choose folder.';
    expect(isInformationalSourceStatus(warning)).toBe(false);
    expect(formatSourceStatus('zh-CN', warning)).toContain('拖放内容');
    expect(isInformationalSourceStatus('Scan cancelled. Refresh to try again.')).toBe(
      false,
    );
  });
});
