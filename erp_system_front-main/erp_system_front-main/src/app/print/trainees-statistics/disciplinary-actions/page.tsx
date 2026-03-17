'use client';

import { useState, useEffect } from 'react';
import { fetchAPI } from '@/lib/api';
import { getSystemSettings } from '@/app/lib/api/settings';
import { getImageUrl } from '@/lib/api';

export default function PrintDisciplinaryActionsReportPage() {
  const [actions, setActions] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        const [actionsResponse, settingsData, statsData] = await Promise.all([
          fetchAPI('/disciplinary-actions'),
          getSystemSettings(),
          fetchAPI('/disciplinary-actions/stats'),
        ]);

        setSettings(settingsData);
        setActions(actionsResponse || []);
        setStats(statsData);
        
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!isLoading && actions.length > 0) {
      setTimeout(() => window.print(), 500);
    }
  }, [isLoading, actions]);

  const getActionTypeLabel = (type: string) => {
    const labels: any = {
      WARNING: 'لفت نظر',
      GUARDIAN_SUMMON: 'استدعاء ولي الأمر',
      REPORT_FILING: 'حفظ محضر',
      TEMPORARY_SUSPENSION: 'فصل مؤقت',
      PERMANENT_EXPULSION: 'فصل نهائي'
    };
    return labels[type] || type;
  };

  const getActionTypeColor = (type: string) => {
    const colors: any = {
      WARNING: '#fbbf24',
      GUARDIAN_SUMMON: '#f97316',
      REPORT_FILING: '#3b82f6',
      TEMPORARY_SUSPENSION: '#ea580c',
      PERMANENT_EXPULSION: '#dc2626'
    };
    return colors[type] || '#6b7280';
  };

  const getStatusLabel = (status: string) => {
    const labels: any = {
      ACTIVE: 'نشط',
      COMPLETED: 'مكتمل',
      CANCELLED: 'ملغي'
    };
    return labels[status] || status;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل تقرير الإجراءات العقابية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black" dir="rtl">
      <style jsx global>{`
        @page { size: A4 landscape; margin: 15mm; }
        @media print {
          body { margin: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; }
        }

        .print-container { max-width: 100%; margin: 0 auto; padding: 20px; background: white; }
        .header { text-align: center; border-bottom: 3px solid #0A2647; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { width: 100px; height: 100px; margin: 0 auto 15px; background: #f0f0f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40px; }
        .title { font-size: 28px; font-weight: bold; color: #0A2647; margin: 15px 0; }
        .subtitle { font-size: 20px; color: #666; margin: 10px 0; }
        
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
        .stats-card { text-align: center; padding: 15px; background: #e8edf2; border: 2px solid #0A2647; border-radius: 10px; }
        .stat-value { font-size: 36px; font-weight: bold; color: #0A2647; margin-bottom: 8px; }
        .stat-label { font-size: 14px; color: #666; font-weight: 600; }
        
        .data-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 10px; }
        .data-table th, .data-table td { border: 2px solid #ddd; padding: 8px; text-align: center; }
        .data-table th { background: #0A2647; color: white; font-weight: bold; font-size: 11px; }
        .data-table tr:nth-child(even) { background: #fafafa; }
        .data-table .name-col { text-align: right; font-weight: bold; }
        
        .print-button { position: fixed; top: 20px; left: 20px; z-index: 1000; background: linear-gradient(135deg, #0A2647, #1e3a52);
          color: white; border: none; border-radius: 12px; padding: 12px 24px; font-size: 16px; font-weight: bold;
          cursor: pointer; box-shadow: 0 4px 15px rgba(10, 38, 71, 0.3); transition: all 0.3s ease; }
        .print-button:hover { background: linear-gradient(135deg, #1e3a52, #0A2647); transform: translateY(-2px); }
      `}</style>

      <button onClick={() => window.print()} className="print-button no-print">
        🖨️ طباعة التقرير
      </button>

      <div className="print-container">
        {/* Header */}
        <div className="header">
          <div className="logo">
            {settings?.centerLogo ? (
              <img src={getImageUrl(settings.centerLogo)} alt="Logo" style={{width: '100%', height: '100%', objectFit: 'contain'}}
                onError={(e) => { (e.target as any).style.display = 'none'; if (e.currentTarget.parentElement) e.currentTarget.parentElement.innerHTML = '🏛️'; }} />
            ) : '🏛️'}
          </div>
          <h1 className="title">{settings?.centerName || 'مركز تدريب مهني'}</h1>
          <h2 className="subtitle">تقرير الإجراءات العقابية</h2>
          <div className="info-label" style={{marginTop: '10px', fontSize: '12px', color: '#888'}}>
            {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* إحصائيات عامة */}
        <div className="stats-grid">
          <div className="stats-card">
            <div className="stat-value">{stats?.total || 0}</div>
            <div className="stat-label">إجمالي الإجراءات 📋</div>
          </div>
          <div className="stats-card">
            <div className="stat-value">{stats?.active || 0}</div>
            <div className="stat-label">إجراءات نشطة 🔴</div>
          </div>
          <div className="stats-card">
            <div className="stat-value">{actions.filter((a: any) => a.trainee).length}</div>
            <div className="stat-label">متدربين متأثرين 👥</div>
          </div>
        </div>

        {/* جدول الإجراءات */}
        <div style={{marginTop: '30px'}}>
          <h3 style={{fontSize: '20px', fontWeight: 'bold', marginBottom: '15px', color: '#0A2647'}}>
            🚫 سجل الإجراءات العقابية المتخذة
          </h3>
          
          {actions.length === 0 ? (
            <div style={{textAlign: 'center', padding: '40px', color: '#666'}}>
              لا توجد إجراءات عقابية مسجلة
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{width: '40px'}}>#</th>
                  <th style={{textAlign: 'right'}}>اسم المتدرب</th>
                  <th style={{width: '110px'}}>الرقم القومي</th>
                  <th style={{width: '120px'}}>البرنامج</th>
                  <th style={{width: '100px'}}>نوع الإجراء</th>
                  <th style={{width: '80px'}}>الحالة</th>
                  <th style={{width: '90px'}}>تاريخ الإجراء</th>
                  <th style={{textAlign: 'right', width: '180px'}}>السبب</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((action: any, index: number) => (
                  <tr key={action.id}>
                    <td style={{fontWeight: 'bold', fontSize: '11px'}}>{index + 1}</td>
                    <td className="name-col" style={{fontSize: '11px'}}>{action.trainee?.nameAr || 'غير محدد'}</td>
                    <td style={{fontFamily: 'monospace', fontSize: '9px'}}>{action.trainee?.nationalId || 'غير محدد'}</td>
                    <td style={{fontSize: '10px'}}>{action.trainee?.program?.nameAr || 'غير محدد'}</td>
                    <td style={{fontSize: '10px'}}>
                      <span style={{
                        backgroundColor: getActionTypeColor(action.actionType) + '20',
                        color: getActionTypeColor(action.actionType),
                        padding: '3px 6px',
                        borderRadius: '8px',
                        fontSize: '9px',
                        fontWeight: 'bold',
                        border: `1px solid ${getActionTypeColor(action.actionType)}`
                      }}>
                        {getActionTypeLabel(action.actionType)}
                      </span>
                    </td>
                    <td style={{fontSize: '10px'}}>
                      <span style={{
                        backgroundColor: action.status === 'ACTIVE' ? '#dcfce7' : action.status === 'COMPLETED' ? '#dbeafe' : '#f3f4f6',
                        color: action.status === 'ACTIVE' ? '#15803d' : action.status === 'COMPLETED' ? '#1e40af' : '#6b7280',
                        padding: '3px 6px',
                        borderRadius: '8px',
                        fontSize: '9px',
                        fontWeight: 'bold'
                      }}>
                        {getStatusLabel(action.status)}
                      </span>
                    </td>
                    <td style={{fontSize: '9px'}}>
                      {new Date(action.createdAt).toLocaleDateString('ar-EG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td style={{textAlign: 'right', fontSize: '9px', maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                      {action.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* إحصائيات تفصيلية حسب النوع */}
        {stats?.byType && stats.byType.length > 0 && (
          <div style={{marginTop: '30px', pageBreakBefore: 'avoid'}}>
            <h3 style={{fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', color: '#0A2647'}}>
              📊 إحصائيات حسب نوع الإجراء
            </h3>
            <table className="data-table" style={{width: '60%', margin: '0 auto'}}>
              <thead>
                <tr>
                  <th style={{textAlign: 'right'}}>نوع الإجراء</th>
                  <th style={{width: '100px'}}>العدد</th>
                </tr>
              </thead>
              <tbody>
                {stats.byType.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td style={{textAlign: 'right', fontSize: '11px', fontWeight: 'bold'}}>
                      {getActionTypeLabel(item.actionType)}
                    </td>
                    <td style={{fontSize: '14px', fontWeight: 'bold', color: getActionTypeColor(item.actionType)}}>
                      {item._count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div style={{textAlign: 'center', borderTop: '2px solid #ddd', paddingTop: 20, marginTop: 40, fontSize: '11px', color: '#666'}}>
          <p style={{fontWeight: 'bold', marginBottom: '5px'}}>{settings?.centerName || 'مركز تدريب مهني'}</p>
          <p>نظام إدارة المتدربين - تقرير الإجراءات العقابية</p>
          <p>تم إنشاء هذا التقرير في: {new Date().toLocaleString('ar-EG')}</p>
          <p style={{marginTop: '10px', fontSize: '10px', color: '#999'}}>
            إجمالي الإجراءات: {stats?.total || 0} • النشطة: {stats?.active || 0} • المكتملة: {actions.filter((a: any) => a.status === 'COMPLETED').length}
          </p>
        </div>
      </div>
    </div>
  );
}