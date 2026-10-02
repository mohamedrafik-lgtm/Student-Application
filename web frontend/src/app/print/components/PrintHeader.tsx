'use client';

import { getImageUrl } from '@/lib/api';

interface PrintHeaderProps {
  settings?: any;
  title: string;
  subtitle?: string;
  showDate?: boolean;
  showLogo?: boolean;
}

export default function PrintHeader({ settings, title, subtitle, showDate = true, showLogo = true }: PrintHeaderProps) {
  const currentDate = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const logoUrl = settings?.logo ? getImageUrl(settings.logo) : null;

  return (
    <div className="print-header">
      {showLogo && (
        logoUrl ? (
          <img src={logoUrl} alt="Logo" className="logo" />
        ) : (
          <div className="logo-placeholder">🏛️</div>
        )
      )}
      {settings?.centerName && (
        <div className="org-name">{settings.centerName}</div>
      )}
      <div className="report-title">{title}</div>
      {subtitle && <div className="report-subtitle">{subtitle}</div>}
      {showDate && <div className="report-date">تاريخ الطباعة: {currentDate}</div>}
    </div>
  );
}
