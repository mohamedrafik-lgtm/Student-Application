'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, ChevronUpDownIcon, CheckIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface PaginationProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  className?: string;
  showLimitSelector?: boolean;
  limitOptions?: number[];
  isLoading?: boolean;
}

/* ─── قائمة عدد العناصر المخصصة ─── */
function LimitDropdown({
  value,
  options,
  onChange,
  disabled,
}: {
  value: number;
  options: number[];
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open, close]);

  // إغلاق بالـ Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, close]);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-[9998] md:hidden"
          onClick={close}
        />
      )}

      <div ref={ref} className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((p) => !p)}
          className={cn(
            "inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-sm font-medium transition-all duration-150",
            "border border-slate-200 bg-white cursor-pointer",
            "hover:border-tiba-primary-300 hover:bg-tiba-primary-50/40",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-tiba-primary-500 focus-visible:ring-offset-1",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            open && "border-tiba-primary-400 bg-tiba-primary-50/50 ring-1 ring-tiba-primary-200"
          )}
        >
          <span className="text-slate-500 text-xs">عرض</span>
          <span className="text-slate-800 font-semibold">{value}</span>
          <ChevronUpDownIcon className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {/* Desktop dropdown */}
        {open && (
          <div className="hidden md:block absolute bottom-full mb-1.5 start-0 z-[9999] min-w-[120px] bg-white rounded-xl border border-slate-200 shadow-xl shadow-slate-200/50 py-1 animate-in fade-in slide-in-from-bottom-2 duration-150">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  close();
                }}
                className={cn(
                  "w-full flex items-center justify-between gap-3 px-3 py-2 text-sm transition-colors",
                  opt === value
                    ? "text-tiba-primary-700 bg-tiba-primary-50 font-semibold"
                    : "text-slate-700 hover:bg-slate-50"
                )}
              >
                <span>{opt} عنصر</span>
                {opt === value && <CheckIcon className="w-4 h-4 text-tiba-primary-600" />}
              </button>
            ))}
          </div>
        )}

        {/* Mobile bottom sheet */}
        {open && (
          <div className="md:hidden fixed inset-x-0 bottom-0 z-[9999] bg-white rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-300" />
            </div>
            <div className="px-4 pb-2 pt-1">
              <h3 className="text-sm font-bold text-slate-800">عدد العناصر في الصفحة</h3>
            </div>
            <div className="px-2 pb-6 space-y-0.5">
              {options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    close();
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-colors",
                    opt === value
                      ? "text-tiba-primary-700 bg-tiba-primary-50 font-bold"
                      : "text-slate-700 hover:bg-slate-50 active:bg-slate-100"
                  )}
                >
                  <span>{opt} عنصر</span>
                  {opt === value && <CheckIcon className="w-5 h-5 text-tiba-primary-600" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ─── المكوّن الرئيسي ─── */
export function Pagination({
  pagination,
  onPageChange,
  onLimitChange,
  className,
  showLimitSelector = true,
  limitOptions = [10, 20, 50, 100],
  isLoading = false,
}: PaginationProps) {
  const { page, limit, total, totalPages, hasNext, hasPrev } = pagination;

  const getPageNumbers = (): (number | '...')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | '...')[] = [1];

    if (page > 3) pages.push('...');

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (page < totalPages - 2) pages.push('...');
    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  const pageNumbers = totalPages > 1 ? getPageNumbers() : [];
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  if (total === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:gap-0 sm:flex-row sm:items-center sm:justify-between",
        "rounded-xl bg-white border border-slate-100 px-4 py-3",
        className,
      )}
    >
      {/* ── الجهة اليمنى: المعلومات + عدد العناصر ── */}
      <div className="flex items-center gap-3 justify-center sm:justify-start flex-wrap">
        <p className="text-[13px] text-slate-500 leading-none">
          <span className="font-bold text-slate-800">{startItem}</span>
          <span className="mx-0.5">–</span>
          <span className="font-bold text-slate-800">{endItem}</span>
          <span className="mx-1">من</span>
          <span className="font-bold text-tiba-primary-700">{total}</span>
        </p>

        {showLimitSelector && onLimitChange && (
          <>
            <span className="hidden sm:block w-px h-4 bg-slate-200" />
            <LimitDropdown
              value={limit}
              options={limitOptions}
              onChange={onLimitChange}
              disabled={isLoading}
            />
          </>
        )}
      </div>

      {/* ── الجهة اليسرى: أزرار التنقل ── */}
      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-0.5" aria-label="التنقل بين الصفحات">
          {/* السابق */}
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={!hasPrev || isLoading}
            className={cn(
              "inline-flex items-center gap-1 h-9 px-2.5 rounded-lg text-[13px] font-medium transition-all duration-150",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-tiba-primary-500 focus-visible:ring-offset-1",
              !hasPrev || isLoading
                ? "text-slate-300 cursor-not-allowed"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 active:bg-slate-200/70",
            )}
            aria-label="الصفحة السابقة"
          >
            <ChevronRightIcon className="w-4 h-4" />
            <span className="hidden sm:inline">السابق</span>
          </button>

          <span className="w-px h-5 bg-slate-200 mx-1 hidden sm:block" />

          {/* أرقام الصفحات */}
          <div className="flex items-center gap-0.5">
            {pageNumbers.map((p, i) =>
              p === '...' ? (
                <span key={i} className="inline-flex items-center justify-center w-7 h-9 text-xs text-slate-400 select-none">
                  …
                </span>
              ) : (
                <button
                  key={i}
                  onClick={() => onPageChange(p)}
                  disabled={isLoading}
                  className={cn(
                    "inline-flex items-center justify-center h-9 min-w-[2.25rem] px-2 rounded-lg text-[13px] font-semibold transition-all duration-150",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-tiba-primary-500 focus-visible:ring-offset-1",
                    "disabled:cursor-not-allowed",
                    p === page
                      ? "bg-tiba-primary-600 text-white shadow-sm shadow-tiba-primary-600/25"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200/70 disabled:opacity-40",
                  )}
                >
                  {p}
                </button>
              ),
            )}
          </div>

          <span className="w-px h-5 bg-slate-200 mx-1 hidden sm:block" />

          {/* التالي */}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNext || isLoading}
            className={cn(
              "inline-flex items-center gap-1 h-9 px-2.5 rounded-lg text-[13px] font-medium transition-all duration-150",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-tiba-primary-500 focus-visible:ring-offset-1",
              !hasNext || isLoading
                ? "text-slate-300 cursor-not-allowed"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 active:bg-slate-200/70",
            )}
            aria-label="الصفحة التالية"
          >
            <span className="hidden sm:inline">التالي</span>
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
        </nav>
      )}
    </div>
  );
}

export default Pagination;
