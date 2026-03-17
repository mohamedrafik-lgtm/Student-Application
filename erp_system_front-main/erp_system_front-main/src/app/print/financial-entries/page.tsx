'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchAPI, getImageUrl } from '@/lib/api';

interface Safe {
  id: string;
  name: string;
  type?: 'DEBT' | 'INCOME' | 'EXPENSE' | 'ASSET';
  category?: 'DEBT' | 'INCOME' | 'EXPENSE' | 'ASSET';
  balance: number;
  description?: string;
}

interface FinancialEntry {
  id: number;
  amount: number;
  description: string;
  fromSafeId: number;
  toSafeId: number;
  fromSafe: Safe;
  toSafe: Safe;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
  };
  type: 'TRANSFER';
}

const SAFE_TYPE_LABELS = {
  DEBT: 'خزينة الديون',
  INCOME: 'خزينة الدخل',
  EXPENSE: 'خزينة المصروفات',
  ASSET: 'خزينة الأصول'
};

export default function PrintFinancialEntriesPage() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      let apiUrl = '/finances/entries?limit=1000';
      
      if (type === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        apiUrl += `&dateFrom=${today.toISOString()}&dateTo=${tomorrow.toISOString()}`;
      } else if (type === 'custom' && dateFrom && dateTo) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        apiUrl += `&dateFrom=${from.toISOString()}&dateTo=${to.toISOString()}`;
      }

      const [entriesResponse, settingsResponse] = await Promise.all([
        fetchAPI(apiUrl),
        fetchAPI('/settings')
      ]);

      if (entriesResponse.success && entriesResponse.data) {
        setEntries(entriesResponse.data);
      }
      
      setSettings(settingsResponse);
    } catch (error) {
      console.error('خطأ في جلب البيانات:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [type, dateFrom, dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isLoading && entries.length > 0) {
      setTimeout(() => {
        window.print();
      }, 1000);
    }
  }, [isLoading, entries]);

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('ar-EG') + ' جنيه';
  };

  const calculateStats = () => {
    const totalAmount = entries.reduce((sum, entry) => sum + entry.amount, 0);
    const totalEntries = entries.length;
    return {
      totalAmount,
      totalEntries,
      averageAmount: totalEntries > 0 ? totalAmount / totalEntries : 0,
    };
  };

  const stats = calculateStats();

  const getReportTitle = () => {
    if (type === 'today') {
      return `تقرير قيود اليوم - ${new Date().toLocaleDateString('ar-EG')}`;
    } else if (type === 'custom' && dateFrom && dateTo) {
      return `تقرير القيود المالية من ${new Date(dateFrom).toLocaleDateString('ar-EG')} إلى ${new Date(dateTo).toLocaleDateString('ar-EG')}`;
    }
    return 'تقرير القيود المالية';
  };

  if (isLoading) {
    return (
      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh'}}>
        <div style={{textAlign: 'center'}}>
          <div style={{width: 48, height: 48, border: '3px solid #f3f3f3', borderTop: '3px solid #0A2647', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px'}}></div>
          <p style={{color: '#666'}}>جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{margin: 0, padding: 0}} dir="rtl">
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        * { box-sizing: border-box; }

        html, body {
          margin: 0 !important;
          padding: 0 !important;
          font-family: 'Cairo', 'Arial', sans-serif;
          direction: rtl;
          background: white;
        }

        @media print {
          body {
            font-family: 'Cairo', 'Arial', sans-serif !important;
            direction: rtl !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .no-print, .print-button { display: none !important; }
          
          @page {
            size: A4;
            margin: 10mm;
          }
          
          .print-container { padding: 5px !important; }
          .header { padding-bottom: 8px !important; margin-bottom: 10px !important; }
          .logo { width: 50px !important; height: 50px !important; margin: 0 auto 5px !important; }
          .title { font-size: 18px !important; margin: 5px 0 !important; }
          .subtitle { font-size: 14px !important; margin: 3px 0 !important; }
          .date { font-size: 11px !important; margin-top: 5px !important; }
          .section { margin: 8px 0 !important; }
          .section-title { font-size: 14px !important; margin-bottom: 6px !important; padding-bottom: 3px !important; }
          .stats-grid { gap: 6px !important; margin-bottom: 8px !important; }
          .stat-card { padding: 6px !important; }
          .stat-value { font-size: 18px !important; }
          .stat-label { font-size: 9px !important; }
          .data-table { font-size: 10px !important; }
          .data-table th, .data-table td { padding: 4px 3px !important; }

          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
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
          width: 80px;
          height: 80px;
          margin: 0 auto 15px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: #f0f0f0;
        }
        
        .logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        
        .title {
          font-size: 28px;
          font-weight: bold;
          color: #0A2647;
          margin: 15px 0;
        }
        
        .subtitle {
          font-size: 18px;
          color: #666;
          margin: 10px 0;
        }
        
        .date {
          font-size: 14px;
          color: #888;
          margin-top: 15px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-bottom: 25px;
        }

        .stat-card {
          text-align: center;
          padding: 15px;
          background: #f9f9f9;
          border: 1px solid #ddd;
          border-radius: 8px;
          border-top: 3px solid #0A2647;
        }

        .stat-value {
          font-size: 28px;
          font-weight: bold;
          color: #0A2647;
          margin-bottom: 4px;
        }

        .stat-label { font-size: 12px; color: #666; }

        .section { margin: 25px 0; }
        
        .section-title {
          font-size: 18px;
          font-weight: bold;
          color: #0A2647;
          margin-bottom: 15px;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
        }
        
        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          font-size: 12px;
        }
        
        .data-table th, .data-table td {
          border: 1px solid #ddd;
          padding: 8px 6px;
          text-align: right;
        }
        
        .data-table th {
          background: #0A2647;
          color: white;
          font-weight: bold;
          font-size: 12px;
        }
        
        .data-table tr:nth-child(even) { background: #fafafa; }

        .data-table tfoot tr {
          background: #f8f9fa !important;
          border-top: 2px solid #0A2647;
        }

        .data-table tfoot td {
          font-weight: bold !important;
        }

        .safe-name { font-weight: 500; }
        .safe-type { font-size: 10px; color: #888; }
        .amount-cell { font-weight: bold; color: #059669; }

        .footer {
          text-align: center;
          border-top: 2px solid #ddd;
          padding-top: 15px;
          margin-top: 40px;
          font-size: 11px;
          color: #666;
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
      `}</style>

      {/* زر الطباعة */}
      <button onClick={handlePrint} className="print-button">
        <svg style={{width: 20, height: 20}} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
            {settings?.centerLogo || settings?.logoUrl ? (
              <img 
                src={getImageUrl(settings.centerLogo || settings.logoUrl)} 
                alt="شعار المركز"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) parent.innerHTML = '🏛️';
                }}
              />
            ) : (
              <span style={{fontSize: 40}}>🏛️</span>
            )}
          </div>
          <h1 className="title">
            {settings?.centerName || settings?.systemName || 'مركز التدريب المهني'}
          </h1>
          <h2 className="subtitle">{getReportTitle()}</h2>
          <div className="date">
            تاريخ الطباعة: {new Date().toLocaleString('ar-EG')}
          </div>
        </div>

        {/* الإحصائيات */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.totalEntries}</div>
            <div className="stat-label">إجمالي القيود</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatCurrency(stats.totalAmount)}</div>
            <div className="stat-label">إجمالي المبالغ</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatCurrency(stats.averageAmount)}</div>
            <div className="stat-label">متوسط القيد</div>
          </div>
        </div>

        {/* جدول القيود */}
        {entries.length === 0 ? (
          <div style={{textAlign: 'center', padding: 40, background: '#f9f9f9', borderRadius: 8, border: '1px solid #ddd'}}>
            <p style={{color: '#666', fontSize: 16}}>لا توجد قيود في الفترة المحددة</p>
          </div>
        ) : (
          <div className="section">
            <h3 className="section-title">تفاصيل القيود المالية</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>من خزينة</th>
                  <th>إلى خزينة</th>
                  <th>المبلغ</th>
                  <th>الوصف</th>
                  <th>التاريخ</th>
                  <th>المستخدم</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => (
                  <tr key={entry.id}>
                    <td style={{textAlign: 'center'}}>{index + 1}</td>
                    <td>
                      <div className="safe-name">{entry.fromSafe?.name}</div>
                      <div className="safe-type">
                        {SAFE_TYPE_LABELS[(entry.fromSafe?.type || entry.fromSafe?.category) as keyof typeof SAFE_TYPE_LABELS] || 'غير محدد'}
                      </div>
                    </td>
                    <td>
                      <div className="safe-name">{entry.toSafe?.name}</div>
                      <div className="safe-type">
                        {SAFE_TYPE_LABELS[(entry.toSafe?.type || entry.toSafe?.category) as keyof typeof SAFE_TYPE_LABELS] || 'غير محدد'}
                      </div>
                    </td>
                    <td className="amount-cell">{formatCurrency(entry.amount)}</td>
                    <td>{entry.description}</td>
                    <td style={{fontSize: 11}}>{formatDate(entry.createdAt)}</td>
                    <td>{entry.createdBy?.name}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} style={{textAlign: 'left', fontWeight: 'bold'}}>الإجمالي</td>
                  <td className="amount-cell">{formatCurrency(stats.totalAmount)}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* تذييل التقرير */}
        <div className="footer">
          <p style={{margin: '5px 0', fontWeight: 'bold'}}>{settings?.centerName || settings?.systemName || 'مركز التدريب المهني'}</p>
          <p style={{margin: '5px 0'}}>نظام إدارة القيود المالية</p>
          <p style={{margin: '5px 0'}}>التاريخ: {new Date().toLocaleDateString('ar-EG')} - الوقت: {new Date().toLocaleTimeString('ar-EG')}</p>
        </div>
      </div>
    </div>
  );
}
