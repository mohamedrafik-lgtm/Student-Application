'use client';

import { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva(
  "bg-white border rounded-lg shadow-card transition-all duration-200",
  {
    variants: {
      variant: {
        default: "border-tiba-gray-200",
        primary: "border-tiba-primary-100 bg-tiba-primary-50/30",
        secondary: "border-tiba-secondary-100 bg-tiba-secondary-50/30",
        warning: "border-tiba-warning-100 bg-tiba-warning-50/30",
        danger: "border-tiba-danger-100 bg-tiba-danger-50/30",
      },
      size: {
        sm: "p-3",
        md: "p-4",
        lg: "p-6",
      },
      hover: {
        true: "hover:shadow-card-hover hover:border-tiba-gray-300",
        false: "",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      hover: true,
    },
  }
);

export interface CardProps extends VariantProps<typeof cardVariants> {
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}

export function Card({ className, variant, size, hover, children, onClick }: CardProps) {
  return (
    <div 
      className={cn(cardVariants({ variant, size, hover }), className, onClick && "cursor-pointer")}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("mb-4", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <h3 className={cn("text-lg font-semibold text-tiba-gray-800", className)}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <p className={cn("text-sm text-tiba-gray-600 mt-1", className)}>
      {children}
    </p>
  );
}

export function CardContent({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("", className)}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("mt-4 pt-4 border-t border-tiba-gray-200 flex items-center justify-between", className)}>
      {children}
    </div>
  );
}

export function CardStat({ 
  icon, 
  title, 
  value, 
  change, 
  changeType = "neutral",
  variant = "default"
}: { 
  icon?: ReactNode; 
  title: string; 
  value: string | number; 
  change?: string | number;
  changeType?: "positive" | "negative" | "neutral";
  variant?: "default" | "primary" | "secondary" | "warning" | "danger";
}) {
  const changeColor = 
    changeType === "positive" ? "text-tiba-secondary-600" : 
    changeType === "negative" ? "text-tiba-danger-600" : 
    "text-tiba-gray-600";

  const iconBgColor = 
    variant === "primary" ? "bg-tiba-primary-100 text-tiba-primary-700" :
    variant === "secondary" ? "bg-tiba-secondary-100 text-tiba-secondary-700" :
    variant === "warning" ? "bg-tiba-warning-100 text-tiba-warning-700" :
    variant === "danger" ? "bg-tiba-danger-100 text-tiba-danger-700" :
    "bg-tiba-gray-100 text-tiba-gray-700";

  return (
    <div className="flex items-center gap-4">
      {icon && (
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${iconBgColor}`}>
          {icon}
        </div>
      )}
      <div>
        <p className="text-sm text-tiba-gray-600">{title}</p>
        <div className="flex items-center gap-2">
          <p className="text-2xl font-bold text-tiba-gray-800">{value}</p>
          {change && (
            <span className={`text-xs font-medium ${changeColor}`}>
              {change}
            </span>
          )}
        </div>
      </div>
    </div>
  );
} 