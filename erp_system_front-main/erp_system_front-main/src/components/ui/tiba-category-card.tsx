"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronLeftIcon } from "@heroicons/react/24/outline"

// ============================================
// Tiba Design System — Category Card
// A beautiful card for navigational lists (like statistics categories)
// ============================================

export type TibaCategoryVariant = "primary" | "secondary" | "warning" | "danger" | "purple" | "neutral"

export interface TibaCategoryCardProps {
  title: string
  description?: string
  icon?: React.ReactNode
  variant?: TibaCategoryVariant
  onClick?: () => void
  href?: string
  disabled?: boolean
  badge?: string | number
  className?: string
  showArrow?: boolean
}

const variantStyles: Record<TibaCategoryVariant, {
  bg: string
  border: string
  iconBg: string
  arrow: string
  hoverBg: string
}> = {
  primary: {
    bg: "from-tiba-primary-50/80 to-tiba-primary-50/30",
    border: "border-tiba-primary-200 hover:border-tiba-primary-300",
    iconBg: "from-tiba-primary-500 to-tiba-primary-600",
    arrow: "text-tiba-primary-400 group-hover:text-tiba-primary-600",
    hoverBg: "hover:from-tiba-primary-50 hover:to-tiba-primary-100/50",
  },
  secondary: {
    bg: "from-tiba-secondary-50/80 to-tiba-secondary-50/30",
    border: "border-tiba-secondary-200 hover:border-tiba-secondary-300",
    iconBg: "from-tiba-secondary-500 to-tiba-secondary-600",
    arrow: "text-tiba-secondary-400 group-hover:text-tiba-secondary-600",
    hoverBg: "hover:from-tiba-secondary-50 hover:to-tiba-secondary-100/50",
  },
  warning: {
    bg: "from-tiba-warning-50/80 to-tiba-warning-50/30",
    border: "border-tiba-warning-200 hover:border-tiba-warning-300",
    iconBg: "from-tiba-warning-500 to-tiba-warning-600",
    arrow: "text-tiba-warning-400 group-hover:text-tiba-warning-600",
    hoverBg: "hover:from-tiba-warning-50 hover:to-tiba-warning-100/50",
  },
  danger: {
    bg: "from-tiba-danger-50/80 to-tiba-danger-50/30",
    border: "border-tiba-danger-200 hover:border-tiba-danger-300",
    iconBg: "from-tiba-danger-500 to-tiba-danger-600",
    arrow: "text-tiba-danger-400 group-hover:text-tiba-danger-600",
    hoverBg: "hover:from-tiba-danger-50 hover:to-tiba-danger-100/50",
  },
  purple: {
    bg: "from-violet-50/80 to-purple-50/30",
    border: "border-violet-200 hover:border-violet-300",
    iconBg: "from-violet-500 to-purple-600",
    arrow: "text-violet-400 group-hover:text-violet-600",
    hoverBg: "hover:from-violet-50 hover:to-purple-100/50",
  },
  neutral: {
    bg: "from-slate-50/80 to-slate-50/30",
    border: "border-slate-200 hover:border-slate-300",
    iconBg: "from-slate-500 to-slate-600",
    arrow: "text-slate-400 group-hover:text-slate-600",
    hoverBg: "hover:from-slate-50 hover:to-slate-100/50",
  },
}

const TibaCategoryCard = React.forwardRef<HTMLButtonElement, TibaCategoryCardProps>(
  (
    {
      title,
      description,
      icon,
      variant = "primary",
      onClick,
      href,
      disabled = false,
      badge,
      className,
      showArrow = true,
    },
    ref
  ) => {
    const v = variantStyles[variant]

    const content = (
      <div
        className={cn(
          "flex items-center gap-3 sm:gap-4 p-3 sm:p-4",
          "bg-gradient-to-r rounded-xl",
          "border-2 transition-all duration-200",
          "shadow-sm hover:shadow-md",
          v.bg,
          v.border,
          v.hoverBg,
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        {/* Icon */}
        {icon && (
          <div
            className={cn(
              "w-11 h-11 sm:w-14 sm:h-14",
              "bg-gradient-to-br rounded-xl",
              "flex items-center justify-center flex-shrink-0",
              "shadow-lg group-hover:scale-105 transition-transform duration-200",
              v.iconBg,
            )}
          >
            <div className="text-white w-5 h-5 sm:w-7 sm:h-7 [&>svg]:w-full [&>svg]:h-full">
              {icon}
            </div>
          </div>
        )}

        {/* Text */}
        <div className="flex-1 text-right min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate">{title}</h4>
            {badge !== undefined && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-white/80 text-slate-700 shadow-sm">
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5 line-clamp-2">{description}</p>
          )}
        </div>

        {/* Arrow */}
        {showArrow && (
          <ChevronLeftIcon
            className={cn(
              "w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 transition-transform duration-200",
              "group-hover:-translate-x-1 rtl:group-hover:translate-x-1",
              v.arrow,
            )}
          />
        )}
      </div>
    )

    if (href) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn("block w-full group", disabled && "pointer-events-none", className)}
          onClick={onClick}
        >
          {content}
        </a>
      )
    }

    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn("w-full group text-right", className)}
      >
        {content}
      </button>
    )
  }
)

TibaCategoryCard.displayName = "TibaCategoryCard"

export { TibaCategoryCard }
