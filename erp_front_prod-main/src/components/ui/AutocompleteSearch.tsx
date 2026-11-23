'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

export interface AutocompleteOption {
  id: string | number;
  label: string;
  subtitle?: string;
  imageUrl?: string;
  data?: any;
}

interface AutocompleteSearchProps {
  placeholder?: string;
  onSearch: (query: string) => Promise<AutocompleteOption[]>;
  onSelect: (option: AutocompleteOption) => void;
  onClear?: () => void;
  value?: AutocompleteOption | null;
  className?: string;
  disabled?: boolean;
  minSearchLength?: number;
  debounceMs?: number;
  maxResults?: number;
  emptyMessage?: string;
  loadingMessage?: string;
}

export function AutocompleteSearch({
  placeholder = 'ابحث...',
  onSearch,
  onSelect,
  onClear,
  value,
  className,
  disabled = false,
  minSearchLength = 2,
  debounceMs = 300,
  maxResults = 10,
  emptyMessage = 'لا توجد نتائج',
  loadingMessage = 'جاري البحث...'
}: AutocompleteSearchProps) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<AutocompleteOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // تنظيف debounce عند إلغاء المكون
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // تحديث النص عند تغيير القيمة المحددة
  useEffect(() => {
    if (value) {
      setQuery(value.label);
    } else if (query && !isOpen) {
      setQuery('');
    }
  }, [value]);

  const performSearch = async (searchQuery: string) => {
    if (searchQuery.length < minSearchLength) {
      setOptions([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const results = await onSearch(searchQuery);
      setOptions(results.slice(0, maxResults));
    } catch (error) {
      console.error('Search error:', error);
      setOptions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setSelectedIndex(-1);

    // إلغاء البحث السابق
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // إذا كان النص فارغاً
    if (!newQuery) {
      setOptions([]);
      setIsOpen(false);
      setIsLoading(false);
      if (onClear) {
        onClear();
      }
      return;
    }

    // فتح القائمة والبحث مع التأخير
    setIsOpen(true);
    debounceRef.current = setTimeout(() => {
      performSearch(newQuery);
    }, debounceMs);
  };

  const handleOptionSelect = (option: AutocompleteOption) => {
    setQuery(option.label);
    setIsOpen(false);
    setOptions([]);
    setSelectedIndex(-1);
    onSelect(option);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || options.length === 0) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
        if (query.length >= minSearchLength) {
          performSearch(query);
        }
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < options.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : options.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < options.length) {
          handleOptionSelect(options[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleClear = () => {
    setQuery('');
    setOptions([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    if (onClear) {
      onClear();
    }
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md bg-white",
            "text-gray-900 placeholder:text-gray-500",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "text-right" // RTL support
          )}
        />
        
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* قائمة النتائج */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-auto">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                {loadingMessage}
              </div>
            </div>
          ) : options.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              {query.length < minSearchLength 
                ? `أدخل ${minSearchLength} أحرف على الأقل للبحث`
                : emptyMessage
              }
            </div>
          ) : (
            <ul ref={listRef} className="py-1">
              {options.map((option, index) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => handleOptionSelect(option)}
                    className={cn(
                      "w-full px-4 py-3 text-right hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 focus:bg-blue-50 focus:outline-none transition-all duration-200",
                      "border-l-4 border-transparent hover:border-blue-400",
                      selectedIndex === index && "bg-blue-50 text-blue-700 border-blue-500"
                    )}
                    title="انقر للانتقال لصفحة الدفع"
                  >
                    <div className="flex items-center gap-3">
                      {/* صورة المتدرب */}
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 border-2 border-gray-300">
                          {option.imageUrl ? (
                            <img
                              src={option.imageUrl}
                              alt={option.label}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = `
                                    <div class="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center">
                                      <span class="text-blue-600 font-bold text-sm">
                                        ${option.label.charAt(0)}
                                      </span>
                                    </div>
                                  `;
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center">
                              <span className="text-blue-600 font-bold text-sm">
                                {option.label.charAt(0)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* معلومات المتدرب */}
                      <div className="flex-1 min-w-0 text-right">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {option.label}
                        </div>
                        {option.subtitle && (
                          <div className="text-xs text-gray-500 truncate">
                            {option.subtitle}
                          </div>
                        )}
                      </div>
                      
                      {/* مؤشر الانتقال */}
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default AutocompleteSearch;
