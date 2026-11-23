'use client';

/**
 * LoadingSpinner — now powered by TibaLoader
 * Maintains the same API for backward compatibility
 */
import TibaLoader, { TibaSpinner } from './TibaLoader';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'modern' | 'elegant' | 'minimal';
  text?: string;
  showText?: boolean;
}

export default function LoadingSpinner({ 
  size = 'md', 
  variant = 'modern',
  text = 'جاري التحميل...', 
  showText = true 
}: LoadingSpinnerProps) {
  if (variant === 'minimal' || !showText) {
    return (
      <div className="flex flex-col items-center justify-center py-4">
        <TibaSpinner size={size === 'lg' ? 'md' : 'sm'} type="system" />
        {showText && text && (
          <p className="text-tiba-gray-500 text-sm mt-3">{text}</p>
        )}
      </div>
    );
  }

  return (
    <TibaLoader 
      variant="minimal" 
      type={variant === 'elegant' ? 'data' : 'system'} 
      size={size} 
      message={text} 
    />
  );
}
