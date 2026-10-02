"use client"

import { useEffect, useCallback, useRef } from "react"
import { XMarkIcon } from "@heroicons/react/24/outline"
import { cn } from "@/lib/utils"

// ============================================
// Tiba Design System — Modal
// Full-screen on mobile, centered card on desktop
// ============================================

export type TibaModalVariant = "primary" | "secondary" | "danger" | "warning" | "neutral"
export type TibaModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "full"

const variantStyles: Record<TibaModalVariant, {
  headerBg: string
  headerBorder: string
  iconBg: string
  titleColor: string
  subtitleColor: string
  closeBtn: string
}> = {
  primary: {
    headerBg: "bg-gradient-to-r from-tiba-primary-50 via-tiba-primary-100 to-indigo-50",
    headerBorder: "border-tiba-primary-200/60",
    iconBg: "bg-gradient-to-br from-tiba-primary-500 to-tiba-primary-600 shadow-lg shadow-tiba-primary-200",
    titleColor: "text-slate-900",
    subtitleColor: "text-slate-600",
    closeBtn: "text-slate-400 hover:text-slate-600 hover:bg-tiba-primary-100",
  },
  secondary: {
    headerBg: "bg-gradient-to-r from-tiba-secondary-50 via-tiba-secondary-100 to-emerald-50",
    headerBorder: "border-tiba-secondary-200/60",
    iconBg: "bg-gradient-to-br from-tiba-secondary-500 to-tiba-secondary-600 shadow-lg shadow-tiba-secondary-200",
    titleColor: "text-slate-900",
    subtitleColor: "text-slate-600",
    closeBtn: "text-slate-400 hover:text-slate-600 hover:bg-tiba-secondary-100",
  },
  danger: {
    headerBg: "bg-gradient-to-r from-tiba-danger-50 via-tiba-danger-100/80 to-tiba-warning-50",
    headerBorder: "border-tiba-danger-200/60",
    iconBg: "bg-gradient-to-br from-tiba-danger-500 to-tiba-danger-600 shadow-lg shadow-tiba-danger-200",
    titleColor: "text-slate-900",
    subtitleColor: "text-slate-600",
    closeBtn: "text-slate-400 hover:text-slate-600 hover:bg-tiba-danger-100",
  },
  warning: {
    headerBg: "bg-gradient-to-r from-tiba-warning-50 via-amber-100/80 to-orange-50",
    headerBorder: "border-tiba-warning-200/60",
    iconBg: "bg-gradient-to-br from-tiba-warning-500 to-amber-600 shadow-lg shadow-tiba-warning-200",
    titleColor: "text-slate-900",
    subtitleColor: "text-slate-600",
    closeBtn: "text-slate-400 hover:text-slate-600 hover:bg-tiba-warning-100",
  },
  neutral: {
    headerBg: "bg-gradient-to-r from-slate-50 via-slate-100 to-slate-50",
    headerBorder: "border-slate-200/60",
    iconBg: "bg-gradient-to-br from-slate-500 to-slate-600 shadow-lg shadow-slate-200",
    titleColor: "text-slate-900",
    subtitleColor: "text-slate-600",
    closeBtn: "text-slate-400 hover:text-slate-600 hover:bg-slate-100",
  },
}

const sizeStyles: Record<TibaModalSize, string> = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
  "2xl": "sm:max-w-5xl",
  full: "sm:max-w-6xl",
}

export interface TibaModalProps {
  open: boolean
  onClose: () => void
  variant?: TibaModalVariant
  size?: TibaModalSize
  title: string
  subtitle?: string
  icon?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  /** Extra classNames on the body scroll area */
  bodyClassName?: string
  /** z-index level */
  zIndex?: number
  /** Whether clicking backdrop closes modal */
  closeOnBackdrop?: boolean
  /** Hide the default close (X) button */
  hideCloseButton?: boolean
}

