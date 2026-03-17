"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { TibaCheckbox } from "./tiba-checkbox"

// ============================================
// Tiba Design System — Fee List Item
// A selectable list item for fees, services, etc.
// ============================================

export interface TibaFeeItemProps {
  id: string | number
  name: string
  amount?: number | string
  currency?: string
  type?: string
  typeLabel?: string
  description?: string
  checked?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  variant?: "default" | "selected" | "applied"
}

const TibaFeeItem = React.forwardRef<HTMLLabelElement, TibaFeeItemProps>(
  (
    {
      id: _id,
      name,
      amount,
      currency = "جنيه",
      type,
      typeLabel,
      description,
      checked = false,
      onChange,
      disabled = false,
      className,
      variant = "default",
    },
    ref
  ) => {
    const isApplied = variant === "applied"
    const isInteractive = !isApplied && onChange

    const Wrapper = isInteractive ? "label" : "div"

    return (
      <Wrapper
        ref={isInteractive ? ref as any : undefined}
        className={cn(
          "flex items-center justify-between p-3.5 sm:p-4",
          "border-2 rounded-xl transition-all duration-200",
          "group",
          isInteractive && "cursor-pointer",
          // States
          checked && !isApplied
            ? "border-tiba-primary-300 bg-tiba-primary-50/50 shadow-sm"
            : isApplied
              ? "border-tiba-secondary-200 bg-tiba-secondary-50/30"
              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50",
          disabled && "opacity-50 cursor-not-allowed",
          className,
        )}
      >
        {/* Right side: checkbox + info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {isInteractive && (
            <TibaCheckbox
              checked={checked}
              onChange={onChange}
              disabled={disabled}
              size="md"
              variant={checked ? "primary" : "primary"}
            />
          )}
          {isApplied && (
            <div className="w-5 h-5 rounded-full bg-tiba-secondary-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-tiba-secondary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          <div className="min-w-0">
            <div className="font-semibold text-sm sm:text-base text-slate-900 truncate">{name}</div>
            {(type || typeLabel || description) && (
              <div className="flex items-center gap-1.5 mt-0.5">
                {(type || typeLabel) && (
                  <span className="text-xs text-slate-500">
                    النوع: <span className="text-slate-600 font-medium">{typeLabel || type}</span>
                  </span>
                )}
                {description && (
                  <span className="text-xs text-slate-500">{description}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Left side: amount */}
        {amount !== undefined && (
          <div className={cn(
            "text-left flex-shrink-0 mr-3",
            checked
              ? "text-tiba-primary-700"
              : isApplied
                ? "text-tiba-secondary-700"
                : "text-slate-700",
          )}>
            <span className="font-bold text-sm sm:text-base">{amount}</span>
            {currency && (
              <span className="text-xs sm:text-sm text-slate-500 mr-1">{currency}</span>
            )}
          </div>
        )}
      </Wrapper>
    )
  }
)

TibaFeeItem.displayName = "TibaFeeItem"

export { TibaFeeItem }
