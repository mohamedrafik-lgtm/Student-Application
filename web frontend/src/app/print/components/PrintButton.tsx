'use client';

import { PrinterIcon } from '@heroicons/react/24/outline';

interface PrintButtonProps {
  label?: string;
}

export default function PrintButton({ label = 'طباعة' }: PrintButtonProps) {
  return (
    <button
      onClick={() => window.print()}
      className="print-action-button no-print"
    >
      <PrinterIcon />
      {label}
    </button>
  );
}
