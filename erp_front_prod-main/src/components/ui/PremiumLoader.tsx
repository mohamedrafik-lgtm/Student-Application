'use client';

/**
 * PremiumLoader — now a wrapper around TibaLoader for backward compatibility
 * All new code should use TibaLoader directly
 */
import TibaLoader from './TibaLoader';

interface PremiumLoaderProps {
  type?: 'system' | 'data' | 'processing' | 'upload';
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  progress?: number;
}

export default function PremiumLoader({ 
  type = 'system',
  size = 'md',
  message,
  progress
}: PremiumLoaderProps) {
  return (
    <TibaLoader 
      variant="inline" 
      type={type} 
      size={size} 
      message={message} 
      progress={progress} 
    />
  );
}
