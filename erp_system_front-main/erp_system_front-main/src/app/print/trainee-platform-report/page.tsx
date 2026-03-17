'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchAPI, getImageUrl } from '@/lib/api';

interface Trainee {
  id: number;
  nameAr: string;
  nameEn: string;
  nationalId: string;
  phone: string;
  email: string | null;
  program: {
    id: number;
    nameAr: string;
  };
  createdAt: string;
}

interface TraineeAccount {
  id: string;
  traineeId: number;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export default function TraineePlatformReportPage() {
  const searchParams = useSearchParams();
  const reportType = (searchParams.get('type') || 'all') as 'all' | 'registered' | 'unregistered';
  
  const [allTrainees, setAllTrainees] = useState<Trainee[]>([]);
  const [accounts, setAccounts] = useState<TraineeAccount[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [traineesResponse, accountsResponse, settingsData] = await Promise.all([
        fetchAPI('/trainees?limit=10000'),
        fetchAPI('/trainee-platform/accounts?limit=10000'),
        fetchAPI('/settings')
      ]);
      
      const traineesData = traineesResponse.data || traineesResponse || [];
      const accountsData = accountsResponse.data || accountsResponse || [];
      
      setAllTrainees(traineesData);
      setAccounts(accountsData);
      setSettings(settingsData);
    } catch (error) {
      console.error('❌ Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && allTrainees.length > 0) {
      setTimeout(() => {
        window.print();
      }, 1000);
    }
  }, [loading, allTrainees]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh'}}>
        <div style={{textAlign: 'center'}}>
          <div style={{width: 48, height: 48, border: '3px solid #f3f3f3', borderTop: '3px solid #0A2647', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px'}}></div>
          <p style={{color: '#666'}}>جاري تحميل التقرير...</p>
        </div>
      </div>
    );
  }

  const registeredTrainees = allTrainees.filter(trainee => 
    accounts.some(account => account.traineeId === trainee.id)
  );

  const unregisteredTrainees = allTrainees.filter(trainee => 
    !accounts.some(account => account.traineeId === trainee.id)
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getAccountInfo = (traineeId: number) => {
    return accounts.find(account => account.traineeId === traineeId);
  };

  const getReportTitle = () => {
    if (reportType === 'all') return 'تقرير حسابات منصة المتدربين - الكل';
    if (reportType === 'registered') return 'تقرير المتدربين المسجلين في المنصة';
    return 'تقرير المتدربين غير المسجلين في المنصة';
  };

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
            size: A4 landscape;
            margin: 1cm;
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
          .page-break { page-break-before: always; }

          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
        }
        
        .print-container {
          max-width: 297mm;
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

        .status-badge {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: bold;
          border: 1px solid;
        }

        .status-active { background: #d1fae5; color: #065f46; border-color: #a7f3d0; }
        .status-inactive { background: #fee2e2; color: #991b1b; border-color: #fecaca; }

        .empty-state {
          text-align: center;
          padding: 30px;
          background: #f9f9f9;
          border-radius: 8px;
          border: 1px solid #ddd;
          color: #666;
        }

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
            تاريخ إصدار التقرير: {new Date().toLocaleDateString('ar-EG', { 
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
            })}
          </div>
        </div>

        {/* الإحصائيات */}
        {reportType === 'all' && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{allTrainees.length}</div>
              <div className="stat-label">إجمالي المتدربين</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{registeredTrainees.length}</div>
              <div className="stat-label">المسجلين في المنصة</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{unregisteredTrainees.length}</div>
              <div className="stat-label">غير المسجلين</div>
            </div>
          </div>
        )}

        {reportType === 'registered' && (
          <div className="stats-grid" style={{gridTemplateColumns: '1fr'}}>
            <div className="stat-card">
              <div className="stat-value">{registeredTrainees.length}</div>
              <div className="stat-label">عدد المتدربين المسجلين في المنصة</div>
            </div>
          </div>
        )}

        {reportType === 'unregistered' && (
          <div className="stats-grid" style={{gridTemplateColumns: '1fr'}}>
            <div className="stat-card">
              <div className="stat-value">{unregisteredTrainees.length}</div>
              <div className="stat-label">عدد المتدربين غير المسجلين في المنصة</div>
            </div>
          </div>
        )}

        {/* المتدربين المسجلين */}
        {(reportType === 'all' || reportType === 'registered') && (
          <div className="section">
            <h3 className="section-title">
              المتدربين المسجلين في المنصة ({registeredTrainees.length})
            </h3>
          
            {registeredTrainees.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>الاسم</th>
                    <th>الرقم القومي</th>
                    <th>رقم الهاتف</th>
                    <th>البرنامج</th>
                    <th>تاريخ التسجيل</th>
                    <th>آخر دخول</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {registeredTrainees.map((trainee, index) => {
                    const account = getAccountInfo(trainee.id);
                    return (
                      <tr key={trainee.id}>
                        <td style={{textAlign: 'center'}}>{index + 1}</td>
                        <td style={{fontWeight: 500}}>{trainee.nameAr}</td>
                        <td style={{textAlign: 'center'}}>{trainee.nationalId}</td>
                        <td style={{textAlign: 'center'}}>{trainee.phone}</td>
                        <td>{trainee.program.nameAr}</td>
                        <td style={{textAlign: 'center'}}>{account ? formatDate(account.createdAt) : '-'}</td>
                        <td style={{textAlign: 'center'}}>{account?.lastLoginAt ? formatDate(account.lastLoginAt) : 'لم يسجل دخول'}</td>
                        <td style={{textAlign: 'center'}}>
                          <span className={`status-badge ${account?.isActive ? 'status-active' : 'status-inactive'}`}>
                            {account?.isActive ? 'مفعل' : 'معطل'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <p>لا يوجد متدربين مسجلين في المنصة</p>
              </div>
            )}
          </div>
        )}

        {/* فاصل للصفحة */}
        {reportType === 'all' && <div className="page-break"></div>}

        {/* المتدربين غير المسجلين */}
        {(reportType === 'all' || reportType === 'unregistered') && (
          <div className="section">
            <h3 className="section-title">
              المتدربين غير المسجلين في المنصة ({unregisteredTrainees.length})
            </h3>
          
            {unregisteredTrainees.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>الاسم</th>
                    <th>الرقم القومي</th>
                    <th>رقم الهاتف</th>
                    <th>البرنامج</th>
                  </tr>
                </thead>
                <tbody>
                  {unregisteredTrainees.map((trainee, index) => (
                    <tr key={trainee.id}>
                      <td style={{textAlign: 'center'}}>{index + 1}</td>
                      <td style={{fontWeight: 500}}>{trainee.nameAr}</td>
                      <td style={{textAlign: 'center'}}>{trainee.nationalId}</td>
                      <td style={{textAlign: 'center'}}>{trainee.phone}</td>
                      <td>{trainee.program.nameAr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <p>جميع المتدربين مسجلين في المنصة</p>
              </div>
            )}
          </div>
        )}

        {/* تذييل التقرير */}
        <div className="footer">
          <p style={{margin: '5px 0', fontWeight: 'bold'}}>{settings?.centerName || settings?.systemName || 'مركز التدريب المهني'}</p>
          <p style={{margin: '5px 0'}}>تقرير حسابات منصة المتدربين</p>
          <p style={{margin: '5px 0'}}>تم إنشاء التقرير تلقائياً في: {new Date().toLocaleString('ar-EG')}</p>
        </div>
      </div>
    </div>
  );
}
