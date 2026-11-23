"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import { ar } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

import "./calendar.css"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      locale={ar}
      dir="rtl"
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-2",
        month: "flex flex-col gap-4",
        month_caption: "flex justify-center pt-1 relative items-center w-full",
        caption_label: "text-sm font-bold text-slate-800",
        nav: "flex items-center gap-1",
        button_previous: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "absolute left-1 h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 border-slate-200 hover:bg-slate-100"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "absolute right-1 h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 border-slate-200 hover:bg-slate-100"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "text-slate-500 rounded-md w-9 font-medium text-[0.8rem]",
        week: "flex w-full mt-2",
        day: "h-9 w-9 text-center text-sm p-0 relative",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 aria-selected:opacity-100 transition-colors"
        ),
        selected:
          "[&>.rdp-day_button]:bg-emerald-600 [&>.rdp-day_button]:text-white [&>.rdp-day_button]:hover:bg-emerald-700 [&>.rdp-day_button]:hover:text-white [&>.rdp-day_button]:focus:bg-emerald-600 [&>.rdp-day_button]:focus:text-white [&>.rdp-day_button]:rounded-lg",
        today:
          "[&>.rdp-day_button]:bg-emerald-50 [&>.rdp-day_button]:text-emerald-800 [&>.rdp-day_button]:font-bold",
        outside:
          "text-slate-400 opacity-50 aria-selected:bg-emerald-50/50 aria-selected:text-slate-400 aria-selected:opacity-30",
        disabled: "text-slate-400 opacity-50",
        range_middle:
          "aria-selected:bg-emerald-50 aria-selected:text-emerald-800",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          return orientation === "left"
            ? <ChevronLeft className="h-4 w-4" />
            : <ChevronRight className="h-4 w-4" />
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
