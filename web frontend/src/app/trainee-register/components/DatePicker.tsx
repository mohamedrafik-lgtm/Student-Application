'use client';

import { useState, useEffect } from 'react';
import { ChevronDownIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';

interface DatePickerProps {
  value: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export default function DatePicker({ value, onChange, placeholder = "اختر تاريخ الميلاد", required = false, className = "" }: DatePickerProps) {
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  // Arabic month names
  const arabicMonths = [
    { value: '01', label: 'يناير' },
    { value: '02', label: 'فبراير' },
    { value: '03', label: 'مارس' },
    { value: '04', label: 'أبريل' },
    { value: '05', label: 'مايو' },
    { value: '06', label: 'يونيو' },
    { value: '07', label: 'يوليو' },
    { value: '08', label: 'أغسطس' },
    { value: '09', label: 'سبتمبر' },
    { value: '10', label: 'أكتوبر' },
    { value: '11', label: 'نوفمبر' },
    { value: '12', label: 'ديسمبر' }
  ];

  // Generate years (from 1950 to current year - 16)
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear - 16; i >= 1950; i--) {
    years.push(i);
  }

  // Generate days based on selected month and year
  const getDaysInMonth = (month: string, year: string) => {
    if (!month || !year) return 31;
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    return daysInMonth;
  };

  const days = [];
  const maxDays = getDaysInMonth(month, year);
  for (let i = 1; i <= maxDays; i++) {
    days.push(i.toString().padStart(2, '0'));
  }

  // Parse initial value
  useEffect(() => {
    if (value) {
      const [yearVal, monthVal, dayVal] = value.split('-');
      setYear(yearVal);
      setMonth(monthVal);
      setDay(dayVal);
    }
  }, [value]);

  // Update parent when any field changes
  useEffect(() => {
    if (day && month && year) {
      onChange(`${year}-${month}-${day}`);
    } else {
      onChange('');
    }
  }, [day, month, year]); // إزالة onChange من dependencies

  // Validate day when month or year changes
  useEffect(() => {
    if (day && month && year) {
      const maxDays = getDaysInMonth(month, year);
      if (parseInt(day) > maxDays) {
        setDay(maxDays.toString().padStart(2, '0'));
      }
    }
  }, [month, year, day]);

  return (
    <div className={className}>
      <div className="grid grid-cols-3 gap-3">
        {/* Day Selector */}
        <div className="relative">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            اليوم
          </label>
          <div className="relative">
            <select
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className={`w-full appearance-none bg-white border rounded-lg px-4 py-3 pr-10 text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 hover:border-emerald-300 ${
                day ? 'border-emerald-300 bg-emerald-50' : 'border-gray-300'
              }`}
              required={required}
            >
              <option value="">يوم</option>
              {days.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <ChevronDownIcon className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors duration-200 ${
              day ? 'text-emerald-500' : 'text-gray-400'
            }`} />
          </div>
        </div>

        {/* Month Selector */}
        <div className="relative">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            الشهر
          </label>
          <div className="relative">
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className={`w-full appearance-none bg-white border rounded-lg px-4 py-3 pr-10 text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 hover:border-emerald-300 ${
                month ? 'border-emerald-300 bg-emerald-50' : 'border-gray-300'
              }`}
              required={required}
            >
              <option value="">شهر</option>
              {arabicMonths.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <ChevronDownIcon className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors duration-200 ${
              month ? 'text-emerald-500' : 'text-gray-400'
            }`} />
          </div>
        </div>

        {/* Year Selector */}
        <div className="relative">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            السنة
          </label>
          <div className="relative">
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className={`w-full appearance-none bg-white border rounded-lg px-4 py-3 pr-10 text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 hover:border-emerald-300 ${
                year ? 'border-emerald-300 bg-emerald-50' : 'border-gray-300'
              }`}
              required={required}
            >
              <option value="">سنة</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <ChevronDownIcon className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors duration-200 ${
              year ? 'text-emerald-500' : 'text-gray-400'
            }`} />
          </div>
        </div>
      </div>

      {/* Display Selected Date */}
      {day && month && year && (
        <div className="mt-3 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg shadow-sm">
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="w-4 h-4 text-emerald-600" />
            <span className="text-sm text-emerald-800 font-medium">
              التاريخ المحدد: {day} {arabicMonths.find(m => m.value === month)?.label} {year}
            </span>
          </div>
          <div className="mt-1 text-xs text-emerald-700">
            العمر التقريبي: {currentYear - parseInt(year)} سنة
          </div>
        </div>
      )}

      {/* Progress Indicator */}
      {(day || month || year) && !(day && month && year) && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className={`w-2 h-2 rounded-full ${day ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
              <div className={`w-2 h-2 rounded-full ${month ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
              <div className={`w-2 h-2 rounded-full ${year ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
            </div>
            <span className="text-xs text-yellow-700">
              يرجى إكمال اختيار التاريخ
            </span>
          </div>
        </div>
      )}

      {/* Validation Message */}
      {required && (!day || !month || !year) && !(day || month || year) && (
        <p className="text-xs text-gray-500 mt-2">
          يرجى اختيار تاريخ الميلاد كاملاً (اليوم والشهر والسنة)
        </p>
      )}
    </div>
  );
}
