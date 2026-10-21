import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import type { SpineResource } from '@spine-preview/core';
import { createTranslator, type Locale } from '../i18n.js';

const SLOT_PICKER_HEIGHT_KEY = 'spine-resource-preview.slot-picker-height';
const DEFAULT_SLOT_PICKER_HEIGHT = 210;
const MIN_SLOT_PICKER_HEIGHT = 80;
const SLOT_PICKER_BOTTOM_GAP = 14;

/** 画布上方的资源版本信息与本地处理提示。 */
interface PreviewToolbarProps {
  /** 当前界面语言。 */
  locale: Locale;
  /** 当前选中的资源。 */
  resource: SpineResource | undefined;
  /** 当前骨架声明的全部插槽。 */
  slots: readonly string[];
  /** 当前高亮插槽。 */
  selectedSlot: string | undefined;
  /** 选择或取消一个插槽。 */
  onSelectSlot(name: string): void;
}

/** 左上角展示资源版本和插槽，右上角展示本地处理提示。 */
export function PreviewToolbar({
  locale,
  resource,
  slots,
  selectedSlot,
  onSelectSlot,
}: PreviewToolbarProps) {
  const t = createTranslator(locale);
  const picker = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: number;
    startY: number;
    startHeight: number;
  } | null>(null);
  const heightRef = useRef<number | undefined>(undefined);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);

  const applyHeight = useCallback((value: number | undefined) => {
    heightRef.current = value;
    setHeight(value);
  }, []);

  const measureMaxHeight = useCallback((): number | undefined => {
    const pickerElement = picker.current;
    const canvas = pickerElement?.closest<HTMLElement>('.canvas-area');
    if (!pickerElement || !canvas) return undefined;
    return Math.max(
      1,
      Math.floor(
        canvas.getBoundingClientRect().bottom -
          pickerElement.getBoundingClientRect().top -
          SLOT_PICKER_BOTTOM_GAP,
      ),
    );
  }, []);

  const saveHeight = useCallback((value: number | undefined) => {
    try {
      if (value === undefined) localStorage.removeItem(SLOT_PICKER_HEIGHT_KEY);
      else localStorage.setItem(SLOT_PICKER_HEIGHT_KEY, String(value));
    } catch {
      // 禁用本地存储时仍支持本次拖动。
    }
  }, []);

  const finishDrag = useCallback(() => {
    const active = drag.current;
    if (!active) return;
    drag.current = null;
    const handle = picker.current?.querySelector<HTMLElement>(
      '.slot-picker-resize-handle',
    );
    if (handle?.hasPointerCapture(active.id)) handle.releasePointerCapture(active.id);
    picker.current
      ?.closest<HTMLElement>('.canvas-area')
      ?.classList.remove('resizing-slot-picker');
    if (heightRef.current !== undefined) saveHeight(Math.round(heightRef.current));
  }, [saveHeight]);

  useLayoutEffect(() => {
    if (!picker.current) return;
    try {
      const saved = Number(localStorage.getItem(SLOT_PICKER_HEIGHT_KEY));
      if (Number.isFinite(saved) && saved >= MIN_SLOT_PICKER_HEIGHT)
        applyHeight(Math.round(saved));
    } catch {
      // 本地存储不可用时使用自动高度。
    }
    const measure = () => {
      const max = measureMaxHeight();
      if (max === undefined) return;
      setMaxHeight(max);
      const current = heightRef.current;
      if (current !== undefined && current > max)
        applyHeight(Math.max(1, Math.round(max)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    const canvas = picker.current.closest<HTMLElement>('.canvas-area');
    if (canvas) observer.observe(canvas);
    window.addEventListener('resize', measure);
    return () => {
      finishDrag();
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [slots.length, applyHeight, finishDrag, measureMaxHeight]);

  const pickerStyle = {
    ...(maxHeight !== undefined
      ? { '--slot-picker-bottom-limit': `${maxHeight}px` }
      : {}),
    ...(height !== undefined ? { height: `${height}px` } : {}),
  } as CSSProperties;

  const resizeBy = (delta: number) => {
    const pickerElement = picker.current;
    if (!pickerElement) return;
    const max = measureMaxHeight();
    if (max === undefined) return;
    const min = Math.min(MIN_SLOT_PICKER_HEIGHT, max);
    const current = heightRef.current ?? pickerElement.getBoundingClientRect().height;
    const next = Math.round(Math.max(min, Math.min(max, current + delta)));
    applyHeight(next);
    saveHeight(next);
  };

  return (
    <div className="preview-overlay-top">
      <div className="preview-overlay-column">
        {resource && (
          <div className="preview-info">
            {t('assetSummary', {
              exportVersion: resource.exportVersion,
              version: resource.version,
              count: resource.pages.length,
            })}
          </div>
        )}
        {slots.length > 0 && (
          <div
            ref={picker}
            className={`slot-picker${height !== undefined ? ' resized' : ''}`}
            role="group"
            aria-label={t('slots')}
            style={pickerStyle}
          >
            <div className="slot-picker-heading">
              <span>{t('slots')}</span>
              <span>{slots.length}</span>
            </div>
            <div className="slot-picker-list">
              {slots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  className={slot === selectedSlot ? 'selected' : undefined}
                  aria-pressed={slot === selectedSlot}
                  title={slot}
                  onClick={() => onSelectSlot(slot)}
                >
                  {slot}
                </button>
              ))}
            </div>
            <div
              className="slot-picker-resize-handle"
              role="separator"
              tabIndex={0}
              aria-label={t('resizeSlots')}
              aria-orientation="horizontal"
              aria-valuemin={Math.min(MIN_SLOT_PICKER_HEIGHT, maxHeight ?? Infinity)}
              aria-valuemax={maxHeight}
              aria-valuenow={height}
              aria-valuetext={height === undefined ? undefined : `${height}px`}
              title={t('resizeSlots')}
              onPointerDown={(event) => {
                if (event.button !== 0 || drag.current) return;
                const max = measureMaxHeight();
                if (max === undefined) return;
                event.preventDefault();
                event.currentTarget.focus({ preventScroll: true });
                event.currentTarget.setPointerCapture(event.pointerId);
                const startHeight = Math.min(
                  max,
                  picker.current?.getBoundingClientRect().height ??
                    DEFAULT_SLOT_PICKER_HEIGHT,
                );
                applyHeight(Math.round(startHeight));
                drag.current = {
                  id: event.pointerId,
                  startY: event.clientY,
                  startHeight,
                };
                picker.current
                  ?.closest<HTMLElement>('.canvas-area')
                  ?.classList.add('resizing-slot-picker');
              }}
              onPointerMove={(event) => {
                const active = drag.current;
                if (active?.id !== event.pointerId) return;
                const max = measureMaxHeight();
                if (max === undefined) return;
                const min = Math.min(MIN_SLOT_PICKER_HEIGHT, max);
                applyHeight(
                  Math.round(
                    Math.max(
                      min,
                      Math.min(max, active.startHeight + event.clientY - active.startY),
                    ),
                  ),
                );
              }}
              onPointerUp={finishDrag}
              onPointerCancel={finishDrag}
              onLostPointerCapture={finishDrag}
              onDoubleClick={() => {
                applyHeight(undefined);
                saveHeight(undefined);
              }}
              onKeyDown={(event) => {
                const step = event.shiftKey ? 50 : 10;
                switch (event.key) {
                  case 'ArrowUp':
                    resizeBy(-step);
                    break;
                  case 'ArrowDown':
                    resizeBy(step);
                    break;
                  case 'Home':
                    resizeBy(-Number.MAX_SAFE_INTEGER);
                    break;
                  case 'End':
                    resizeBy(Number.MAX_SAFE_INTEGER);
                    break;
                  case 'Enter':
                    applyHeight(undefined);
                    saveHeight(undefined);
                    break;
                  default:
                    return;
                }
                event.preventDefault();
              }}
            />
          </div>
        )}
      </div>
      <span className="local-badge">
        <span aria-hidden="true" />
        {t('privacy')}
      </span>
    </div>
  );
}
