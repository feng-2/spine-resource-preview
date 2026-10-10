import { useId } from 'react';
import type { PreviewState } from '@spine-preview/runtimes';
import { createTranslator, type Locale } from '../i18n.js';

/** 受控播放栏与操作提示，不执行逐帧React更新。 */
interface PlaybackControlsProps {
  /** 当前界面语言。 */
  locale: Locale;
  /** 控制器是否就绪。 */
  ready: boolean;
  /** 是否有可播放动作。 */
  hasAnimations: boolean;
  /** 当前原始动作名称。 */
  animation: string | undefined;
  /** 实际暂停和缩放状态。 */
  view: PreviewState;
  /** 当前循环选项。 */
  loop: boolean;
  /** 当前播放倍速。 */
  speed: number;
  /** 暂停或恢复。 */
  onPause(): void;
  /** 重播当前动作。 */
  onReplay(): void;
  /** 更新循环并重播当前动作。 */
  onLoop(value: boolean): void;
  /** 更新播放倍速。 */
  onSpeed(value: number): void;
  /** 手动缩放并退出fit。 */
  onZoom(value: number): void;
}

/** 受控播放栏与操作提示，不执行逐帧React更新。 */
export function PlaybackControls({
  locale,
  ready,
  hasAnimations,
  animation,
  view,
  loop,
  speed,
  onPause,
  onReplay,
  onLoop,
  onSpeed,
  onZoom,
}: PlaybackControlsProps) {
  const t = createTranslator(locale);
  const zoomId = useId();
  const zoomPercent =
    view.zoom * 100 < 1 ? (view.zoom * 100).toFixed(2) : Math.round(view.zoom * 100);
  return (
    <>
      <div className="playback-bar">
        <div className="playback-actions">
          <button
            className="primary"
            disabled={!ready || !hasAnimations}
            onClick={onPause}
          >
            {t(view.paused ? 'resume' : 'pause')}
          </button>
          <button disabled={!ready || animation === undefined} onClick={onReplay}>
            {t('replay')}
          </button>
          <label className="loop-label">
            <input
              type="checkbox"
              checked={loop}
              disabled={!ready || !hasAnimations}
              onChange={(event) => onLoop(event.currentTarget.checked)}
            />
            {t('loop')}
          </label>
          <label>
            {t('speed')}
            <select
              aria-label={t('playbackSpeed')}
              value={speed}
              disabled={!ready}
              onChange={(event) => onSpeed(Number(event.currentTarget.value))}
            >
              {[0.25, 0.5, 1, 1.5, 2].map((value) => (
                <option key={value} value={value}>
                  {t('speedOption', { value })}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="zoom-control">
          <label htmlFor={zoomId}>{t('zoom')}</label>
          <input
            id={zoomId}
            type="range"
            min={Math.min(0.05, view.zoom)}
            max="10"
            step="any"
            disabled={!ready}
            value={view.zoom}
            aria-label={t('previewZoom')}
            onChange={(event) => onZoom(Number(event.currentTarget.value))}
          />
          <output htmlFor={zoomId}>{t('zoomValue', { value: zoomPercent })}</output>
        </div>
      </div>
      <footer className="preview-footer">
        <span>
          {animation !== undefined
            ? t('currentAnimation', { name: animation })
            : ready
              ? t('setupPose')
              : t('noAnimation')}
        </span>
        <span>{t('canvasHint')}</span>
      </footer>
    </>
  );
}
