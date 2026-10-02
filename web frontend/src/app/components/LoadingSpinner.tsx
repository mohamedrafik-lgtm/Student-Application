'use client';

import { TibaSpinner } from '@/components/ui/TibaLoader';

export default function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const tibaSize = size === 'lg' ? 'md' : size === 'md' ? 'sm' : 'xs';
  return (
    <div className="flex items-center justify-center">
      <TibaSpinner size={tibaSize} type="system" />
    </div>
  );
} 