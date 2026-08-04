import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  term: string;
  definition: string;
  children?: React.ReactNode;
  position?: 'top' | 'bottom';
}

const TOOLTIP_WIDTH = 208; // w-52 = 13rem
const EDGE_PADDING = 10;
const GAP = 8;

export const Tooltip: React.FC<TooltipProps> = ({ term, definition, children, position = 'top' }) => {
  const [visible, setVisible] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!visible) return;
    const hide = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setVisible(false);
    };
    document.addEventListener('mousedown', hide);
    return () => document.removeEventListener('mousedown', hide);
  }, [visible]);

  const computeAndShow = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();

      // Clamp left so tooltip stays within the viewport (popup is 380px wide)
      let left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
      left = Math.max(EDGE_PADDING, Math.min(left, window.innerWidth - TOOLTIP_WIDTH - EDGE_PADDING));

      // For 'top': anchor to rect.top and shift upward via transform.
      // For 'bottom': anchor to rect.bottom with a small gap.
      const computed: React.CSSProperties =
        position === 'top'
          ? { top: rect.top - GAP, transform: 'translateY(-100%)', left }
          : { top: rect.bottom + GAP, left };

      setStyle(computed);
    }
    setVisible(true);
  };

  return (
    <span ref={ref} className="relative inline-flex items-center gap-0.5">
      <span className="inline-flex items-center gap-0.5">
        {children || term}
        <button
          type="button"
          onClick={() => (visible ? setVisible(false) : computeAndShow())}
          onMouseEnter={computeAndShow}
          onMouseLeave={() => setVisible(false)}
          className="text-slate-400 hover:text-blue-500 transition-colors focus:outline-none"
          aria-label={`Learn about ${term}`}
        >
          <HelpCircle size={12} />
        </button>
      </span>

      {visible &&
        ReactDOM.createPortal(
          <span
            className="fixed z-[9999] w-52 bg-slate-800 text-white text-xs rounded-lg p-2.5 shadow-xl pointer-events-none"
            style={style}
          >
            <strong className="block text-blue-300 mb-1">{term}</strong>
            {definition}
          </span>,
          document.body
        )}
    </span>
  );
};
