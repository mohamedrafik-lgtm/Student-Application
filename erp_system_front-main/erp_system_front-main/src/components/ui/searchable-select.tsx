'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/app/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = 'اختر...',
  searchPlaceholder = 'ابحث...',
  emptyMessage = 'لا توجد نتائج',
  disabled = false,
  className,
  buttonClassName,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const selectedOption = options.find((option) => option.value === value);

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options;
    
    const query = searchQuery.toLowerCase();
    return options.filter((option) =>
      option.label.toLowerCase().includes(query) ||
      option.value.toLowerCase().includes(query)
    );
  }, [options, searchQuery]);

  const handleSelect = (optionValue: string) => {
    onValueChange(optionValue);
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between text-gray-900 font-medium',
            !value && 'text-gray-500',
            buttonClassName
          )}
        >
          <span className="truncate text-gray-900">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn('p-0', className)} align="start" sideOffset={4}>
        <div className="bg-white rounded-md border border-gray-200 shadow-lg">
          {/* Search Input */}
          <div className="flex items-center border-b border-gray-200 px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 text-gray-400" />
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 border-0 p-0 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          
          {/* Options List */}
          <div className="max-h-[300px] overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-500">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    'relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm text-gray-900 outline-none transition-colors hover:bg-gray-100 focus:bg-gray-100',
                    value === option.value && 'bg-gray-50'
                  )}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 text-green-600',
                      value === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="text-gray-900">{option.label}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
