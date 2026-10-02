'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { getTraineeFeeReport } from '@/app/lib/api/finances';
import { getSystemSettings } from '@/app/lib/api/settings';
import { formatCurrency, formatDate } from '@/app/lib/utils';
import { TraineeFee, PaymentStatus } from '@/app/types/finances';
import { Trainee } from '@/app/types/trainees';
import { getImageUrl } from '@/lib/api';

export default function PrintReportPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const feeId = Number(params.id);
  const reportType = searchParams.get('type') || undefined;
  const includeNotes = searchParams.get('includeNotes') === 'true';
  const [fee, setFee] = useState<TraineeFee | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // الحصول على عنوان التقرير بناءً على النوع
  const getReportTitle = () => {
    switch (reportType) {
      case 'paid':
        return 'المسددين للرسم';
      case 'unpaid':
        return 'الغير مسددين للرسم';
      case 'paid-all-previous':
        return 'المسددين للرسم وكل الرسوم السابقة';
      case 'unpaid-any-previous':
        return 'الغير مسددين للرسم الحالي وأي رسم سابق';
      default:
        return 'جميع المتدربين';
    }
  };

  // جلب بيانات الرسوم والمدفوعات المرتبطة بها وإعدادات النظام
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [feeData, settingsData] = await Promise.all([
        getTraineeFeeReport(feeId, reportType),
        getSystemSettings(),
      ]);
      setFee(feeData);
      setSettings(settingsData);
      console.log('Settings loaded:', settingsData); // للتحقق من البيانات
    } catch (error) {
      console.error('خطأ في جلب البيانات:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // تحميل البيانات عند تحميل الصفحة أو تغيير نوع التقرير
  useEffect(() => {
    if (feeId) {
      fetchData();
    }
  }, [feeId, reportType]);

  // وظيفة الطباعة
  const handlePrint = () => {
    window.print();
  };

  // تحويل حالة الدفع إلى نص عربي
  const getPaymentStatusText = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.PENDING:
        return 'قيد الانتظار';
      case PaymentStatus.PAID:
        return 'مدفوع';
      case PaymentStatus.PARTIALLY_PAID:
        return 'مدفوع جزئياً';
      case PaymentStatus.CANCELLED:
        return 'ملغي';
      default:
        return status;
    }
  };

  // حساب إجماليات التقرير
  const calculateSummary = () => {
    if (!fee || !fee.traineePayments) {
      return {
        totalStudents: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalRemaining: 0,
        paidPercentage: 0,
        statusCounts: {
          PENDING: 0,
          PARTIALLY_PAID: 0,
          PAID: 0,
          CANCELLED: 0,
        }
      };
    }

    // لتقرير الغير مسددين: البيانات تأتي مجمّعة من الباك إند
    if (reportType === 'unpaid-any-previous') {
      const totalStudents = fee.traineePayments.length;
      const totalAmount = fee.traineePayments.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
      const totalPaid = fee.traineePayments.reduce((sum: number, payment: any) => sum + (payment.paidAmount || 0), 0);
      const totalRemaining = fee.traineePayments.reduce((sum: number, payment: any) => sum + (payment.remainingAmount || 0), 0);
      
      return {
        totalStudents,
        totalAmount,
        totalPaid,
        totalRemaining,
        paidPercentage: totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0,
        statusCounts: {
          PENDING: 0,
          PARTIALLY_PAID: totalStudents,
          PAID: 0,
          CANCELLED: 0,
        }
      };
    }

    // لتقرير المسددين لكل الرسوم: البيانات تأتي مجمّعة من الباك إند
    if (reportType === 'paid-all-previous') {
      const totalStudents = fee.traineePayments.length;
      const totalAmount = fee.traineePayments.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
      const totalPaid = fee.traineePayments.reduce((sum: number, payment: any) => sum + (payment.paidAmount || 0), 0);
      const totalRemaining = 0;
      
      return {
        totalStudents,
        totalAmount,
        totalPaid,
        totalRemaining,
        paidPercentage: 100,
        statusCounts: {
          PENDING: 0,
          PARTIALLY_PAID: 0,
          PAID: totalStudents,
          CANCELLED: 0,
        }
      };
    }

    // للتقارير الأخرى: حساب عادي
    const totalStudents = fee.traineePayments.length;
    const totalAmount = fee.amount * totalStudents;
    const totalPaid = fee.traineePayments.reduce((sum, payment) => sum + payment.paidAmount, 0);
    const totalRemaining = totalAmount - totalPaid;
    const paidPercentage = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;

    // حساب عدد المتدربين حسب حالة الدفع
    const statusCounts = {
      PENDING: 0,
      PARTIALLY_PAID: 0,
      PAID: 0,
      CANCELLED: 0,
    };

    fee.traineePayments.forEach(payment => {
      statusCounts[payment.status]++;
    });

    return {
      totalStudents,
      totalAmount,
      totalPaid,
      totalRemaining,
      paidPercentage,
      statusCounts,
    };
  };

  const summary = calculateSummary();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#0A2647] mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل التقرير...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black font-cairo" dir="rtl" style={{margin: 0, padding: 0}}>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }
        
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          overflow-x: hidden;
        }
        
        .print-only-layout {
          margin: 0 !important;
          padding: 0 !important;
        }
        @media print {
          body { 
            font-family: 'Cairo', 'Arial', sans-serif !important;
            direction: rtl !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .no-print { display: none !important; }
          
          @page { 
            size: A4;
            margin: 15mm;
          }
        }
        
        .print-container {
          max-width: 210mm;
          margin: 0 auto;
          padding: 20px;
          background: white;
        }
        
        .header {
          text-align: center;
          border-bottom: 3px solid #0A2647;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        
        .logo {
          width: 100px;
          height: 100px;
          margin: 0 auto 15px;
          background: #f0f0f0;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
        }
        
        .title {
          font-size: 28px;
          font-weight: bold;
          color: #0A2647;
          margin: 15px 0;
        }
        
        .subtitle {
          font-size: 20px;
          color: #666;
          margin: 10px 0;
        }
        
        .date {
          font-size: 14px;
          color: #888;
          margin-top: 15px;
        }
        
        .section {
          margin: 25px 0;
          page-break-inside: avoid;
        }
        
        .section-title {
          font-size: 18px;
          font-weight: bold;
          color: #0A2647;
          margin-bottom: 15px;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin: 15px 0;
        }
        
        .info-item {
          padding: 10px;
          background: #f9f9f9;
          border: 1px solid #ddd;
          border-radius: 5px;
        }
        
        .info-label {
          font-size: 12px;
          color: #666;
          margin-bottom: 5px;
        }
        
        .info-value {
          font-size: 14px;
          font-weight: bold;
          color: #333;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          margin: 20px 0;
        }
        
        .summary-card {
          text-align: center;
          padding: 15px;
          background: #f9f9f9;
          border: 1px solid #ddd;
          border-radius: 5px;
        }
        
        .summary-value {
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .summary-label {
          font-size: 12px;
          color: #666;
        }
        
        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          font-size: 11px;
        }
        
        .data-table th,
        .data-table td {
          border: 1px solid #ddd;
          padding: 8px 6px;
          text-align: right;
        }
        
        .data-table th {
          background: #f5f5f5;
          font-weight: bold;
          font-size: 13px;
        }
        
        .data-table tr:nth-child(even) {
          background: #fafafa;
        }
        
        .status-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 3px;
          font-size: 10px;
          font-weight: bold;
          border: 1px solid #ccc;
        }
        
        .status-paid {
          background: #d4edda;
          color: #155724;
          border-color: #c3e6cb;
        }
        
        .status-partial {
          background: #fff3cd;
          color: #856404;
          border-color: #ffeaa7;
        }
        
        .status-pending {
          background: #f8d7da;
          color: #721c24;
          border-color: #f5c6cb;
        }
        
        .footer {
          text-align: center;
          border-top: 2px solid #ddd;
          padding-top: 15px;
          margin-top: 40px;
          font-size: 11px;
          color: #666;
        }
        
        .progress-bar {
          width: 100%;
          height: 20px;
          background: #f0f0f0;
          border-radius: 10px;
          overflow: hidden;
          margin: 10px 0;
        }
        
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #10b981, #059669);
          transition: width 0.3s ease;
        }
        
        .print-button {
          position: fixed;
          top: 20px;
          left: 20px;
          z-index: 1000;
          background: linear-gradient(135deg, #0A2647, #1e3a52);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 12px 24px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(10, 38, 71, 0.3);
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .print-button:hover {
          background: linear-gradient(135deg, #1e3a52, #0A2647);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(10, 38, 71, 0.4);
        }
        
        .print-button:active {
          transform: translateY(0);
        }
        
        .print-icon {
          width: 20px;
          height: 20px;
          fill: currentColor;
        }
        
        @media print {
          .print-button {
            display: none !important;
          }
        }
      `}</style>

      {/* زر الطباعة */}
      <button onClick={handlePrint} className="print-button">
        <svg className="print-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 9V2H18V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6 18H4C3.44772 18 3 17.5523 3 17V11C3 10.4477 3.44772 10 4 10H20C20.5523 10 21 10.4477 21 11V17C21 17.5523 20.5523 18 20 18H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M18 14H6V22H18V14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        طباعة التقرير
      </button>

      <div className="print-container">
        {/* رأس التقرير */}
        <div className="header">
          <div className="logo">
            {settings && settings.centerLogo && settings.centerLogo.trim() !== '' ? (
              <img 
                src={getImageUrl(settings.centerLogo)} 
                alt="شعار المركز" 
                style={{width: '100%', height: '100%', objectFit: 'contain'}}
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = '🏛️';
                  }
                }}
              />
            ) : (
              '🏛️'
            )}
          </div>
          <h1 className="title">
            {settings && settings.centerName && settings.centerName.trim() !== '' 
              ? settings.centerName 
              : 'مركز طيبة للتدريب المهني'}
          </h1>
          <h2 className="subtitle">تقرير رسوم: {fee?.name || ''}</h2>
          <h3 className="subtitle" style={{ fontSize: '16px', marginTop: '8px' }}>{getReportTitle()}</h3>
          <div className="date">
            تاريخ إصدار التقرير: {new Date().toLocaleDateString('ar-EG', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>

        {/* معلومات الرسوم */}
        <div className="section">
          <h3 className="section-title">معلومات الرسوم</h3>
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">اسم الرسوم</div>
              <div className="info-value">{fee?.name}</div>
            </div>
            <div className="info-item">
              <div className="info-label">المبلغ</div>
              <div className="info-value">{formatCurrency(fee?.amount || 0, fee?.safe?.currency || 'EGP')}</div>
            </div>
            <div className="info-item">
              <div className="info-label">العام الدراسي</div>
              <div className="info-value">{fee?.academicYear}</div>
            </div>
            <div className="info-item">
              <div className="info-label">البرنامج</div>
              <div className="info-value">{fee?.program?.nameAr || '-'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">الخزينة</div>
              <div className="info-value">{fee?.safe?.name || '-'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">تاريخ التطبيق</div>
              <div className="info-value">{fee?.appliedAt ? formatDate(fee.appliedAt) : 'غير مطبق'}</div>
            </div>
          </div>
        </div>

        {/* ملخص التقرير */}
        <div className="section">
          <h3 className="section-title">ملخص التقرير</h3>
          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-value">{summary.totalStudents}</div>
              <div className="summary-label">عدد المتدربين</div>
            </div>
            <div className="summary-card">
              <div className="summary-value">{formatCurrency(summary.totalAmount, fee?.safe?.currency || 'EGP')}</div>
              <div className="summary-label">إجمالي المبالغ</div>
            </div>
            <div className="summary-card">
              <div className="summary-value" style={{color: '#059669'}}>{formatCurrency(summary.totalPaid, fee?.safe?.currency || 'EGP')}</div>
              <div className="summary-label">إجمالي المدفوعات</div>
            </div>
            <div className="summary-card">
              <div className="summary-value" style={{color: '#dc2626'}}>{formatCurrency(summary.totalRemaining, fee?.safe?.currency || 'EGP')}</div>
              <div className="summary-label">المبالغ المتبقية</div>
            </div>
          </div>

          <div style={{textAlign: 'center', margin: '20px 0'}}>
            <div style={{marginBottom: '10px'}}>
              <strong>نسبة التحصيل: {summary.paidPercentage.toFixed(1)}%</strong>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{width: `${summary.paidPercentage}%`}}></div>
            </div>
          </div>
        </div>

        {/* جدول المتدربين */}
        {fee?.traineePayments && fee.traineePayments.length > 0 && (
          <div className="section">
            <h3 className="section-title">تفاصيل المتدربين</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>المتدرب</th>
                  <th>رقم هاتف المتدرب</th>
                  <th>رقم هاتف ولي الأمر</th>
                  {reportType === 'unpaid-any-previous' && (
                    <th>الرسوم الغير مسددة</th>
                  )}
                  {reportType === 'paid-all-previous' && (
                    <th>الرسوم المسددة</th>
                  )}
                  <th>إجمالي المبلغ</th>
                  <th>إجمالي المدفوع</th>
                  <th>إجمالي المتبقي</th>
                  {reportType !== 'unpaid-any-previous' && reportType !== 'paid-all-previous' && (
                    <th>تاريخ الدفع</th>
                  )}
                  <th>الحالة</th>
                  {includeNotes && (
                    <th>الملاحظات</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {fee.traineePayments.map((payment: any, index) => {
                  // لتقرير المسددين لكل الرسوم - عرض متدرب واحد مع جميع رسومه المدفوعة
                  if (reportType === 'paid-all-previous') {
                    const paidFees = payment.paidFees || [];
                    const totalAmount = payment.amount || 0;
                    const totalPaid = payment.paidAmount || 0;
                    
                    return (
                      <tr key={`${payment.id}-${index}`}>
                        <td style={{verticalAlign: 'top'}}>
                          <strong>{payment.trainee?.nameAr}</strong>
                          <br />
                          <span style={{fontSize: '10px', color: '#059669'}}>
                            ✅ ({paidFees.length} {paidFees.length === 1 ? 'رسم' : 'رسوم'} مسددة بالكامل)
                          </span>
                        </td>
                        <td style={{verticalAlign: 'top'}}>{payment.trainee?.phone || '-'}</td>
                        <td style={{verticalAlign: 'top'}}>{payment.trainee?.guardianPhone || '-'}</td>
                        <td style={{verticalAlign: 'top', textAlign: 'center'}}>
                          <div style={{
                            fontWeight: 'bold',
                            color: '#059669',
                            fontSize: '12px'
                          }}>
                            {formatCurrency(
                              paidFees.reduce((sum: number, f: any) => sum + (f.paidAmount || 0), 0),
                              fee.safe?.currency || 'EGP'
                            )}
                          </div>
                          <div style={{fontSize: '9px', color: '#065f46', marginTop: '2px'}}>
                            ({paidFees.length} رسم)
                          </div>
                        </td>
                        <td style={{verticalAlign: 'top', fontWeight: 'bold'}}>
                          {formatCurrency(totalAmount, fee.safe?.currency || 'EGP')}
                        </td>
                        <td style={{verticalAlign: 'top', fontWeight: 'bold', color: '#059669'}}>
                          {formatCurrency(totalPaid, fee.safe?.currency || 'EGP')}
                        </td>
                        <td style={{verticalAlign: 'top', fontWeight: 'bold', color: '#059669', fontSize: '14px'}}>
                          0.00 {fee.safe?.currency || 'EGP'}
                        </td>
                        <td style={{verticalAlign: 'top'}}>
                          <span className="status-badge status-paid">
                            ✓ مسدد بالكامل
                          </span>
                        </td>
                        {includeNotes && (
                          <td style={{verticalAlign: 'top', fontSize: '10px'}}>
                            {payment.trainee?.traineeNotes && payment.trainee.traineeNotes.length > 0 ? (
                              <div style={{maxWidth: '200px'}}>
                                {payment.trainee.traineeNotes.map((note: any, noteIndex: number) => (
                                  <div key={noteIndex} style={{
                                    marginBottom: '8px',
                                    paddingBottom: '8px',
                                    borderBottom: noteIndex < payment.trainee.traineeNotes.length - 1 ? '1px dashed #ddd' : 'none'
                                  }}>
                                    <div style={{fontWeight: 'bold', color: '#0A2647', marginBottom: '2px'}}>
                                      {note.user?.name || 'مستخدم'}
                                    </div>
                                    <div style={{color: '#666', marginBottom: '2px'}}>
                                      {note.content}
                                    </div>
                                    <div style={{fontSize: '9px', color: '#999'}}>
                                      {new Date(note.createdAt).toLocaleDateString('ar-EG')}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span style={{color: '#999'}}>لا توجد ملاحظات</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  }
                  
                  // لتقرير الغير مسددين - عرض متدرب واحد مع جميع رسومه
                  if (reportType === 'unpaid-any-previous') {
                    const unpaidFees = payment.unpaidFees || [];
                    const totalAmount = payment.amount || 0;
                    const totalPaid = payment.paidAmount || 0;
                    const totalRemaining = payment.remainingAmount || 0;
                    
                    return (
                      <tr key={`${payment.id}-${index}`}>
                        <td style={{verticalAlign: 'top'}}>
                          <strong>{payment.trainee?.nameAr}</strong>
                          <br />
                          <span style={{fontSize: '10px', color: '#f59e0b'}}>
                            ({unpaidFees.length} {unpaidFees.length === 1 ? 'رسم' : 'رسوم'} غير مسددة)
                          </span>
                        </td>
                        <td style={{verticalAlign: 'top'}}>{payment.trainee?.phone || '-'}</td>
                        <td style={{verticalAlign: 'top'}}>{payment.trainee?.guardianPhone || '-'}</td>
                        <td style={{verticalAlign: 'top', textAlign: 'center'}}>
                          <div style={{
                            fontWeight: 'bold',
                            color: '#dc2626',
                            fontSize: '12px'
                          }}>
                            {formatCurrency(
                              unpaidFees.reduce((sum: number, f: any) => sum + (f.remainingAmount || 0), 0),
                              fee.safe?.currency || 'EGP'
                            )}
                          </div>
                          <div style={{fontSize: '9px', color: '#991b1b', marginTop: '2px'}}>
                            ({unpaidFees.length} رسم)
                          </div>
                        </td>
                        <td style={{verticalAlign: 'top', fontWeight: 'bold'}}>
                          {formatCurrency(totalAmount, fee.safe?.currency || 'EGP')}
                        </td>
                        <td style={{verticalAlign: 'top', fontWeight: 'bold', color: '#059669'}}>
                          {formatCurrency(totalPaid, fee.safe?.currency || 'EGP')}
                        </td>
                        <td style={{verticalAlign: 'top', fontWeight: 'bold', color: '#dc2626', fontSize: '14px'}}>
                          {formatCurrency(totalRemaining, fee.safe?.currency || 'EGP')}
                        </td>
                        <td style={{verticalAlign: 'top'}}>
                          <span className="status-badge" style={{
                            background: '#fed7aa',
                            color: '#9a3412',
                            border: '1px solid #fdba74'
                          }}>
                            {unpaidFees.length} رسوم معلقة
                          </span>
                        </td>
                        {includeNotes && (
                          <td style={{verticalAlign: 'top', fontSize: '10px'}}>
                            {payment.trainee?.traineeNotes && payment.trainee.traineeNotes.length > 0 ? (
                              <div style={{maxWidth: '200px'}}>
                                {payment.trainee.traineeNotes.map((note: any, noteIndex: number) => (
                                  <div key={noteIndex} style={{
                                    marginBottom: '8px',
                                    paddingBottom: '8px',
                                    borderBottom: noteIndex < payment.trainee.traineeNotes.length - 1 ? '1px dashed #ddd' : 'none'
                                  }}>
                                    <div style={{fontWeight: 'bold', color: '#0A2647', marginBottom: '2px'}}>
                                      {note.user?.name || 'مستخدم'}
                                    </div>
                                    <div style={{color: '#666', marginBottom: '2px'}}>
                                      {note.content}
                                    </div>
                                    <div style={{fontSize: '9px', color: '#999'}}>
                                      {new Date(note.createdAt).toLocaleDateString('ar-EG')}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span style={{color: '#999'}}>لا توجد ملاحظات</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  }
                  
                  // للتقرير العادي
                  const paymentAmount = fee.amount;
                  const remainingAmount = paymentAmount - payment.paidAmount;
                  
                  return (
                    <tr key={payment.id}>
                      <td>{payment.trainee?.nameAr}</td>
                      <td>{payment.trainee?.phone || '-'}</td>
                      <td>{payment.trainee?.guardianPhone || '-'}</td>
                      <td>{formatCurrency(paymentAmount, fee.safe?.currency || 'EGP')}</td>
                      <td style={{color: '#059669'}}>{formatCurrency(payment.paidAmount, fee.safe?.currency || 'EGP')}</td>
                      <td style={{color: '#dc2626'}}>{formatCurrency(remainingAmount, fee.safe?.currency || 'EGP')}</td>
                      <td>{payment.paidAt ? formatDate(payment.paidAt) : '-'}</td>
                      <td>
                        <span className={`status-badge ${
                          payment.status === PaymentStatus.PAID ? 'status-paid' :
                          payment.status === PaymentStatus.PARTIALLY_PAID ? 'status-partial' : 'status-pending'
                        }`}>
                          {getPaymentStatusText(payment.status)}
                        </span>
                      </td>
                      {includeNotes && (
                        <td style={{verticalAlign: 'top', fontSize: '10px'}}>
                          {payment.trainee?.traineeNotes && payment.trainee.traineeNotes.length > 0 ? (
                            <div style={{maxWidth: '200px'}}>
                              {payment.trainee.traineeNotes.map((note: any, noteIndex: number) => (
                                <div key={noteIndex} style={{
                                  marginBottom: '8px',
                                  paddingBottom: '8px',
                                  borderBottom: noteIndex < payment.trainee.traineeNotes.length - 1 ? '1px dashed #ddd' : 'none'
                                }}>
                                  <div style={{fontWeight: 'bold', color: '#0A2647', marginBottom: '2px'}}>
                                    {note.user?.name || 'مستخدم'}
                                  </div>
                                  <div style={{color: '#666', marginBottom: '2px'}}>
                                    {note.content}
                                  </div>
                                  <div style={{fontSize: '9px', color: '#999'}}>
                                    {new Date(note.createdAt).toLocaleDateString('ar-EG')}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span style={{color: '#999'}}>لا توجد ملاحظات</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* تذييل التقرير */}
        <div className="footer">
          <div style={{borderTop: '1px solid #ccc', paddingTop: '15px'}}>
            <p style={{margin: '5px 0', fontWeight: 'bold'}}>
              {settings && settings.centerName && settings.centerName.trim() !== '' 
                ? settings.centerName 
                : 'مركز طيبة للتدريب المهني'}
            </p>
            <p style={{margin: '5px 0'}}>نظام إدارة الرسوم والمدفوعات</p>
            <p style={{margin: '5px 0'}}>تم إنشاء هذا التقرير بتاريخ: {new Date().toLocaleDateString('ar-EG')} - الساعة: {new Date().toLocaleTimeString('ar-EG')}</p>
            <p style={{margin: '10px 0 0 0', fontSize: '10px'}}>هذا التقرير سري ومخصص للاستخدام الداخلي فقط</p>
          </div>
        </div>
      </div>
    </div>
  );
}
