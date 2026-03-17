"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { CheckIcon } from "@heroicons/react/24/solid"

// ============================================
// Tiba Design System — Checkbox
// ============================================

export interface TibaCheckboxProps {
  checked?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  label?: string
  description?: string
  size?: "sm" | "md" | "lg"
  variant?: "primary" | "secondary" | "danger" | "warning"
  className?: string
  id?: string
  name?: string
  value?: string | number
  indeterminate?: boolean
}

const sizeMap = {
  sm: {
    box: "h-4 w-4 rounded",
    icon: "h-2.5 w-2.5",
    label: "text-sm",
    description: "text-xs",
    gap: "gap-2",
  },
  md: {
    box: "h-5 w-5 rounded-md",
    icon: "h-3 w-3",
    label: "text-sm",
    description: "text-xs",
    gap: "gap-2.5",
  },
  lg: {
    box: "h-6 w-6 rounded-md",
    icon: "h-3.5 w-3.5",
    label: "text-base",
    description: "text-sm",
    gap: "gap-3",
  },
}

const variantMap = {
  primary: {
    checked: "bg-tiba-primary-600 border-tiba-primary-600 shadow-tiba-primary-200",
    unchecked: "border-slate-300 bg-white hover:border-tiba-primary-400 hover:bg-tiba-primary-50",
    ring: "focus-visible:ring-tiba-primary-500/30",
    label: "text-slate-700",
  },
  secondary: {
    checked: "bg-tiba-secondary-600 border-tiba-secondary-600 shadow-tiba-secondary-200",
    unchecked: "border-slate-300 bg-white hover:border-tiba-secondary-400 hover:bg-tiba-secondary-50",
    ring: "focus-visible:ring-tiba-secondary-500/30",
    label: "text-slate-700",
  },
  danger: {
    checked: "bg-tiba-danger-600 border-tiba-danger-600 shadow-tiba-danger-200",
    unchecked: "border-slate-300 bg-white hover:border-tiba-danger-400 hover:bg-tiba-danger-50",
    ring: "focus-visible:ring-tiba-danger-500/30",
    label: "text-slate-700",
  },
  warning: {
    checked: "bg-tiba-warning-600 border-tiba-warning-600 shadow-tiba-warning-200",
    unchecked: "border-slate-300 bg-white hover:border-tiba-warning-400 hover:bg-tiba-warning-50",
    ring: "focus-visible:ring-tiba-warning-500/30",
    label: "text-slate-700",
  },
}

const TibaCheckbox = React.forwardRef<HTMLInputElement, TibaCheckboxProps>(
  (
    {
      checked = false,
      onChange,
      disabled = false,
      label,
      description,
      size = "md",
      variant = "primary",
      className,
      id,
      name,
      value,
      indeterminate = false,
    },
    ref
  ) => {
    const s = sizeMap[size]
    const v = variantMap[variant]
    const inputRef = React.useRef<HTMLInputElement>(null)

    React.useImperativeHandle(ref, () => inputRef.current!, [])

    React.useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = indeterminate
      }
    }, [indeterminate])

    return (
      <label
        className={cn(
          "inline-flex items-start cursor-pointer select-none group",
          s.gap,
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        <div className="relative flex-shrink-0 mt-0.5">
          <input
            ref={inputRef}
            type="checkbox"
            id={id}
            name={name}
            value={value}
            checked={checked}
            disabled={disabled}
            onChange={(e) => onChange?.(e.target.checked)}
            className="sr-only peer"
          />
          <div
            className={cn(
              s.box,
              "border-2 transition-all duration-200 flex items-center justify-center",
              "focus-visible:ring-4",
              v.ring,
              checked || indeterminate
                ? cn(v.checked, "shadow-sm")
                : v.unchecked,
              !disabled && "group-active:scale-90",
            )}
          >
            {checked && (
              <CheckIcon
                className={cn(s.icon, "text-white animate-in zoom-in-50 duration-150")}
              />
            )}
            {indeterminate && !checked && (
              <div className={cn("bg-white rounded-sm", size === "sm" ? "h-0.5 w-2" : size === "md" ? "h-0.5 w-2.5" : "h-0.5 w-3")} />
            )}
          </div>
        </div>
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <span className={cn(s.label, "font-medium leading-tight", v.label)}>
                {label}
              </span>
            )}
            {description && (
              <span className={cn(s.description, "text-slate-500 mt-0.5 leading-tight")}>
                {description}
              </span>
            )}
          </div>
        )}
      </label>
    )
  }
)

TibaCheckbox.displayName = "TibaCheckbox"

export { TibaCheckbox }
