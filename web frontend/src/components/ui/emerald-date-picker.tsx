"use client"

import * as React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

// ============================================
// Arabic month & day names
// ============================================
const AR_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
]
const AR_DAYS_SHORT = ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"]

// ============================================
// Helpers
// ============================================
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
function formatArabicDate(date: Date) {
  const day = date.getDate()
  const month = AR_MONTHS[date.getMonth()]
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}
function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

// ============================================
// Component
// ============================================
interface EmeraldDatePickerProps {
  value?: string // "YYYY-MM-DD"
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
}

export default function EmeraldDatePicker({
  value,
  onChange,
  placeholder = "اختر التاريخ",
  className,
  disabled = false,
  minDate,
  maxDate,
}: EmeraldDatePickerProps) {
  const today = new Date()
  const selectedDate = value ? new Date(value + "T00:00:00") : null

  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(selectedDate?.getFullYear() ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(selectedDate?.getMonth() ?? today.getMonth())
  const [mode, setMode] = useState<"calendar" | "months" | "years">("calendar")

  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Close on outside click
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
  }, [open])

  // Close on Escape
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
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }
  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  // Calendar grid
  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)
  const prevMonthDays = getDaysInMonth(viewYear, viewMonth - 1)

  const calendarDays: { day: number; inMonth: boolean; disabled: boolean }[] = []
  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    calendarDays.push({ day: prevMonthDays - i, inMonth: false, disabled: true })
  }
  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(viewYear, viewMonth, d)
    let isDisabled = false
    if (minDate && date < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) isDisabled = true
    if (maxDate && date > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())) isDisabled = true
    calendarDays.push({ day: d, inMonth: true, disabled: isDisabled })
  }
  // Next month leading days
  const remaining = 42 - calendarDays.length
  for (let d = 1; d <= remaining; d++) {
    calendarDays.push({ day: d, inMonth: false, disabled: true })
  }

  // Year range for year picker
  const yearRangeStart = Math.floor(viewYear / 12) * 12
  const years = range(yearRangeStart, yearRangeStart + 11)

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen(!open)
            if (!open && selectedDate) {
              setViewYear(selectedDate.getFullYear())
              setViewMonth(selectedDate.getMonth())
            }
          }
        }}
        className={cn(
          "w-full h-[50px] px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium flex items-center gap-3 transition-all",
          "focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500",
          "hover:border-slate-300",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          selectedDate ? "text-slate-900" : "text-slate-500",
          open && "ring-2 ring-emerald-500/20 border-emerald-500",
        )}
      >
        <Calendar className="w-5 h-5 text-slate-400 flex-shrink-0" />
        <span className="flex-1 text-right truncate">
          {selectedDate ? formatArabicDate(selectedDate) : placeholder}
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            "absolute z-50 mt-2 bg-white rounded-2xl border border-slate-200 shadow-xl",
            "w-[320px] sm:w-[340px]",
            // Position: prefer below, but on small screens use fixed positioning
            "right-0",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-slate-100">
            <button
              type="button"
              onClick={() => {
                if (mode === "calendar") goToNextMonth()
                else if (mode === "years") setViewYear(yearRangeStart - 12 + Math.floor(years.length / 2))
              }}
              className="h-9 w-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (mode === "calendar") setMode("months")
                else if (mode === "months") setMode("years")
                else setMode("calendar")
              }}
              className="px-4 py-1.5 rounded-lg hover:bg-slate-100 text-sm font-bold text-slate-800 transition-colors"
            >
              {mode === "years"
                ? `${years[0]} - ${years[years.length - 1]}`
                : mode === "months"
                  ? `${viewYear}`
                  : `${AR_MONTHS[viewMonth]} ${viewYear}`}
            </button>

            <button
              type="button"
              onClick={() => {
                if (mode === "calendar") goToPrevMonth()
                else if (mode === "years") setViewYear(yearRangeStart + 12 + Math.floor(years.length / 2))
              }}
              className="h-9 w-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3">
            {/* ========= CALENDAR MODE ========= */}
            {mode === "calendar" && (
              <>
                {/* Weekday headers */}
                <div className="grid grid-cols-7 mb-2">
                  {AR_DAYS_SHORT.map((day) => (
                    <div key={day} className="text-center text-xs font-semibold text-slate-400 py-1.5">
                      {day}
                    </div>
                  ))}
                </div>
                {/* Days grid */}
                <div className="grid grid-cols-7 gap-0.5">
                  {calendarDays.map((item, idx) => {
                    const isToday =
                      item.inMonth &&
                      isSameDay(new Date(viewYear, viewMonth, item.day), today)
                    const isSelected =
                      item.inMonth &&
                      selectedDate &&
                      isSameDay(new Date(viewYear, viewMonth, item.day), selectedDate)

                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={item.disabled || !item.inMonth}
                        onClick={() => item.inMonth && !item.disabled && handleDayClick(item.day)}
                        className={cn(
                          "h-10 w-full rounded-lg text-sm font-medium transition-all duration-150",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1",
                          // Base
                          item.inMonth
                            ? "text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer"
                            : "text-slate-300 cursor-default",
                          // Today
                          isToday && !isSelected && "bg-emerald-50 text-emerald-700 font-bold",
                          // Selected
                          isSelected &&
                            "bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white font-bold shadow-sm",
                          // Disabled
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

            {/* ========= MONTHS MODE ========= */}
            {mode === "months" && (
              <div className="grid grid-cols-3 gap-2">
                {AR_MONTHS.map((month, idx) => (
                  <button
                    key={month}
                    type="button"
                    onClick={() => {
                      setViewMonth(idx)
                      setMode("calendar")
                    }}
                    className={cn(
                      "py-3 px-2 rounded-xl text-sm font-semibold transition-all duration-150",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1",
                      "hover:bg-emerald-50 hover:text-emerald-700",
                      idx === viewMonth
                        ? "bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white shadow-sm"
                        : "text-slate-700",
                      idx === today.getMonth() && viewYear === today.getFullYear() && idx !== viewMonth
                        ? "bg-emerald-50 text-emerald-700"
                        : "",
                    )}
                  >
                    {month}
                  </button>
                ))}
              </div>
            )}

            {/* ========= YEARS MODE ========= */}
            {mode === "years" && (
              <div className="grid grid-cols-3 gap-2">
                {years.map((year) => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => {
                      setViewYear(year)
                      setMode("months")
                    }}
                    className={cn(
                      "py-3 px-2 rounded-xl text-sm font-semibold transition-all duration-150",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1",
                      "hover:bg-emerald-50 hover:text-emerald-700",
                      year === viewYear
                        ? "bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white shadow-sm"
                        : "text-slate-700",
                      year === today.getFullYear() && year !== viewYear
                        ? "bg-emerald-50 text-emerald-700"
                        : "",
                    )}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer - Today button */}
          <div className="p-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
                onChange(iso)
                setOpen(false)
                setMode("calendar")
              }}
              className="w-full py-2.5 text-sm font-bold text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
            >
              اليوم — {formatArabicDate(today)}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
