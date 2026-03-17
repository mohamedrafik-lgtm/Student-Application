'use client';

import { useState, useRef, useEffect } from 'react';
import { DocumentTextIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface ExpandableDescriptionProps {
  text: string;
  /** Max characters before showing expand button */
  maxChars?: number;
  /** Variant: 'table' for desktop tables, 'card' for mobile cards */
  variant?: 'table' | 'card';
  className?: string;
}

export function ExpandableDescription({
  text,
  maxChars = 45,
  variant = 'table',
  className = '',
}: ExpandableDescriptionProps) {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isLong = text && text.length > maxChars;

  // Close on click outside
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [expanded]);

  if (!text) return null;

  const baseTextClass = variant === 'table'
    ? 'text-xs text-slate-600'
    : 'text-[11px] text-slate-500';

  // Short description — just show it
  if (!isLong) {
    return (
      <span className={`${baseTextClass} ${className}`}>
        {text}
      </span>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {!expanded ? (
        <div className="flex items-center gap-1.5 group">
          <span className={`${baseTextClass} line-clamp-1 flex-1`}>
            {text}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
            className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-500 hover:text-blue-700 transition-colors whitespace-nowrap"
          >
            المزيد
            <ChevronDownIcon className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div
          className={`
            ${variant === 'table' ? 'absolute top-0 right-0 z-50 min-w-[280px] max-w-[400px]' : 'relative'}
            bg-white rounded-xl shadow-xl border border-slate-200/80 
            ring-1 ring-black/5 overflow-hidden
            animate-in fade-in slide-in-from-top-1 duration-200
          `}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-l from-blue-50 to-slate-50 border-b border-slate-100">
            <DocumentTextIcon className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[10px] font-bold text-slate-500">الوصف الكامل</span>
          </div>
          {/* Body */}
          <div className="px-3 py-2.5">
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
              {text}
            </p>
          </div>
          {/* Footer */}
          <div className="px-3 py-1.5 bg-slate-50/80 border-t border-slate-100 flex justify-end">
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
              className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-500 hover:text-blue-700 transition-colors"
            >
              عرض أقل
              <ChevronUpIcon className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
