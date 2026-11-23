'use client';

import TibaLoader from '@/components/ui/TibaLoader';

interface LoadingScreenProps {
  message?: string;
  submessage?: string;
}

export default function LoadingScreen({ 
  message = "جاري تحميل البيانات...", 
  submessage = "يرجى الانتظار قليلاً" 
}: LoadingScreenProps) {
  return (
    <TibaLoader 
      variant="inline" 
      type="data" 
      size="md" 
      message={message} 
      submessage={submessage} 
    />
  );
}
