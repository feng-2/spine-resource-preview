import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';

/** 一项语言的稳定值与人类可识别名称。 */
export interface LanguageOption<Value extends string = string> {
  /** 持久化使用的语言标识。 */
  value: Value;
  /** 语言自身名称。 */
  label: string;
  /** 可选辅助名称，便于辨认不同文字系统。 */
  description?: string;
}

/** 宣传页和两端预览工具共用的语言菜单契约。 */
export interface LanguageMenuProps<Value extends string> {
  /** 当前选中的语言。 */
  value: Value;
  /** 按展示顺序排列的语言。 */
  options: readonly LanguageOption<Value>[];
  /** 本地化的控件名称，也用于菜单标题。 */
  label: string;
  /** 选择语言后由调用方更新状态和持久化。 */
  onChange(value: Value): void;
  /** 与所在页面一致的配色。 */
  theme?: 'light' | 'dark';
  /** 窄头部可用简短名称，菜单仍显示完整语言名。 */
  compactLabel?: string;
}

/** 使用固定定位弹层，避免 Webview 画布和窄屏容器裁切语言选项。 */
export function LanguageMenu<Value extends string>({
  value,
  options,
  label,
  onChange,
  theme = 'dark',
  compactLabel,
}: LanguageMenuProps<Value>) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState({
    left: 0,
    top: 0,
    width: 272,
    maxHeight: 440,
  });
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const requestedFocus = useRef(0);
  const search = useRef('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const panelId = useId();
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const selected = options[selectedIndex];

  function close(restoreFocus = false): void {
    setOpen(false);
    search.current = '';
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (restoreFocus) trigger.current?.focus({ preventScroll: true });
  }
  function show(index = selectedIndex): void {
    requestedFocus.current = index;
    setActiveIndex(index);
    setOpen(true);
  }
  function focusItem(index: number): void {
    setActiveIndex(index);
    const item = items.current[index];
    item?.focus({ preventScroll: true });
    item?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  }

  useLayoutEffect(() => {
    if (!open) return;
    // 按可见空间向上或向下展开，并始终保留左右边距。
    function place(): void {
      const anchor = trigger.current?.getBoundingClientRect();
      if (!anchor) return;
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = window.innerHeight;
      if (anchor.bottom < 0 || anchor.top > viewportHeight) {
        setOpen(false);
        return;
      }
      const margin = 12;
      const gap = 8;
      const width = Math.min(272, Math.max(0, viewportWidth - margin * 2));
      const desiredHeight = Math.min(440, 44 + options.length * 52);
      const below = Math.max(0, viewportHeight - anchor.bottom - gap - margin);
      const above = Math.max(0, anchor.top - gap - margin);
      const upward = below < Math.min(desiredHeight, above);
      const maxHeight = Math.min(440, upward ? above : below);
      setPosition({
        width,
        left: Math.max(
          margin,
          Math.min(anchor.right - width, viewportWidth - width - margin),
        ),
        top: upward
          ? anchor.top - gap - Math.min(desiredHeight, maxHeight)
          : anchor.bottom + gap,
        maxHeight,
      });
    }
    place();
    focusItem(requestedFocus.current);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    // 外部点击和焦点移动只关闭菜单，不抢回用户正在操作的控件。
    function outside(event: Event): void {
      const target = event.target;
      if (
        target instanceof Node &&
        !trigger.current?.contains(target) &&
        !panel.current?.contains(target)
      )
        close();
    }
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('focusin', outside, true);
    return () => {
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('focusin', outside, true);
    };
  }, [open]);
  useEffect(
    () => () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    },
    [],
  );

  /** 菜单项使用轮转焦点，原生 Enter/Space 负责选择，Tab 保持正常页面顺序。 */
  function navigate(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }
    if (event.key === 'Tab') {
      close(true);
      return;
    }
    const destinations: Record<string, number> = {
      ArrowDown: (activeIndex + 1) % options.length,
      ArrowUp: (activeIndex + options.length - 1) % options.length,
      Home: 0,
      End: options.length - 1,
    };
    const destination = Object.hasOwn(destinations, event.key)
      ? destinations[event.key]
      : undefined;
    if (destination !== undefined) {
      event.preventDefault();
      focusItem(destination);
      return;
    }
    if (
      event.key.length !== 1 ||
      event.key === ' ' ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.nativeEvent.isComposing
    )
      return;
    // 同时匹配原生名称和辅助名称，日语等非拉丁选项也能用英文快速定位。
    event.preventDefault();
    if (searchTimer.current) clearTimeout(searchTimer.current);
    search.current += event.key.toLocaleLowerCase();
    const find = (prefix: string) => {
      for (let offset = 1; offset <= options.length; offset++) {
        const index = (activeIndex + offset) % options.length;
        const option = options[index]!;
        if (
          [option.label, option.description ?? ''].some((name) =>
            name.toLocaleLowerCase().startsWith(prefix),
          )
        )
          return index;
      }
      return -1;
    };
    let match = find(search.current);
    if (match < 0) {
      search.current = event.key.toLocaleLowerCase();
      match = find(search.current);
    }
    if (match >= 0) focusItem(match);
    searchTimer.current = setTimeout(() => {
      search.current = '';
    }, 700);
  }

  if (!selected) return null;
  return (
    <div className="sp-language-menu" data-theme={theme}>
      <button
        ref={trigger}
        type="button"
        className="sp-language-menu__trigger"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        title={label}
        onClick={() => (open ? close() : show())}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            show(event.key === 'ArrowUp' ? options.length - 1 : selectedIndex);
          } else if (event.key === 'Escape' && open) {
            event.preventDefault();
            close(true);
          }
        }}
      >
        <svg
          className="sp-language-menu__globe"
          viewBox="0 0 24 24"
          fill="none"
          width="17"
          height="17"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c5 5 5 13 0 18M12 3c-5 5-5 13 0 18" />
        </svg>
        <span className="sp-language-menu__current">
          {compactLabel ?? selected.label}
        </span>
        <svg
          className="sp-language-menu__chevron"
          viewBox="0 0 16 16"
          fill="none"
          width="12"
          height="12"
          aria-hidden="true"
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </button>
      {open &&
        createPortal(
          <div
            ref={panel}
            id={panelId}
            className="sp-language-menu-panel"
            data-theme={theme}
            style={position}
            role="menu"
            aria-label={label}
            onKeyDown={navigate}
          >
            <div className="sp-language-menu__heading" aria-hidden="true">
              <span>{label}</span>
              <span className="sp-language-menu__count">{options.length}</span>
            </div>
            <div className="sp-language-menu__options">
              {options.map((option, index) => (
                <button
                  type="button"
                  key={option.value}
                  ref={(node) => {
                    items.current[index] = node;
                  }}
                  className="sp-language-menu__option"
                  role="menuitemradio"
                  aria-checked={value === option.value}
                  tabIndex={activeIndex === index ? 0 : -1}
                  lang={option.value}
                  onFocus={() => setActiveIndex(index)}
                  onClick={() => {
                    close(true);
                    onChange(option.value);
                  }}
                >
                  <span className="sp-language-menu__names">
                    <span className="sp-language-menu__native">{option.label}</span>
                    {option.description && option.description !== option.label && (
                      <span className="sp-language-menu__description" lang="en">
                        {option.description}
                      </span>
                    )}
                  </span>
                  {value === option.value && (
                    <svg
                      className="sp-language-menu__check"
                      viewBox="0 0 20 20"
                      width="18"
                      height="18"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path d="m4 10 4 4 8-8" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
