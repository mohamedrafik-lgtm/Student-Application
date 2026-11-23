'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckIcon, ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

export interface TibaInlineSelectOption {
  value: string;
  label: string;
}

export interface TibaInlineSelectProps {
  options: TibaInlineSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/**
 * قائمة منسدلة داخلية (بدون Portal) — مصممة للاستخدام داخل المودالات.
 *
 * السبب: المودال يغلق عند النقر خارج محتواه، وأحداث React تعبر من الـ Portal
 * إلى شجرة المكوّنات، فيؤدي النقر على عنصر داخل قائمة مرسومة في body
 * إلى إغلاق المودال. بعرض القائمة داخل شجرة المودال نفسها نمنع ذلك.
 */
export function TibaInlineSelect({
  options,
  value,
  onChange,
  placeholder = 'اختر...',
  searchPlaceholder = 'ابحث...',
  emptyText = 'لا توجد نتائج',
  disabled = false,
  className,
  id,
}: TibaInlineSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [dropUp, setDropUp] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => options.find((option) => option.value === value) || null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) => option.label.toLowerCase().includes(term));
  }, [options, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

  const openMenu = useCallback(() => {
    if (disabled) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const estimatedHeight = 280;
      setDropUp(window.innerHeight - rect.bottom < estimatedHeight && rect.top > estimatedHeight);
    }
    setOpen(true);
    setQuery('');
    const selectedIndex = options.findIndex((option) => option.value === value);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [disabled, options, value]);

  // إغلاق عند النقر خارج القائمة فقط
  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (wrapperRef.current && target && !wrapperRef.current.contains(target)) {
        close();
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [open, close]);

  // تركيز حقل البحث عند الفتح
  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  // تمرير الخيار النشط إلى مجال الرؤية
  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    node?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  const selectOption = useCallback(
    (option: TibaInlineSelectOption) => {
      onChange(option.value);
      close();
      triggerRef.current?.focus();
    },
    [onChange, close],
  );

  const handleTriggerKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault();
      if (open) close();
      else openMenu();
    }
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
      triggerRef.current?.focus();
      return;
    }
    if (event.key === 'Tab') {
      close();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (filtered.length ? (index + 1) % filtered.length : 0));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (filtered.length ? (index - 1 + filtered.length) % filtered.length : 0));
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(Math.max(filtered.length - 1, 0));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const option = filtered[activeIndex];
      if (option) selectOption(option);
    }
  };

  return (
    <div ref={wrapperRef} className={cn('relative w-full', className)} dir="rtl">
      <div
        ref={triggerRef}
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          'flex h-12 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border bg-white px-3 text-sm transition-colors',
          'border-slate-300 text-slate-700 hover:border-blue-400',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600',
          open && 'border-blue-600 ring-2 ring-blue-500/20',
          disabled && 'cursor-not-allowed bg-slate-50 text-slate-400 hover:border-slate-300',
        )}
      >
        <span className={cn('truncate', !selected && 'text-slate-400')}>
          {selected ? selected.label : placeholder}
        </span>

        <span className="flex shrink-0 items-center gap-1">
          {value !== '' && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              aria-label="مسح الاختيار"
              onClick={(event) => {
                event.stopPropagation();
                onChange('');
                close();
              }}
              className="rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
          <ChevronDownIcon
            className={cn('h-4 w-4 text-slate-400 transition-transform', open && 'rotate-180')}
          />
        </span>
      </div>

      {open && (
        <div
          className={cn(
            'absolute z-[70] w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl',
            dropUp ? 'bottom-full mb-1' : 'top-full mt-1',
          )}
        >
          <div className="border-b border-slate-100 p-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder={searchPlaceholder}
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div ref={listRef} role="listbox" className="max-h-56 overflow-y-auto overscroll-contain py-1">
            {filtered.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-slate-400">{emptyText}</p>
            )}

            {filtered.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = index === activeIndex;

              return (
                <div
                  key={`${option.value}-${option.label}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectOption(option)}
                  className={cn(
                    'mx-1 flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors',
                    isSelected ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-700',
                    isActive && !isSelected && 'bg-slate-100',
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && <CheckIcon className="h-4 w-4 shrink-0 text-blue-600" />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default TibaInlineSelect;
