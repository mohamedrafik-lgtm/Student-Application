"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { ChevronLeftIcon, ChevronRightIcon, CalendarDaysIcon, XMarkIcon } from "@heroicons/react/24/outline"
import { cn } from "@/lib/utils"

// ============================================
// Tiba Design System — Date Picker
// ============================================

const AR_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
]
const AR_DAYS_SHORT = ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function formatArabicDate(date: Date) {
  return `${date.getDate()} ${AR_MONTHS[date.getMonth()]} ${date.getFullYear()}`
}
function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

export interface TibaDatePickerProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  required?: boolean
  error?: string
  label?: string
  minDate?: Date
  maxDate?: Date
  clearable?: boolean
  size?: "sm" | "md" | "lg"
}

export default function TibaDatePicker({
  value,
  onChange,
  placeholder = "اختر التاريخ",
  className,
  disabled = false,
  required = false,
  error,
  label,
  minDate,
  maxDate,
  clearable = true,
  size = "md",
}: TibaDatePickerProps) {
  const today = new Date()
  const selectedDate = value ? new Date(value + "T00:00:00") : null

  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(selectedDate?.getFullYear() ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(selectedDate?.getMonth() ?? today.getMonth())
  const [mode, setMode] = useState<"calendar" | "months" | "years">("calendar")

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setMode("calendar")
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
    return undefined
  }, [open])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false)
        setMode("calendar")
      }
    }
    if (open) {
      document.addEventListener("keydown", handleKeyDown)
      return () => document.removeEventListener("keydown", handleKeyDown)
    }
    return undefined
  }, [open])

  // Lock body scroll on mobile when open
  useEffect(() => {
    if (open && window.innerWidth < 640) {
      document.body.style.overflow = "hidden"
      return () => { document.body.style.overflow = "" }
    }
    return undefined
  }, [open])

  const handleDayClick = useCallback(
    (day: number) => {
      const d = new Date(viewYear, viewMonth, day)
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      onChange(iso)
      setOpen(false)
      setMode("calendar")
    },
    [viewYear, viewMonth, onChange],
  )

  const goToPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1) } 
    else setViewMonth(viewMonth - 1)
  }
  const goToNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1) } 
    else setViewMonth(viewMonth + 1)
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)
  const prevMonthDays = getDaysInMonth(viewYear, viewMonth - 1)

  const calendarDays: { day: number; inMonth: boolean; disabled: boolean }[] = []
  for (let i = firstDay - 1; i >= 0; i--) {
    calendarDays.push({ day: prevMonthDays - i, inMonth: false, disabled: true })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(viewYear, viewMonth, d)
    let isDisabled = false
    if (minDate && date < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) isDisabled = true
    if (maxDate && date > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())) isDisabled = true
    calendarDays.push({ day: d, inMonth: true, disabled: isDisabled })
  }
  const remaining = 42 - calendarDays.length
  for (let d = 1; d <= remaining; d++) {
    calendarDays.push({ day: d, inMonth: false, disabled: true })
  }

  const yearRangeStart = Math.floor(viewYear / 12) * 12
  const years = range(yearRangeStart, yearRangeStart + 11)

  const sizeStyles = {
    sm: "h-9 px-3 text-sm",
    md: "h-11 px-4 text-sm",
    lg: "h-12 px-4 text-base",
  }

  return (
    <div className={cn("relative", className)}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          {label}
          {required && <span className="text-tiba-danger-500 mr-1">*</span>}
        </label>
      )}

      {/* Trigger */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen(!open)
            if (!open && selectedDate) {
              setViewYear(selectedDate.getFullYear())
              setViewMonth(selectedDate.getMonth())
            }
          }
        }}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault()
            setOpen(!open)
            if (!open && selectedDate) {
              setViewYear(selectedDate.getFullYear())
              setViewMonth(selectedDate.getMonth())
            }
          }
        }}
        className={cn(
          "w-full bg-white border-2 rounded-xl font-medium flex items-center gap-3 transition-all duration-200",
          "focus:outline-none",
          sizeStyles[size],
          error
            ? "border-tiba-danger-300 focus:border-tiba-danger-500 focus:ring-4 focus:ring-tiba-danger-500/10"
            : open
              ? "border-tiba-primary-400 ring-4 ring-tiba-primary-500/10"
              : "border-slate-200 hover:border-slate-300 focus:border-tiba-primary-400 focus:ring-4 focus:ring-tiba-primary-500/10",
          selectedDate ? "text-slate-900" : "text-slate-400",
          disabled ? "opacity-50 cursor-not-allowed bg-slate-50" : "cursor-pointer",
        )}
      >
        <CalendarDaysIcon className={cn(
          "w-5 h-5 flex-shrink-0 transition-colors",
          open ? "text-tiba-primary-500" : "text-slate-400",
        )} />
        <span className="flex-1 text-right truncate">
          {selectedDate ? formatArabicDate(selectedDate) : placeholder}
        </span>
        {clearable && selectedDate && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onChange("")
            }}
            className="p-0.5 hover:bg-slate-100 rounded-md transition-colors"
          >
            <XMarkIcon className="w-4 h-4 text-slate-400 hover:text-slate-600" />
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="mt-1.5 text-sm text-tiba-danger-600 flex items-center gap-1">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}

      {/* Dropdown Calendar */}
      {open && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] sm:hidden"
            onClick={() => { setOpen(false); setMode("calendar") }}
          />

          <div
            className={cn(
              // Mobile: full-screen bottom sheet
              "fixed inset-x-0 bottom-0 z-[61] sm:z-50 bg-white rounded-t-3xl shadow-2xl",
              "max-h-[90dvh] overflow-y-auto",
              // Desktop: dropdown positioned
              "sm:absolute sm:inset-auto sm:mt-2 sm:right-0 sm:rounded-2xl sm:border-2 sm:border-slate-200",
              "sm:w-[340px] sm:max-h-none sm:bottom-auto",
              "animate-in sm:fade-in-0 sm:zoom-in-95 sm:slide-in-from-top-2 slide-in-from-bottom-4 duration-200",
            )}
          >
            {/* Mobile handle bar */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-slate-300" />
            </div>

            {/* Calendar Header */}
            <div className="flex items-center justify-between p-3 sm:p-3 border-b border-slate-100 bg-slate-50/50 sm:rounded-t-2xl">
              <button
                type="button"
                onClick={() => {
                  if (mode === "calendar") goToNextMonth()
                  else if (mode === "years") setViewYear(yearRangeStart - 12 + Math.floor(years.length / 2))
                }}
                className="h-10 w-10 sm:h-9 sm:w-9 rounded-xl border border-slate-200 bg-white hover:bg-tiba-primary-50 hover:border-tiba-primary-200 flex items-center justify-center text-slate-600 hover:text-tiba-primary-600 transition-all"
              >
                <ChevronRightIcon className="w-5 h-5 sm:w-4 sm:h-4" />
              </button>

              <div className="flex items-center gap-1">
                {/* Month button */}
                <button
                  type="button"
                  onClick={() => {
                    if (mode === "calendar") setMode("months")
                    else setMode("calendar")
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-sm sm:text-sm font-bold transition-all",
                    mode === "months"
                      ? "bg-tiba-primary-100 text-tiba-primary-700"
                      : "hover:bg-tiba-primary-50 text-slate-800 hover:text-tiba-primary-700",
                  )}
                >
                  {mode === "years"
                    ? `${years[0]} - ${years[years.length - 1]}`
                    : mode === "months"
                      ? `الأشهر`
                      : AR_MONTHS[viewMonth]}
                </button>
                {/* Year button — direct access */}
                {mode !== "years" && (
                  <button
                    type="button"
                    onClick={() => setMode("years")}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-sm sm:text-sm font-bold transition-all",
                      mode === "years"
                        ? "bg-tiba-primary-100 text-tiba-primary-700"
                        : "hover:bg-tiba-primary-50 text-tiba-primary-600 hover:text-tiba-primary-700",
                    )}
                  >
                    {viewYear}
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (mode === "calendar") goToPrevMonth()
                  else if (mode === "years") setViewYear(yearRangeStart + 12 + Math.floor(years.length / 2))
                }}
                className="h-10 w-10 sm:h-9 sm:w-9 rounded-xl border border-slate-200 bg-white hover:bg-tiba-primary-50 hover:border-tiba-primary-200 flex items-center justify-center text-slate-600 hover:text-tiba-primary-600 transition-all"
              >
                <ChevronLeftIcon className="w-5 h-5 sm:w-4 sm:h-4" />
              </button>
            </div>

            <div className="p-3 sm:p-3">
              {/* Calendar Mode */}
              {mode === "calendar" && (
                <>
                  <div className="grid grid-cols-7 mb-2">
                    {AR_DAYS_SHORT.map((day) => (
                      <div key={day} className="text-center text-xs sm:text-xs font-bold text-slate-400 py-2 sm:py-1.5 uppercase">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-0.5">
                    {calendarDays.map((item, idx) => {
                      const isToday = item.inMonth && isSameDay(new Date(viewYear, viewMonth, item.day), today)
                      const isSelected = item.inMonth && selectedDate && isSameDay(new Date(viewYear, viewMonth, item.day), selectedDate)

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={item.disabled || !item.inMonth}
                          onClick={() => item.inMonth && !item.disabled && handleDayClick(item.day)}
                          className={cn(
                            "h-12 sm:h-10 w-full rounded-xl text-sm font-medium transition-all duration-150",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-tiba-primary-500 focus-visible:ring-offset-1",
                            item.inMonth
                              ? "text-slate-700 hover:bg-tiba-primary-50 hover:text-tiba-primary-700 cursor-pointer"
                              : "text-slate-300 cursor-default",
                            isToday && !isSelected && "bg-tiba-primary-50 text-tiba-primary-700 font-bold ring-1 ring-tiba-primary-200",
                            isSelected && "bg-tiba-primary-600 text-white hover:bg-tiba-primary-700 hover:text-white font-bold shadow-md shadow-tiba-primary-200",
                            item.disabled && item.inMonth && "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-slate-700",
                          )}
                        >
                          {item.day}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}

              {/* Months Mode */}
              {mode === "months" && (
                <div className="grid grid-cols-3 gap-2">
                  {AR_MONTHS.map((month, idx) => (
                    <button
                      key={month}
                      type="button"
                      onClick={() => { setViewMonth(idx); setMode("calendar") }}
                      className={cn(
                        "py-4 sm:py-3 px-2 rounded-xl text-sm font-semibold transition-all duration-150",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-tiba-primary-500 focus-visible:ring-offset-1",
                        "hover:bg-tiba-primary-50 hover:text-tiba-primary-700",
                        idx === viewMonth
                          ? "bg-tiba-primary-600 text-white hover:bg-tiba-primary-700 hover:text-white shadow-md shadow-tiba-primary-200"
                          : "text-slate-700",
                        idx === today.getMonth() && viewYear === today.getFullYear() && idx !== viewMonth
                          ? "bg-tiba-primary-50 text-tiba-primary-700"
                          : "",
                      )}
                    >
                      {month}
                    </button>
                  ))}
                </div>
              )}

              {/* Years Mode */}
              {mode === "years" && (
                <div className="grid grid-cols-3 gap-2">
                  {years.map((year) => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => { setViewYear(year); setMode("months") }}
                      className={cn(
                        "py-4 sm:py-3 px-2 rounded-xl text-sm font-semibold transition-all duration-150",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-tiba-primary-500 focus-visible:ring-offset-1",
                        "hover:bg-tiba-primary-50 hover:text-tiba-primary-700",
                        year === viewYear
                          ? "bg-tiba-primary-600 text-white hover:bg-tiba-primary-700 hover:text-white shadow-md shadow-tiba-primary-200"
                          : "text-slate-700",
                        year === today.getFullYear() && year !== viewYear
                          ? "bg-tiba-primary-50 text-tiba-primary-700"
                          : "",
                      )}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/30 sm:rounded-b-2xl rounded-b-3xl">
              <button
                type="button"
                onClick={() => {
                  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
                  onChange(iso)
                  setOpen(false)
                  setMode("calendar")
                }}
                className="w-full py-3 sm:py-2.5 text-sm font-bold text-tiba-primary-600 hover:bg-tiba-primary-50 rounded-xl transition-colors"
              >
                اليوم — {formatArabicDate(today)}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
