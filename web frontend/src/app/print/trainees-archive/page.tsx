'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { getDetailedDocumentsReport } from '@/app/lib/api/trainee-documents';
import { getAllPrograms } from '@/app/lib/api/programs';
import { fetchAPI, getImageUrl } from '@/lib/api';

interface DocumentStatus {
  nameAr: string;
  isUploaded: boolean;
  isVerified: boolean;
  uploadedAt: string | null;
}

interface TraineeStats {
  traineeId: number;
  traineeName: string;
  programName: string;
  documentStatuses: {
    [key: string]: DocumentStatus;
  };
  totalDocuments: number;
  requiredDocuments: number;
  verifiedDocuments: number;
  completionPercentage: number;
  isComplete: boolean;
}

interface DetailedDocumentsReport {
  overallStats: {
    totalTrainees: number;
    completeTrainees: number;
    incompleteTrainees: number;
    averageCompletion: number;
  };
  traineeStats: TraineeStats[];
  requiredDocumentTypes: string[];
}

export default function TraineesArchivePrintPage() {
  const searchParams = useSearchParams();
  const programId = searchParams.get('programId');
  const completionStatus = searchParams.get('completionStatus');
  const searchQuery = searchParams.get('search');
  
  const [stats, setStats] = useState<DetailedDocumentsReport | null>(null);
  const [programs, setPrograms] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [programsData, settingsData] = await Promise.all([
        getAllPrograms(),
        fetchAPI('/settings')
      ]);
      setPrograms(programsData || []);
      setSettings(settingsData);
      
      const filters: any = {
        limit: 10000
      };
      
      if (programId) filters.programId = parseInt(programId);
      if (completionStatus) filters.completionStatus = completionStatus;
      if (searchQuery) filters.search = searchQuery;
      
      const data = await getDetailedDocumentsReport(filters);
      setStats(data);
    } catch (error) {
      console.error('خطأ في جلب بيانات التقرير:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && stats && stats.traineeStats.length > 0) {
      setTimeout(() => {
        window.print();
      }, 1000);
    }
  }, [loading, stats]);

  const handlePrint = () => {
    window.print();
  };

  const formatDate = () => {
    return new Date().toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProgramName = () => {
    if (!programId) return 'جميع البرامج';
    const program = programs.find(p => p.id === parseInt(programId));
    return program ? program.nameAr : 'البرنامج المحدد';
  };

  const getCompletionStatusLabel = () => {
    if (!completionStatus) return 'جميع الحالات';
    switch (completionStatus) {
      case 'complete': return 'مكتمل (100%)';
      case 'high': return 'ممتاز (80%+)';
      case 'medium': return 'متوسط (50-79%)';
      case 'low': return 'ضعيف (<50%)';
      case 'incomplete': return 'غير مكتمل';
      default: return 'جميع الحالات';
    }
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

  if (!stats) {
    return (
      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh'}}>
        <p style={{color: '#666'}}>لا توجد بيانات متاحة</p>
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
            size: A4 landscape;
            margin: 0.5cm;
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
          .data-table { font-size: 9px !important; }
          .data-table th, .data-table td { padding: 3px 2px !important; font-size: 9px !important; }
          .data-table th { font-size: 8px !important; }
          .filter-info { padding: 6px !important; margin-bottom: 8px !important; }
          .legend-section { padding: 6px !important; margin-bottom: 8px !important; }

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

        .filter-info {
          background: #f0f4f8;
          border: 1px solid #d0d8e0;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 20px;
        }

        .filter-info-title {
          font-weight: bold;
          color: #0A2647;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .filter-info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          font-size: 13px;
        }

        .filter-info-grid .label { font-weight: 600; color: #0A2647; }
        .filter-info-grid .value { color: #444; }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
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
          font-size: 11px;
          text-align: center;
        }
        
        .data-table tr:nth-child(even) { background: #fafafa; }

        .doc-status { display: flex; flex-direction: column; align-items: center; gap: 2px; }
        .doc-verified { color: #059669; font-weight: 600; font-size: 11px; }
        .doc-uploaded { color: #0A2647; font-weight: 600; font-size: 11px; }
        .doc-missing { color: #dc2626; font-weight: 600; font-size: 11px; }

        .completion-bar {
          width: 60px;
          height: 6px;
          background: #e5e7eb;
          border-radius: 3px;
          overflow: hidden;
          margin: 0 auto 4px;
        }

        .completion-fill { height: 100%; border-radius: 3px; }
        .completion-fill.high { background: #059669; }
        .completion-fill.medium { background: #f59e0b; }
        .completion-fill.low { background: #dc2626; }

        .status-badge {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: bold;
          border: 1px solid;
        }

        .status-complete { background: #d1fae5; color: #065f46; border-color: #a7f3d0; }
        .status-excellent { background: #dbeafe; color: #1e40af; border-color: #bfdbfe; }
        .status-medium { background: #fef3c7; color: #92400e; border-color: #fde68a; }
        .status-weak { background: #fee2e2; color: #991b1b; border-color: #fecaca; }

        .legend-section {
          background: #f9f9f9;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 12px 16px;
          margin: 20px 0;
        }

        .legend-title { font-weight: bold; color: #0A2647; margin-bottom: 10px; font-size: 14px; }

        .legend-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          font-size: 12px;
        }

        .legend-item { display: flex; align-items: center; gap: 6px; }

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
          <h2 className="subtitle">تقرير أرشيف المتدربين - تفصيلي</h2>
          <div className="date">
            تاريخ إصدار التقرير: {new Date().toLocaleDateString('ar-EG', { 
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
            })}
          </div>
        </div>

        {/* معلومات الفلاتر */}
        {(programId || completionStatus || searchQuery) && (
          <div className="filter-info">
            <div className="filter-info-title">الفلاتر المطبقة:</div>
            <div className="filter-info-grid">
              <div>
                <span className="label">البرنامج: </span>
                <span className="value">{getProgramName()}</span>
              </div>
              <div>
                <span className="label">حالة الإكمال: </span>
                <span className="value">{getCompletionStatusLabel()}</span>
              </div>
              {searchQuery && (
                <div>
                  <span className="label">البحث: </span>
                  <span className="value">{searchQuery}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* الإحصائيات */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.overallStats.totalTrainees}</div>
            <div className="stat-label">إجمالي المتدربين</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.overallStats.completeTrainees}</div>
            <div className="stat-label">مكتملة الوثائق</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.overallStats.incompleteTrainees}</div>
            <div className="stat-label">ناقصة الوثائق</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.overallStats.averageCompletion}%</div>
            <div className="stat-label">متوسط الإكمال</div>
          </div>
        </div>

        {/* جدول المتدربين */}
        <div className="section">
          <h3 className="section-title">تفاصيل وثائق المتدربين ({stats.traineeStats.length})</h3>
          
          {stats.traineeStats.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th rowSpan={2}>#</th>
                  <th rowSpan={2}>اسم المتدرب</th>
                  <th rowSpan={2}>البرنامج</th>
                  <th colSpan={4}>حالة الوثائق الأساسية</th>
                  <th rowSpan={2}>نسبة الإكمال</th>
                  <th rowSpan={2}>الحالة</th>
                </tr>
                <tr>
                  <th>الصورة الشخصية</th>
                  <th>البطاقة (وجه)</th>
                  <th>البطاقة (ظهر)</th>
                  <th>المؤهل (وجه)</th>
                </tr>
              </thead>
              <tbody>
                {stats.traineeStats.map((trainee, index) => {
                  const docKeys = Object.keys(trainee.documentStatuses);
                  return (
                    <tr key={trainee.traineeId}>
                      <td style={{textAlign: 'center'}}>{index + 1}</td>
                      <td style={{fontWeight: 500}}>{trainee.traineeName}</td>
                      <td>{trainee.programName}</td>
                      {docKeys.map((docKey) => {
                        const doc = trainee.documentStatuses[docKey];
                        return (
                          <td key={docKey} style={{textAlign: 'center'}}>
                            <div className="doc-status">
                              {doc.isUploaded ? (
                                doc.isVerified ? (
                                  <span className="doc-verified">✓ محقق</span>
                                ) : (
                                  <span className="doc-uploaded">● مرفوع</span>
                                )
                              ) : (
                                <span className="doc-missing">✗ ناقص</span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      <td style={{textAlign: 'center'}}>
                        <div className="completion-bar">
                          <div 
                            className={`completion-fill ${
                              trainee.completionPercentage >= 80 ? 'high' :
                              trainee.completionPercentage >= 50 ? 'medium' : 'low'
                            }`}
                            style={{ width: `${trainee.completionPercentage}%` }}
                          ></div>
                        </div>
                        <span style={{fontWeight: 600, fontSize: 11}}>{trainee.completionPercentage}%</span>
                      </td>
                      <td style={{textAlign: 'center'}}>
                        {trainee.isComplete ? (
                          <span className="status-badge status-complete">مكتمل</span>
                        ) : trainee.completionPercentage >= 80 ? (
                          <span className="status-badge status-excellent">ممتاز</span>
                        ) : trainee.completionPercentage >= 50 ? (
                          <span className="status-badge status-medium">متوسط</span>
                        ) : (
                          <span className="status-badge status-weak">ضعيف</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{textAlign: 'center', padding: 30, background: '#f9f9f9', borderRadius: 8, border: '1px solid #ddd'}}>
              <p style={{color: '#666'}}>لا توجد بيانات متدربين تطابق الفلاتر المحددة</p>
            </div>
          )}
        </div>

        {/* مفتاح الرموز */}
        <div className="legend-section">
          <div className="legend-title">مفتاح الرموز:</div>
          <div className="legend-grid">
            <div className="legend-item">
              <span className="doc-verified">✓ محقق</span>
              <span style={{color: '#555'}}>الوثيقة مرفوعة ومحققة</span>
            </div>
            <div className="legend-item">
              <span className="doc-uploaded">● مرفوع</span>
              <span style={{color: '#555'}}>الوثيقة مرفوعة وفي انتظار التحقق</span>
            </div>
            <div className="legend-item">
              <span className="doc-missing">✗ ناقص</span>
              <span style={{color: '#555'}}>الوثيقة لم يتم رفعها</span>
            </div>
          </div>
        </div>

        {/* تذييل التقرير */}
        <div className="footer">
          <p style={{margin: '5px 0', fontWeight: 'bold'}}>{settings?.centerName || settings?.systemName || 'مركز التدريب المهني'}</p>
          <p style={{margin: '5px 0'}}>تقرير أرشيف المتدربين التفصيلي</p>
          <p style={{margin: '5px 0'}}>تم إنشاء التقرير تلقائياً في: {formatDate()}</p>
        </div>
      </div>
    </div>
  );
}
