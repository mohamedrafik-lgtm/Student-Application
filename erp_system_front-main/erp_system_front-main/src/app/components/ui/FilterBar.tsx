'use client';

import { ReactNode } from 'react';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { Button } from './Button';

interface FilterBarProps {
  children?: ReactNode;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onClearFilters?: () => void;
  showClearFilters?: boolean;
  className?: string;
  actions?: ReactNode;
}

export function FilterBar({
  children,
  searchPlaceholder = 'بحث...',
  searchValue = '',
  onSearchChange,
  onClearFilters,
  showClearFilters = false,
  className,
  actions
}: FilterBarProps) {
  return (
    <div className={cn("bg-white border border-tiba-gray-200 rounded-lg shadow-card p-4 mb-4", className)}>
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search Bar */}
        {onSearchChange && (
          <div className="relative flex-1">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <MagnifyingGlassIcon className="w-5 h-5 text-tiba-gray-400" />
            </div>
            <input
              type="search"
              className="block w-full p-2 pr-10 text-sm text-tiba-gray-800 border border-tiba-gray-200 rounded-lg bg-tiba-gray-50 focus:ring-tiba-primary-500 focus:border-tiba-primary-500 placeholder-tiba-gray-400"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}

        {/* Filter Controls */}
        <div className="flex flex-wrap gap-2 items-center">
          {children}
          
          {showClearFilters && onClearFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              leftIcon={<FunnelIcon className="w-4 h-4" />}
            >
              مسح التصفية
            </Button>
          )}
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-2 mr-auto">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

interface FilterSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'اختر...',
  className
}: FilterSelectProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {label && <label className="mb-1 text-xs font-medium text-tiba-gray-700">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm border border-tiba-gray-200 rounded-lg bg-tiba-gray-50 focus:ring-tiba-primary-500 focus:border-tiba-primary-500 py-2 px-3 pr-8 text-tiba-gray-800"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface FilterButtonGroupProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function FilterButtonGroup({
  options,
  value,
  onChange,
  className
}: FilterButtonGroupProps) {
  return (
    <div className={cn("flex rounded-md shadow-sm", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={cn(
            "px-3 py-2 text-sm font-medium border",
            option.value === value
              ? "bg-tiba-primary-50 border-tiba-primary-500 text-tiba-primary-700"
              : "bg-white border-tiba-gray-200 text-tiba-gray-700 hover:bg-tiba-gray-50",
            options[0].value === option.value && "rounded-r-md",
            options[options.length - 1].value === option.value && "rounded-l-md"
          )}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
} 