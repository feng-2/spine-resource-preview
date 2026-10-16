import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createTranslator, type Locale } from '../i18n.js';

const DEFAULT_WIDTH = 300;
const DEFAULT_SPLIT = 0.42;
const MIN_WIDTH = 220;
const MIN_PREVIEW_WIDTH = 320;
const MIN_PANEL_HEIGHT = 85;

/** Web 侧栏宽度与上下分区共用的拖动、键盘调整和偏好保存。 */
export function SidebarResizeHandle({
  locale,
  sidebarId,
  axis = 'width',
}: {
  locale: Locale;
  sidebarId: string;
  axis?: 'width' | 'height';
}) {
  const t = createTranslator(locale);
  const verticalSplit = axis === 'height';
  const min = verticalSplit ? MIN_PANEL_HEIGHT : MIN_WIDTH;
  const storageKey = verticalSplit
    ? 'spine-resource-preview.sidebar-split'
    : 'spine-resource-preview.sidebar-width';
  const property = verticalSplit ? '--resource-panel-height' : '--sidebar-width';
  const activeClass = verticalSplit ? 'resizing-sidebar-panels' : 'resizing-sidebar';
  const handle = useRef<HTMLDivElement>(null);
  const preferred = useRef(verticalSplit ? DEFAULT_SPLIT : DEFAULT_WIDTH);
  const drag = useRef<{ id: number; coordinate: number; value: number } | null>(null);
  const [size, setSize] = useState({ value: min, max: min });

  const measureLayout = useCallback(() => {
    const container = handle.current?.parentElement;
    const sidebar = document.getElementById(sidebarId);
    const panel = verticalSplit
      ? sidebar?.querySelector<HTMLElement>('.resource-section')
      : sidebar;
    if (!container || !panel) return;
    let available = container.clientWidth;
    let reserved = MIN_PREVIEW_WIDTH;
    if (verticalSplit) {
      const style = getComputedStyle(container);
      available =
        container.clientHeight -
        parseFloat(style.paddingTop) -
        parseFloat(style.paddingBottom);
      reserved =
        MIN_PANEL_HEIGHT +
        2 * parseFloat(style.rowGap) +
        (handle.current?.offsetHeight ?? 7);
    }
    return {
      container,
      panel,
      available,
      max: Math.max(min, available - reserved),
    };
  }, [sidebarId, verticalSplit, min]);

  const save = useCallback(() => {
    try {
      localStorage.setItem(storageKey, String(preferred.current));
    } catch {
      // 禁用本地存储时仍支持本次拖动。
    }
  }, [storageKey]);

  const finish = useCallback(() => {
    const active = drag.current;
    if (!active) return;
    drag.current = null;
    handle.current?.parentElement?.classList.remove(activeClass);
    if (handle.current?.hasPointerCapture(active.id))
      handle.current.releasePointerCapture(active.id);
    save();
  }, [activeClass, save]);

  const resize = useCallback(
    (value: number) => {
      const layout = measureLayout();
      if (!layout) return;
      const next = Math.round(Math.max(min, Math.min(layout.max, value)));
      preferred.current = verticalSplit ? next / Math.max(1, layout.available) : next;
      layout.container.style.setProperty(
        property,
        verticalSplit ? `${preferred.current * 100}%` : `${next}px`,
      );
      setSize({ value: next, max: layout.max });
    },
    [measureLayout, min, property, verticalSplit],
  );

  const reset = () => {
    const layout = measureLayout();
    if (!layout) return;
    resize(verticalSplit ? layout.available * DEFAULT_SPLIT : DEFAULT_WIDTH);
    save();
  };

  useLayoutEffect(() => {
    const layout = measureLayout();
    if (!layout) return;
    preferred.current = verticalSplit ? DEFAULT_SPLIT : DEFAULT_WIDTH;
    try {
      const saved = Number(localStorage.getItem(storageKey));
      if (
        Number.isFinite(saved) &&
        (verticalSplit ? saved > 0 && saved < 1 : saved >= min)
      )
        preferred.current = saved;
    } catch {
      // 本地存储不可用时使用默认尺寸。
    }
    layout.container.style.setProperty(
      property,
      verticalSplit ? `${preferred.current * 100}%` : `${preferred.current}px`,
    );
    const measure = () => {
      const current = measureLayout();
      if (!current) return;
      setSize({
        value: Math.round(
          verticalSplit
            ? current.panel.getBoundingClientRect().height
            : current.panel.getBoundingClientRect().width,
        ),
        max: Math.floor(current.max),
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(layout.container);
    observer.observe(layout.panel);
    window.addEventListener('blur', finish);
    window.addEventListener('resize', finish);
    return () => {
      finish();
      observer.disconnect();
      layout.container.style.removeProperty(property);
      layout.container.classList.remove(activeClass);
      window.removeEventListener('blur', finish);
      window.removeEventListener('resize', finish);
    };
  }, [measureLayout, verticalSplit, storageKey, min, property, finish, activeClass]);

  const label = t(verticalSplit ? 'resizeSidebarPanels' : 'resizeSidebar');
  return (
    <div
      ref={handle}
      className={verticalSplit ? 'sidebar-panel-resize-handle' : 'sidebar-resize-handle'}
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-controls={sidebarId}
      aria-orientation={verticalSplit ? 'horizontal' : 'vertical'}
      aria-valuemin={min}
      aria-valuemax={size.max}
      aria-valuenow={size.value}
      aria-valuetext={`${size.value}px`}
      title={label}
      onPointerDown={(event) => {
        if (event.button !== 0 || drag.current) return;
        const layout = measureLayout();
        if (!layout) return;
        event.preventDefault();
        event.currentTarget.focus({ preventScroll: true });
        event.currentTarget.setPointerCapture(event.pointerId);
        const bounds = layout.panel.getBoundingClientRect();
        drag.current = {
          id: event.pointerId,
          coordinate: verticalSplit ? event.clientY : event.clientX,
          value: verticalSplit ? bounds.height : bounds.width,
        };
        layout.container.classList.add(activeClass);
      }}
      onPointerMove={(event) => {
        const active = drag.current;
        if (active?.id === event.pointerId)
          resize(
            active.value +
              (verticalSplit ? event.clientY : event.clientX) -
              active.coordinate,
          );
      }}
      onPointerUp={finish}
      onPointerCancel={finish}
      onLostPointerCapture={finish}
      onDoubleClick={reset}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 50 : 10;
        let next: number;
        switch (event.key) {
          case verticalSplit ? 'ArrowUp' : 'ArrowLeft':
            next = size.value - step;
            break;
          case verticalSplit ? 'ArrowDown' : 'ArrowRight':
            next = size.value + step;
            break;
          case 'Home':
            next = min;
            break;
          case 'End':
            next = size.max;
            break;
          case 'Enter':
            event.preventDefault();
            reset();
            return;
          default:
            return;
        }
        event.preventDefault();
        resize(next);
        save();
      }}
    />
  );
}
