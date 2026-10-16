import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  getLocalizedMessage,
  HOST_LOCALES,
  resolveHostLocale,
  type HostLocale,
  type HostTextKey,
} from '../src/host/i18n.js';

const locales = Object.keys(HOST_LOCALES) as HostLocale[];

describe('VS Code 原生本地化与扩展清单', () => {
  it.each(locales)('%s 的原生词条和菜单完整，模板字段一致', (locale) => {
    const source = HOST_LOCALES.en;
    const messages = HOST_LOCALES[locale];
    expect(Object.keys(messages).sort()).toEqual(Object.keys(source).sort());
    const fields = (text: string) =>
      [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
    for (const key of Object.keys(source) as HostTextKey[]) {
      expect(messages[key].trim()).not.toBe('');
      expect(fields(messages[key]), `${locale}.${key}`).toEqual(fields(source[key]));
    }
    const filename =
      locale === 'en' ? 'package.nls.json' : `package.nls.${locale.toLowerCase()}.json`;
    const metadata = JSON.parse(
      readFileSync(new URL(`../${filename}`, import.meta.url), 'utf8'),
    );
    expect(Object.keys(metadata).sort()).toEqual([
      'command.copyAnimationName.title',
      'command.copyName.title',
      'command.copyPath.title',
      'command.copyRelativePath.title',
      'command.open.title',
      'command.refresh.title',
      'command.workspace.title',
      'container.spine.title',
      'extension.description',
      'extension.displayName',
      'view.animations.title',
      'view.resources.title',
    ]);
    for (const text of Object.values(metadata)) expect(String(text).trim()).not.toBe('');
    expect(metadata['extension.displayName']).toBe(messages.panelTitle);
  });

  it('目录和文件复制菜单及动画行内按钮仅出现在对应树中', () => {
    const manifest = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
    );
    const menus = manifest.contributes.menus['view/item/context'] as {
      command: string;
      when: string;
      group: string;
    }[];
    for (const command of ['copyName', 'copyPath', 'copyRelativePath']) {
      const menu = menus.find((entry) => entry.command === `spinePreview.${command}`)!;
      expect(menu.when).toBe(
        'view == spinePreview.resources && viewItem =~ /^spinePreview\\.(scope|folder|resource)$/',
      );
      expect(menu.group).toMatch(/^clipboard@/);
    }
    const copyAnimation = menus.find(
      (entry) => entry.command === 'spinePreview.copyAnimationName',
    )!;
    expect(copyAnimation.group).toBe('inline@1');
    expect(copyAnimation.when).toBe(
      'view == spinePreview.animations && viewItem == spinePreview.animation',
    );
    const animationContextMenu = menus.filter(
      (entry) => entry.when === copyAnimation.when && !entry.group.startsWith('inline'),
    );
    expect(animationContextMenu).toEqual([
      {
        command: 'spinePreview.copyName',
        when: copyAnimation.when,
        group: 'clipboard@1',
      },
    ]);
    expect(
      manifest.contributes.commands.find(
        (command: { command: string }) => command.command === copyAnimation.command,
      ).icon,
    ).toBe('$(copy)');
  });

  it('原生活动栏及两个视图声明存在的可迁移图标', () => {
    const manifest = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
    ) as {
      contributes: {
        viewsContainers: { activitybar: { id: string; icon: string }[] };
        views: { spinePreview: { id: string; icon: string }[] };
      };
    };
    const views = manifest.contributes.views.spinePreview;
    expect(views.map((view) => view.id)).toEqual([
      'spinePreview.resources',
      'spinePreview.animations',
    ]);
    const container = manifest.contributes.viewsContainers.activitybar.find(
      (item) => item.id === 'spinePreview',
    );
    expect(container).toBeDefined();
    for (const contribution of [container!, ...views]) {
      expect(contribution.icon).toBe('assets/sidebar.svg');
      expect(
        readFileSync(new URL(`../${contribution.icon}`, import.meta.url), 'utf8'),
      ).toContain('<svg');
    }
  });

  it.each([
    ['zh-cn', 'zh-CN'],
    ['zh-Hans-CN', 'zh-CN'],
    ['zh-tw', 'zh-TW'],
    ['zh-Hant', 'zh-TW'],
    ['zh-hk', 'zh-TW'],
    ['pt-br', 'pt-BR'],
    ['pt-PT', 'pt-BR'],
    ['de-AT', 'de'],
    ['ja', 'ja'],
    ['en-us', 'en'],
    ['unknown', 'en'],
    ['constructor', 'en'],
    ['__proto__', 'en'],
  ])('%s 解析为 %s', (language, locale) => {
    expect(resolveHostLocale(language)).toBe(locale);
  });

  it.each(locales)('%s 的插值保留原始路径，零值不丢失', (locale) => {
    const target = '/assets/$&/{count}/hero.json';
    expect(getLocalizedMessage(locale, 'scanStarting', { target })).toContain(target);
    expect(getLocalizedMessage(locale, 'filesIndexed', { count: 0 })).toContain('0');
    expect(getLocalizedMessage(locale, 'scanStarting')).toContain('{target}');
  });
});
