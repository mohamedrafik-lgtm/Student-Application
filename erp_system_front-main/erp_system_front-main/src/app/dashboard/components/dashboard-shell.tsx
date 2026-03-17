'use client';

import React from 'react';
// Removemos la dependencia de DashboardHeader que puede no existir o causar problemas
// import DashboardHeader from './DashboardHeader';

interface DashboardShellProps {
  children: React.ReactNode;
}

export default function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* <DashboardHeader /> */}
      {/* Usamos un header simplificado en su lugar */}
      <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-white border-b border-gray-200">
        <div className="container mx-auto h-full flex items-center justify-between px-4">
          <h1 className="text-xl font-bold">نظام إدارة المركز</h1>
        </div>
      </header>
      
      <main className="flex-1 pt-20 pb-8 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
} 