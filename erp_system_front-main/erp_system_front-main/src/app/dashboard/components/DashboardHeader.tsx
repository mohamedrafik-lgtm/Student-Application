"use client";

import React, { ReactNode } from 'react';

interface DashboardHeaderProps {
  heading: string;
  description?: string;
  children?: ReactNode;
}

export default function DashboardHeader({
  heading,
  description,
  children,
}: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-800">{heading}</h1>
        {description && (
          <p className="text-gray-600 mt-1">{description}</p>
        )}
      </div>
      {children && <div>{children}</div>}
    </div>
  );
} 