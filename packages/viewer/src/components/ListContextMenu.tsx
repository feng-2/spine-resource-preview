import { useEffect, useLayoutEffect, useRef } from 'react';
import './list-context-menu.css';

interface ListContextMenuProps {
  label: string;
  x: number;
  y: number;
  trigger: HTMLElement;
  items: readonly { label: string; onSelect(): void }[];
  onClose(): void;
}

/** 资源和动画列表共享的右键菜单，保持定位、关闭和键盘行为一致。 */
export function ListContextMenu({
  label,
  x,
  y,
  trigger,
  items,
  onClose,
}: ListContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    element.style.left = `${Math.max(8, Math.min(x, window.innerWidth - bounds.width - 8))}px`;
    element.style.top = `${Math.max(8, Math.min(y, window.innerHeight - bounds.height - 8))}px`;
    element.querySelector<HTMLButtonElement>('button')?.focus();
  }, [x, y]);

  useEffect(() => {
    const dismiss = (event: Event) => {
      if (!(event.target instanceof Node) || !ref.current?.contains(event.target))
        onClose();
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', onClose);
    window.addEventListener('blur', onClose);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', onClose);
      window.removeEventListener('blur', onClose);
    };
  }, [onClose]);

  return (
    <div
      className="list-context-menu"
      role="menu"
      aria-label={label}
      ref={ref}
      style={{ left: x, top: y }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' || event.key === 'Tab') {
          onClose();
          trigger.focus({ preventScroll: true });
          if (event.key === 'Escape') event.preventDefault();
        } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          const buttons = [
            ...event.currentTarget.querySelectorAll<HTMLButtonElement>('button'),
          ];
          const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
          const next =
            event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? buttons.length - 1
                : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) %
                  buttons.length;
          buttons[next]?.focus();
        }
      }}
    >
      {items.map((item) => (
        <button type="button" role="menuitem" key={item.label} onClick={item.onSelect}>
          {item.label}
        </button>
      ))}
    </div>
  );
}
