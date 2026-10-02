'use client';

import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none shadow-sm",
  {
    variants: {
      variant: {
        default: "bg-tiba-primary-600 text-white hover:bg-tiba-primary-700 focus-visible:ring-tiba-primary-600",
        secondary: "bg-tiba-secondary-500 text-white hover:bg-tiba-secondary-600 focus-visible:ring-tiba-secondary-600",
        outline: "border border-tiba-gray-200 bg-white hover:bg-tiba-gray-50 text-tiba-gray-800",
        ghost: "hover:bg-tiba-gray-100 text-tiba-gray-800",
        danger: "bg-tiba-danger-500 text-white hover:bg-tiba-danger-600 focus-visible:ring-tiba-danger-600",
        warning: "bg-tiba-warning-500 text-white hover:bg-tiba-warning-600 focus-visible:ring-tiba-warning-600",
        success: "bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg focus-visible:ring-green-500",
        primary: "bg-tiba-primary-600 text-white hover:bg-tiba-primary-700 focus-visible:ring-tiba-primary-600",
        link: "text-tiba-primary-700 hover:text-tiba-primary-800 underline-offset-4 hover:underline p-0 h-auto shadow-none",
      },
      size: {
        sm: "h-8 px-3 py-1",
        md: "h-10 px-4 py-2",
        lg: "h-12 px-6 py-3",
        icon: "h-10 w-10",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  children: ReactNode;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, children, leftIcon, rightIcon, isLoading, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        ref={ref}
        disabled={isLoading || disabled}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {leftIcon && !isLoading && <span className="mr-2">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants }; 