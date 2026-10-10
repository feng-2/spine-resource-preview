import { describe, expect, it } from 'vitest';
import {
  readAtlasPages,
  normalizeResourcePath,
  resolveDependencyPath,
} from '../src/index.js';

describe('图集页面与路径结构', () => {
  it('兼容旧格式与新版缩进元数据，区域旋转不误当页面，保留逐页 PMA', () => {
    const text =
      '\ufeff\nimages/first.png\nsize: 64,64\nformat: RGBA8888\nfilter: Linear,Linear\nregion\n  rotate: true\n  xy: 1,2\n  size: 3,4\n  pma: true\n\nsecond.webp\n\tsize: 32, 32\n\tpma: false\n\tscale: 0.5\nregion2\n\tbounds: 1, 2, 3, 4\n\nthird.png\n\tpma: true\n';
    expect(readAtlasPages(text)).toEqual([
      { name: 'images/first.png' },
      { name: 'second.webp', pma: false },
      { name: 'third.png', pma: true },
    ]);
  });

  it('页面没有 size 属性也可发现，旧时代 atlas 允许省略尺寸', () => {
    expect(
      readAtlasPages(
        'page.png\nformat: RGBA8888\nfilter: Linear, Linear\nregion\n  xy: 0,0',
      ),
    ).toEqual([{ name: 'page.png' }]);
  });

  it('无页、重复页和错误 PMA 有稳定错误码', () => {
    expect(() => readAtlasPages('')).toThrow('没有有效页图片');
    expect(() => readAtlasPages('page.png\nsize: 1,1\n\npage.png\nsize: 1,1')).toThrow(
      '重复',
    );
    expect(() => readAtlasPages('page.png\npma: maybe')).toThrow('pma 标记无效');
  });

  it('规范化目录分隔符与安全父级引用，拒绝绝对路径及越过来源根', () => {
    expect(normalizeResourcePath('pack\\a\\..\\b/file.png')).toBe('pack/b/file.png');
    expect(resolveDependencyPath('pack/a/hero.atlas', '../images/page.png')).toBe(
      'pack/images/page.png',
    );
    expect(() => resolveDependencyPath('pack/hero.atlas', '../../page.png')).toThrow(
      '越过来源根',
    );
    expect(() => resolveDependencyPath('pack/hero.atlas', '/outside/page.png')).toThrow(
      '相对路径',
    );
    expect(() => normalizeResourcePath('C:\\outside\\page.png')).toThrow('相对路径');
  });
});
