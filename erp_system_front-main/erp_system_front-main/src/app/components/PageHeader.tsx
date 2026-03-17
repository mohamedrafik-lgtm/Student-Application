'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeftIcon } from '@heroicons/react/20/solid';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
}

export default function PageHeader({ title, description, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div className="mt-6 mb-6 space-y-2">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="breadcrumb" className="flex items-center gap-1 text-xs text-slate-400">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronLeftIcon className="w-3.5 h-3.5 text-slate-300" />}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-tiba-primary transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-slate-600 font-medium">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Title & actions row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          {description && (
            <p className="text-xs text-slate-400 mt-0.5">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
} 