export function TibaModal({
  open,
  onClose,
  variant = "primary",
  size = "lg",
  title,
  subtitle,
  icon,
  children,
  footer,
  bodyClassName,
  zIndex = 100,
  closeOnBackdrop = true,
  hideCloseButton = false,
}: TibaModalProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  // Escape key
  useEffect(() => {
    if (!open) return undefined
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [open, onClose])

  // Lock body scroll
  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [open])

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (closeOnBackdrop && contentRef.current && !contentRef.current.contains(e.target as Node)) {
        onClose()
      }
    },
    [closeOnBackdrop, onClose],
  )

  if (!open) return null

  const v = variantStyles[variant]

  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center animate-in fade-in duration-200"
      style={{ zIndex }}
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Content */}
      <div
        ref={contentRef}
        className={cn(
          // Mobile: full-width bottom sheet filling most of screen
          "relative w-full bg-white flex flex-col",
          "max-h-[100dvh] sm:max-h-[92vh]",
          "rounded-t-3xl sm:rounded-2xl",
          "shadow-2xl",
          "animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300",
          // Desktop sizing
          sizeStyles[size],
          "sm:mx-4",
        )}
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-2 pb-0 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className={cn(
          "flex items-center gap-3 p-4 sm:p-5 border-b flex-shrink-0",
          "rounded-t-3xl sm:rounded-t-2xl",
          v.headerBg,
          v.headerBorder,
        )}>
          {icon && (
            <div className={cn(
              "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0",
              v.iconBg,
            )}>
              <div className="w-5 h-5 sm:w-6 sm:h-6 text-white">
                {icon}
              </div>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className={cn("text-base sm:text-lg font-bold truncate", v.titleColor)}>
              {title}
            </h3>
            {subtitle && (
              <p className={cn("text-xs sm:text-sm mt-0.5 truncate", v.subtitleColor)}>
                {subtitle}
              </p>
            )}
          </div>
          {!hideCloseButton && (
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "p-2 rounded-xl transition-all flex-shrink-0",
                v.closeBtn,
              )}
            >
              <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          )}
        </div>

        {/* Body — scrollable */}
        <div className={cn(
          "flex-1 overflow-y-auto overscroll-contain",
          "p-4 sm:p-6",
          bodyClassName,
        )}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className={cn(
            "flex-shrink-0 border-t border-slate-200/80",
            "bg-slate-50/60 backdrop-blur-sm",
            "p-4 sm:p-5",
            "rounded-b-3xl sm:rounded-b-2xl",
          )}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// Trainee Info Card — reusable inside modals
// ============================================

export interface TibaTraineeInfoProps {
  name: string
  nationalId?: string
  program?: string
  variant?: TibaModalVariant
  className?: string
  extra?: React.ReactNode
}

export function TibaTraineeInfo({ name, nationalId, program, variant = "primary", className, extra }: TibaTraineeInfoProps) {
  const bgMap: Record<TibaModalVariant, string> = {
    primary: "bg-gradient-to-r from-tiba-primary-50 to-tiba-primary-100/50 border-tiba-primary-200",
    secondary: "bg-gradient-to-r from-tiba-secondary-50 to-tiba-secondary-100/50 border-tiba-secondary-200",
    danger: "bg-gradient-to-r from-tiba-danger-50 to-tiba-danger-100/50 border-tiba-danger-200",
    warning: "bg-gradient-to-r from-tiba-warning-50 to-tiba-warning-100/50 border-tiba-warning-200",
    neutral: "bg-gradient-to-r from-slate-50 to-slate-100/50 border-slate-200",
  }
  const iconMap: Record<TibaModalVariant, string> = {
    primary: "bg-tiba-primary-600",
    secondary: "bg-tiba-secondary-600",
    danger: "bg-tiba-danger-600",
    warning: "bg-tiba-warning-600",
    neutral: "bg-slate-600",
  }

  return (
    <div className={cn("rounded-xl border p-3 sm:p-4 flex items-center gap-3", bgMap[variant], className)}>
      <div className={cn("w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0", iconMap[variant])}>
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm sm:text-base text-slate-900 truncate">{name}</p>
        {nationalId && <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{nationalId}</p>}
        {program && <p className="text-xs text-slate-500 mt-0.5 truncate">{program}</p>}
      </div>
      {extra}
    </div>
  )
}

// ============================================
// Alert / Warning Box inside modals
// ============================================

export interface TibaModalAlertProps {
  variant?: "warning" | "danger" | "info" | "success"
  icon?: React.ReactNode
  title?: string
  children: React.ReactNode
  className?: string
}

export function TibaModalAlert({ variant = "warning", icon, title, children, className }: TibaModalAlertProps) {
  const styles: Record<string, { bg: string; border: string; titleColor: string; textColor: string; iconColor: string }> = {
    warning: { bg: "bg-tiba-warning-50", border: "border-tiba-warning-200", titleColor: "text-tiba-warning-800", textColor: "text-tiba-warning-700", iconColor: "text-tiba-warning-500" },
    danger: { bg: "bg-tiba-danger-50", border: "border-tiba-danger-200", titleColor: "text-tiba-danger-800", textColor: "text-tiba-danger-700", iconColor: "text-tiba-danger-500" },
    info: { bg: "bg-tiba-primary-50", border: "border-tiba-primary-200", titleColor: "text-tiba-primary-800", textColor: "text-tiba-primary-700", iconColor: "text-tiba-primary-500" },
    success: { bg: "bg-tiba-secondary-50", border: "border-tiba-secondary-200", titleColor: "text-tiba-secondary-800", textColor: "text-tiba-secondary-700", iconColor: "text-tiba-secondary-500" },
  }
  const s = styles[variant]

  return (
    <div className={cn("rounded-xl border p-3 sm:p-4", s.bg, s.border, className)}>
      <div className="flex gap-3">
        {icon && <div className={cn("flex-shrink-0 mt-0.5", s.iconColor)}>{icon}</div>}
        <div className="flex-1 min-w-0">
          {title && <p className={cn("font-bold text-sm mb-1", s.titleColor)}>{title}</p>}
          <div className={cn("text-xs sm:text-sm", s.textColor)}>{children}</div>
        </div>
      </div>
    </div>
  )
}
