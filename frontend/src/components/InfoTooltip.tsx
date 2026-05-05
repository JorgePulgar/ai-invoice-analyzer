import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface InfoTooltipProps {
  text: string;
}

export function InfoTooltip({ text }: InfoTooltipProps) {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, above: false });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const visible = pinned || hovered;

  const measure = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipW = 224;
    const tooltipH = 120;
    let top = rect.bottom + 4;
    let above = false;
    if (top + tooltipH > window.innerHeight) {
      top = rect.top - tooltipH - 4;
      above = true;
    }
    const rawLeft = rect.right - tooltipW;
    const left = Math.max(8, rawLeft);
    setPos({ top, left, above });
  }, []);

  useEffect(() => {
    if (!visible) return;
    measure();
    let rafId: number;
    const schedMeasure = () => { rafId = requestAnimationFrame(measure); };
    window.addEventListener('scroll', schedMeasure, { passive: true, capture: true });
    window.addEventListener('resize', schedMeasure, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', schedMeasure, { capture: true });
      window.removeEventListener('resize', schedMeasure);
    };
  }, [visible, measure]);

  useEffect(() => {
    if (!pinned) return;
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popupRef.current?.contains(target)
      ) return;
      setPinned(false);
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [pinned]);

  return (
    <div className="relative flex-shrink-0" data-print-hide>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Más información"
        onClick={() => setPinned((p) => !p)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        className="w-4 h-4 rounded-full border border-bn-hairline bg-bn-elevated text-bn-muted hover:text-bn-body hover:border-bn-muted-strong text-[10px] font-bold leading-none flex items-center justify-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-bn-yellow"
      >
        i
      </button>
      {visible &&
        createPortal(
          <div
            ref={popupRef}
            role="tooltip"
            style={{ position: 'fixed', top: pos.top, left: pos.left, width: 224, zIndex: 9999 }}
            className="bg-bn-card border border-bn-hairline rounded-lg p-3 text-xs text-bn-body shadow-lg"
          >
            {text}
          </div>,
          document.body,
        )}
    </div>
  );
}
