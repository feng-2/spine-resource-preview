import { describe, expect, it, vi } from 'vitest';
import { LOCALE_OPTIONS, LOCALE_STORAGE_KEY } from '@spine-preview/viewer';
import { LANGUAGES } from '@spine-preview/viewer/languages';
import { en } from '../src/locales/en.js';
import { SITE_LOCALES } from '../src/locales/index.js';
import {
  DEFAULT_SITE_LOCALE,
  SITE_LANGUAGE_OPTIONS,
  SITE_LOCALE_STORAGE_KEY,
  isSiteLocale,
  readSiteLocale,
  saveSiteLocale,
} from '../src/i18n.js';

describe('宣传页语言包与偏好', () => {
  it('与 viewer 的实际语言种类、顺序和名称完全一致，偏好键相互独立', () => {
    expect(SITE_LANGUAGE_OPTIONS).toEqual(LOCALE_OPTIONS);
    expect(Object.keys(SITE_LOCALES)).toEqual(
      LOCALE_OPTIONS.map((option) => option.value),
    );
    expect(SITE_LOCALE_STORAGE_KEY).not.toBe(LOCALE_STORAGE_KEY);
    expect(SITE_LOCALE_STORAGE_KEY).toBe('spine-resource-preview.site.locale');
  });

  it.each(SITE_LANGUAGE_OPTIONS)(
    '$value 完整覆盖词条、保留占位符并提供独立宣传翻译',
    ({ value }) => {
      const messages = SITE_LOCALES[value];
      expect(Object.keys(messages).sort()).toEqual(Object.keys(en).sort());
      const fields = (text: string) =>
        [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
      for (const key of Object.keys(en) as (keyof typeof en)[]) {
        expect(messages[key].trim(), `${value}.${key}`).not.toBe('');
        expect(fields(messages[key]), `${value}.${key}`).toEqual(fields(en[key]));
      }
      if (value !== 'en') {
        // 防止新语言实际上整页回退英文；产品名和技术格式可以保持原样。
        expect(
          Object.keys(en).filter(
            (key) => messages[key as keyof typeof en] !== en[key as keyof typeof en],
          ).length,
        ).toBeGreaterThan(75);
      }
      expect(LANGUAGES[value].compactLabel.trim()).not.toBe('');
      expect(messages.mainNavigation).toBeTruthy();
      expect(messages.resourceNavigation).toBeTruthy();
    },
  );

  it.each(SITE_LANGUAGE_OPTIONS)(
    '$value 的明确选择保存后可恢复，不修改 viewer 偏好',
    ({ value }) => {
      const values = new Map([[LOCALE_STORAGE_KEY, 'ja']]);
      const storage = {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, next: string) => {
          values.set(key, next);
        },
      };
      saveSiteLocale(value, storage);
      expect(readSiteLocale(storage)).toBe(value);
      expect(values.get(LOCALE_STORAGE_KEY)).toBe('ja');
    },
  );

  it('首次使用和未知、损坏、原型属性偏好均回退英文，不根据系统语言切换', () => {
    expect(DEFAULT_SITE_LOCALE).toBe('en');
    vi.stubGlobal('navigator', { language: 'zh-CN' });
    try {
      for (const value of [null, '', 'unknown', 'constructor', '__proto__', 'toString']) {
        expect(isSiteLocale(value)).toBe(false);
        expect(readSiteLocale({ getItem: () => value })).toBe('en');
      }
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('存储不可用时仍可正常读取和选择语言', () => {
    expect(
      readSiteLocale({
        getItem() {
          throw new Error('blocked');
        },
      }),
    ).toBe('en');
    expect(() =>
      saveSiteLocale('ru', {
        setItem() {
          throw new Error('blocked');
        },
      }),
    ).not.toThrow();
  });
});
