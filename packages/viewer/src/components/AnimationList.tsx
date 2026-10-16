import { memo, useEffect, useId, useState } from 'react';
import { copyText } from '../clipboard.js';
import { createTranslator, type Locale } from '../i18n.js';
import { ListContextMenu } from './ListContextMenu.js';

/** 动作选择与无动画初始姿态提示。 */
interface AnimationListProps {
  /** 当前界面语言。 */
  locale: Locale;
  /** 原始动作名称。 */
  animations: readonly string[];
  /** 当前动作，空字符串也是有效名称。 */
  animation: string | undefined;
  /** 资源是否加载完成。 */
  ready: boolean;
  /** 从头播放原始动作。 */
  onPlay(name: string): void;
}

/** 动作选择与无动画初始姿态提示。 */
export const AnimationList = memo(function AnimationList({
  locale,
  animations,
  animation,
  ready,
  onPlay,
}: AnimationListProps) {
  const t = createTranslator(locale);
  const tooltipId = useId();
  const [copyError, setCopyError] = useState(false);
  const [menu, setMenu] = useState<{
    name: string;
    x: number;
    y: number;
    trigger: HTMLElement;
  } | null>(null);

  useEffect(() => {
    setMenu(null);
    setCopyError(false);
  }, [animations]);

  async function copy(name: string) {
    setCopyError(false);
    setMenu(null);
    menu?.trigger.focus({ preventScroll: true });
    try {
      await copyText(name);
    } catch {
      setCopyError(true);
    }
  }
  return (
    <section className="list-section animation-section">
      <div className="section-heading">
        <h2>{t('animations')}</h2>
        <span>{animations.length}</span>
      </div>
      <div className="animation-list">
        {animations.length ? (
          animations.map((name, index) => (
            <div
              key={name}
              className={`animation-row${animation === name ? ' selected' : ''}`}
              onContextMenu={(event) => {
                event.preventDefault();
                const trigger = event.currentTarget.querySelector<HTMLElement>('button')!;
                trigger.focus();
                setCopyError(false);
                setMenu({ name, x: event.clientX, y: event.clientY, trigger });
              }}
              onKeyDown={(event) => {
                if (
                  event.key !== 'ContextMenu' &&
                  !(event.key === 'F10' && event.shiftKey)
                )
                  return;
                event.preventDefault();
                const trigger = event.target as HTMLElement;
                const bounds = trigger.getBoundingClientRect();
                setCopyError(false);
                setMenu({ name, x: bounds.left + 18, y: bounds.bottom, trigger });
              }}
            >
              <button
                className="animation-button"
                title={name}
                aria-pressed={animation === name}
                onClick={() => onPlay(name)}
              >
                {name}
              </button>
              <button
                className="animation-copy"
                aria-label={t('copyAnimationName', { name })}
                aria-describedby={`${tooltipId}-${index}`}
                onClick={() => void copy(name)}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <rect x="5" y="5" width="9" height="9" rx="1" stroke="currentColor" />
                  <path d="M11 3V2H2v9h1" stroke="currentColor" />
                </svg>
                <span
                  id={`${tooltipId}-${index}`}
                  className="copy-tooltip"
                  role="tooltip"
                >
                  {t('copyName')}
                </span>
              </button>
            </div>
          ))
        ) : (
          <p className="muted empty-list">
            {t(ready ? 'animationNone' : 'animationEmpty')}
          </p>
        )}
      </div>
      {copyError && (
        <p role="alert" className="copy-error">
          {t('copyFailed')}
        </p>
      )}
      {menu && (
        <ListContextMenu
          {...menu}
          label={menu.name}
          onClose={() => setMenu(null)}
          items={[{ label: t('copyName'), onSelect: () => void copy(menu.name) }]}
        />
      )}
    </section>
  );
});
