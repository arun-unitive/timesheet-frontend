import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Click-outside dropdown.
 * `trigger` receives { open, toggle } so any element can open it.
 */
export default function Dropdown({ trigger, children, align = 'right', menuWidth }) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const updateMenuPosition = useCallback(() => {
    const triggerRect = triggerRef.current?.getBoundingClientRect();
    const menu = menuRef.current;
    if (!triggerRect || !menu) return;

    const margin = 8;
    const gap = 6;
    const menuRect = menu.getBoundingClientRect();
    const width = Math.min(menuRect.width, window.innerWidth - margin * 2);
    const left = Math.max(
      margin,
      Math.min(
        align === 'left' ? triggerRect.left : triggerRect.right - width,
        window.innerWidth - width - margin
      )
    );
    const spaceBelow = window.innerHeight - triggerRect.bottom - gap - margin;
    const spaceAbove = triggerRect.top - gap - margin;
    const placeAbove = menuRect.height > spaceBelow && spaceAbove > spaceBelow;
    const availableHeight = Math.max(80, placeAbove ? spaceAbove : spaceBelow);
    const height = Math.min(menuRect.height, availableHeight);
    const top = placeAbove
      ? Math.max(margin, triggerRect.top - gap - height)
      : Math.min(triggerRect.bottom + gap, window.innerHeight - height - margin);

    setMenuPosition({ top, left, maxHeight: availableHeight });
  }, [align]);

  useLayoutEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return undefined;
    }

    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!triggerRef.current?.contains(e.target) && !menuRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="dropdown" ref={triggerRef}>
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open && (
        createPortal(
          <div
            ref={menuRef}
            className="dropdown__menu dropdown__menu--portal"
            style={{
              top: menuPosition?.top ?? -10000,
              left: menuPosition?.left ?? -10000,
              maxHeight: menuPosition?.maxHeight,
              ...(menuWidth ? { minWidth: menuWidth } : {}),
            }}
            onClick={() => setOpen(false)}
          >
            {children}
          </div>,
          document.body
        )
      )}
    </div>
  );
}
