'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getTraineePaymentsByTraineeId } from '@/app/lib/api/finances';
import { getTraineeById } from '@/app/lib/api/trainees';
import { getSystemSettings } from '@/app/lib/api/settings';
import { formatCurrency, formatDate } from '@/app/lib/utils';
import { TraineePayment, PaymentStatus } from '@/app/types/finances';
import { Trainee } from '@/app/types/trainees';
import { getImageUrl } from '@/lib/api';

export default function PrintTraineePaymentsPage() {
  const params = useParams();
  const traineeId = Number(params.id);
  const [trainee, setTrainee] = useState<Trainee | null>(null);
  const [payments, setPayments] = useState<TraineePayment[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // جلب بيانات المتدرب ومدفوعاته وإعدادات النظام
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [traineeData, paymentsData, settingsData] = await Promise.all([
        getTraineeById(traineeId),
        getTraineePaymentsByTraineeId(traineeId),
        getSystemSettings(),
      ]);
      setTrainee(traineeData);
      setPayments(paymentsData);
      setSettings(settingsData);
      console.log('Settings loaded:', settingsData); // للتحقق من البيانات
    } catch (error) {
      console.error('خطأ في جلب البيانات:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // تحميل البيانات عند تحميل الصفحة
  useEffect(() => {
    if (traineeId) {
      fetchData();
    }
  }, [traineeId]);

  // طباعة تلقائية عند تحميل الصفحة
  useEffect(() => {
    if (!isLoading && trainee && payments.length > 0) {
      // انتظار قليل لضمان تحميل جميع البيانات
      setTimeout(() => {
        window.print();
      }, 1000);
    }
  }, [isLoading, trainee, payments]);

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

  // حساب إجمالي المبالغ
  const calculateTotals = () => {
    const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const totalPaid = payments.reduce((sum, payment) => sum + payment.paidAmount, 0);
    const totalRemaining = totalAmount - totalPaid;
    const paymentPercentage = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;

    return {
      totalAmount,
      totalPaid,
      totalRemaining,
      paymentPercentage,
    };
  };

  const totals = calculateTotals();

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
          .print-button { display: none !important; }
          
          /* إخفاء الملخص والإحصائيات في الطباعة */
          .summary-section { display: none !important; }
          .progress-section { display: none !important; }
          .footer { display: none !important; }
          
          /* إظهار فقط الاسم والرقم القومي والبرنامج التدريبي في معلومات المتدرب */
          .info-grid .info-item:not(.keep-in-print) { display: none !important; }
          .info-grid .info-item.keep-in-print { display: block !important; }
          
          @page {
            size: A4;
            margin: 10mm;  /* ← تقليل من 15mm */
          }
          
          /* تقليل مساحة الـ container */
          .print-container {
            padding: 5px !important;  /* ← تقليل من 20px */
          }
          
          /* تقليل مساحة Header */
          .header {
            padding-bottom: 8px !important;  /* ← تقليل من 20px */
            margin-bottom: 10px !important;  /* ← تقليل من 30px */
          }
          
          .logo {
            width: 50px !important;   /* ← تقليل من 100px */
            height: 50px !important;
            margin: 0 auto 5px !important;  /* ← تقليل من 15px */
          }
          
          .title {
            font-size: 18px !important;  /* ← تقليل من 28px */
            margin: 5px 0 !important;    /* ← تقليل من 15px */
          }
          
          .subtitle {
            font-size: 14px !important;  /* ← تقليل من 20px */
            margin: 3px 0 !important;    /* ← تقليل من 10px */
          }
          
          .date {
            font-size: 11px !important;  /* ← تقليل من 14px */
            margin-top: 5px !important;  /* ← تقليل من 15px */
          }
          
          /* تقليل مساحة الأقسام */
          .section {
            margin: 8px 0 !important;     /* ← تقليل من 25px */
            page-break-inside: auto !important;  /* ← السماح بالقطع */
          }
          
          .section-title {
            font-size: 14px !important;   /* ← تقليل من 18px */
            margin-bottom: 6px !important; /* ← تقليل من 15px */
            padding-bottom: 3px !important; /* ← تقليل من 5px */
          }
          
          /* تقليل مساحة Grid المعلومات */
          .info-grid {
            gap: 6px !important;          /* ← تقليل من 15px */
            margin: 6px 0 !important;     /* ← تقليل من 15px */
          }
          
          .info-item {
            padding: 5px !important;      /* ← تقليل من 10px */
          }
          
          .info-label {
            font-size: 10px !important;   /* ← تقليل من 12px */
            margin-bottom: 2px !important; /* ← تقليل من 5px */
          }
          
          .info-value {
            font-size: 11px !important;   /* ← تقليل من 14px */
          }
          
          /* تحسين عرض الجدول في الطباعة */
          .data-table {
            font-size: 9px !important;    /* ← تقليل من 10px */
            width: 100% !important;
            margin: 10px 0 !important;    /* ← تقليل من 20px */
          }
          
          .data-table th,
          .data-table td {
            padding: 3px 2px !important;  /* ← تقليل من 4px */
            font-size: 9px !important;
            line-height: 1.2 !important;
          }
          
          .data-table th {
            font-size: 10px !important;
          }
          
          /* تحسين عرض عمود التاريخ */
          .data-table th:nth-child(5),
          .data-table td:nth-child(5) {
            white-space: nowrap !important;
            min-width: 70px !important;   /* ← تقليل من 80px */
            font-size: 8px !important;
          }
          
          /* تحسين عرض صف الإجمالي في الطباعة */
          .data-table tbody tr:last-child {
            font-weight: bold !important;
            background-color: #f8f9fa !important;
            border-top: 2px solid #0A2647 !important;
          }
          
          .data-table tbody tr:last-child td {
            font-weight: bold !important;
            padding: 4px 2px !important;
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
          grid-template-columns: repeat(3, 1fr);
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
          font-size: 12px;
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
          <h2 className="subtitle">تقرير مدفوعات المتدرب</h2>
          <div className="date">
            تاريخ إصدار التقرير: {new Date().toLocaleDateString('ar-EG', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>

        {/* معلومات المتدرب */}
        <div className="section">
          <h3 className="section-title">معلومات المتدرب</h3>
          <div className="info-grid">
            <div className="info-item keep-in-print">
              <div className="info-label">اسم المتدرب</div>
              <div className="info-value">{trainee?.nameAr}</div>
            </div>
            <div className="info-item keep-in-print">
              <div className="info-label">الرقم القومي</div>
              <div className="info-value">{trainee?.nationalId}</div>
            </div>
            <div className="info-item">
              <div className="info-label">رقم الهاتف</div>
              <div className="info-value">{trainee?.phone || '-'}</div>
            </div>
            <div className="info-item keep-in-print">
              <div className="info-label">البرنامج التدريبي</div>
              <div className="info-value">{trainee?.program?.nameAr || '-'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">رقم هاتف ولي الأمر</div>
              <div className="info-value">{trainee?.guardianPhone || '-'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">حالة المتدرب</div>
              <div className="info-value">{trainee?.status || '-'}</div>
            </div>
          </div>
        </div>

        {/* ملخص المدفوعات */}
        <div className="section summary-section">
          <h3 className="section-title">ملخص المدفوعات</h3>
          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-value">{formatCurrency(totals.totalAmount, 'EGP')}</div>
              <div className="summary-label">إجمالي المبالغ</div>
            </div>
            <div className="summary-card">
              <div className="summary-value" style={{color: '#059669'}}>{formatCurrency(totals.totalPaid, 'EGP')}</div>
              <div className="summary-label">إجمالي المدفوعات</div>
            </div>
            <div className="summary-card">
              <div className="summary-value" style={{color: '#dc2626'}}>{formatCurrency(totals.totalRemaining, 'EGP')}</div>
              <div className="summary-label">المبالغ المتبقية</div>
            </div>
          </div>

          <div style={{textAlign: 'center', margin: '20px 0'}}>
            <div className="progress-section" style={{marginBottom: '10px'}}>
              <strong>نسبة الدفع: {totals.paymentPercentage.toFixed(1)}%</strong>
            </div>
            <div className="progress-bar progress-section">
              <div className="progress-fill" style={{width: `${totals.paymentPercentage}%`}}></div>
            </div>
          </div>
        </div>

        {/* جدول المدفوعات */}
        {payments && payments.length > 0 && (
          <div className="section">
            <h3 className="section-title">تفاصيل المدفوعات</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>اسم الرسوم</th>
                  <th>المبلغ الإجمالي</th>
                  <th>المبلغ المدفوع</th>
                  <th>المبلغ المتبقي</th>
                  <th>تاريخ الدفع</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment, index) => {
                  const remainingAmount = payment.amount - payment.paidAmount;
                  
                  // جلب جميع المعاملات (transactions) لهذا الدفع
                  const paymentTransactions = payment.transactions?.filter(t =>
                    t.type === 'PAYMENT' && t.amount > 0
                  ) || [];
                  
                  // إنشاء قائمة بتواريخ الدفع مع المبالغ
                  const paymentDates = paymentTransactions.map(transaction => ({
                    amount: transaction.amount,
                    date: formatDate(transaction.createdAt),
                    dateTime: transaction.createdAt
                  }));
                  
                  // ترتيب حسب التاريخ (الأقدم أولاً)
                  paymentDates.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
                  
                  return (
                    <tr key={payment.id}>
                      <td>{payment.fee?.name}</td>
                      <td>{formatCurrency(payment.amount, 'ج.م')}</td>
                      <td style={{color: '#059669'}}>{formatCurrency(payment.paidAmount, 'ج.م')}</td>
                      <td style={{color: '#dc2626'}}>{formatCurrency(remainingAmount, 'ج.م')}</td>
                      <td style={{fontSize: '10px', lineHeight: '1.4'}}>
                        {paymentDates.length > 0 ? (
                          <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                            {paymentDates.map((pd, idx) => (
                              <div key={idx} style={{borderBottom: idx < paymentDates.length - 1 ? '1px solid #e0e0e0' : 'none', paddingBottom: '3px'}}>
                                <span style={{color: '#059669', fontWeight: 'bold'}}>
                                  {formatCurrency(pd.amount, 'ج.م')}
                                </span>
                                {' - '}
                                <span>{pd.date}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          payment.paidAt ? formatDate(payment.paidAt) :
                          (payment.status === PaymentStatus.PENDING ? 'لم يدفع بعد' : '-')
                        )}
                      </td>
                      <td>
                        <span className={`status-badge ${
                          payment.status === PaymentStatus.PAID ? 'status-paid' :
                          payment.status === PaymentStatus.PARTIALLY_PAID ? 'status-partial' : 'status-pending'
                        }`}>
                          {getPaymentStatusText(payment.status)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {/* صف الإجمالي */}
                <tr style={{backgroundColor: '#f8f9fa', fontWeight: 'bold', borderTop: '2px solid #0A2647'}}>
                  <td style={{fontWeight: 'bold'}}>الإجمالي</td>
                  <td style={{fontWeight: 'bold', color: '#0A2647'}}>{formatCurrency(totals.totalAmount, 'ج.م')}</td>
                  <td style={{fontWeight: 'bold', color: '#059669'}}>{formatCurrency(totals.totalPaid, 'ج.م')}</td>
                  <td style={{fontWeight: 'bold', color: '#dc2626'}}>{formatCurrency(totals.totalRemaining, 'ج.م')}</td>
                  <td>-</td>
                  <td>-</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* تذييل التقرير */}
        <div className="footer">
          <div style={{borderTop: '1px solid #ccc', paddingTop: '15px'}}>
            <p style={{margin: '5px 0', fontWeight: 'bold'}}>مركز طيبة للتدريب المهني</p>
            <p style={{margin: '5px 0'}}>نظام إدارة المدفوعات</p>
            <p style={{margin: '5px 0'}}>تم إنشاء هذا التقرير بتاريخ: {new Date().toLocaleDateString('ar-EG')} - الساعة: {new Date().toLocaleTimeString('ar-EG')}</p>
            <p style={{margin: '10px 0 0 0', fontSize: '10px'}}>هذا التقرير سري ومخصص للاستخدام الداخلي فقط</p>
          </div>
        </div>
      </div>
    </div>
  );
}
