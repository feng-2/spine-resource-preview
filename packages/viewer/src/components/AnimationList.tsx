import { createTranslator, type Locale } from '../i18n.js';

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
export function AnimationList({
  locale,
  animations,
  animation,
  ready,
  onPlay,
}: AnimationListProps) {
  const t = createTranslator(locale);
  return (
    <section className="list-section animation-section">
      <div className="section-heading">
        <h2>{t('animations')}</h2>
        <span>{animations.length}</span>
      </div>
      <div className="animation-list">
        {animations.length ? (
          animations.map((name) => (
            <button
              key={name}
              className={`animation-button${animation === name ? ' selected' : ''}`}
              title={name}
              aria-pressed={animation === name}
              onClick={() => onPlay(name)}
            >
              {name}
            </button>
          ))
        ) : (
          <p className="muted empty-list">
            {t(ready ? 'animationNone' : 'animationEmpty')}
          </p>
        )}
      </div>
    </section>
  );
}
