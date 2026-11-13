import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, SlidersHorizontal } from 'lucide-react';

type Option = { value: string; label: string };

type Props = {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  label: string;
};

export function GlassSortMenu({ value, options, onChange, label }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!current) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((state) => !state)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        className={`glass-control flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm font-medium text-ink-soft transition duration-300 hover:text-brand ${
          open ? 'text-brand ring-2 ring-brand/30' : ''
        }`}
      >
        <SlidersHorizontal className="size-4 text-brand" />
        <span className="whitespace-nowrap">{current.label}</span>
        <ChevronDown
          className={`size-4 text-muted transition duration-300 ${open ? 'rotate-180 text-brand' : ''}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={label}
          className="glass absolute end-0 top-[calc(100%+10px)] z-40 w-60 rounded-2xl p-1.5"
          style={{ animation: 'pop-in 0.2s cubic-bezier(0.22, 1, 0.36, 1)' }}
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm transition duration-200 ${
                  active
                    ? 'glass-selected font-semibold text-brand'
                    : 'text-ink-soft hover:bg-white/45 hover:text-brand'
                }`}
              >
                <span>{option.label}</span>
                {active && <Check className="size-4" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
