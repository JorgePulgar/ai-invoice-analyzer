import { useState, useEffect, useRef } from 'react';

interface InfoTooltipProps {
  text: string;
}

export function InfoTooltip({ text }: InfoTooltipProps) {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pinned) return;
    function handleMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setPinned(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [pinned]);

  const visible = pinned || hovered;

  return (
    <div
      ref={ref}
      className="relative flex-shrink-0"
      data-print-hide
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        aria-label="Más información"
        onClick={() => setPinned((p) => !p)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        className="w-4 h-4 rounded-full border border-bn-hairline bg-bn-elevated text-bn-muted hover:text-bn-body hover:border-bn-muted-strong text-[10px] font-bold leading-none flex items-center justify-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-bn-yellow"
      >
        i
      </button>
      {visible && (
        <div
          role="tooltip"
          className="absolute top-full right-0 mt-1 w-56 bg-bn-card border border-bn-hairline rounded-lg p-3 text-xs text-bn-body shadow-lg z-20"
        >
          {text}
        </div>
      )}
    </div>
  );
}
