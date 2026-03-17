'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { getSystemSettings } from '@/app/lib/api/settings';
import { getImageUrl } from '@/lib/api';

export default function PrintSessionAttendancePage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  
  const [session, setSession] = useState<any>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, excused: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        const [sessionData, settingsData] = await Promise.all([
          fetchAPI(`/attendance/session/${sessionId}`),
          getSystemSettings(),
        ]);

        setSession(sessionData.session || sessionData);
        setSettings(settingsData);
        
        const records = sessionData.attendance || sessionData.records || [];
        setAttendanceRecords(records);
        
        // حساب الإحصائيات
        const stats = {
          present: records.filter((r: any) => r.status === 'PRESENT').length,
          absent: records.filter((r: any) => r.status === 'ABSENT').length,
          late: records.filter((r: any) => r.status === 'LATE').length,
          excused: records.filter((r: any) => r.status === 'EXCUSED').length,
          total: records.length,
        };
        setStats(stats);
        
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (sessionId) {
      loadData();
    }
  }, [sessionId]);

  useEffect(() => {
    if (!isLoading && session) {
      setTimeout(() => window.print(), 500);
    }
  }, [isLoading, session]);

  const getStatusText = (status: string) => {
    const labels: Record<string, string> = {
      PRESENT: 'حاضر',
      ABSENT: 'غائب',
      LATE: 'متأخر',
      EXCUSED: 'غياب بعذر',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PRESENT: '#10b981',
      ABSENT: '#ef4444',
      LATE: '#f59e0b',
      EXCUSED: '#6b7280',
    };
    return colors[status] || '#6b7280';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل التقرير...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-red-600 text-lg">❌ المحاضرة غير موجودة</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black" dir="rtl">
      <style jsx global>{`
        @page { size: A4; margin: 15mm; }
        @media print {
          body { margin: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; }
        }

        .print-container { max-width: 210mm; margin: 0 auto; padding: 20px; background: white; }
        .header { text-align: center; border-bottom: 3px solid #0A2647; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { width: 100px; height: 100px; margin: 0 auto 15px; background: #f0f0f0; border-radius: 50%; display: flex; align-items: center; justify-center; font-size: 40px; }
        .title { font-size: 28px; font-weight: bold; color: #0A2647; margin: 15px 0; }
        .subtitle { font-size: 20px; color: #666; margin: 10px 0; }
        
        .session-info { background: #f9f9f9; border: 2px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
        .info-item { padding: 10px; }
        .info-label { font-size: 12px; color: #666; margin-bottom: 5px; }
        .info-value { font-size: 14px; font-weight: bold; color: #333; }
        
        .stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin: 20px 0; }
        .stat-card { text-align: center; padding: 15px; background: #f9f9f9; border: 2px solid #ddd; border-radius: 8px; }
        .stat-value { font-size: 28px; font-weight: bold; margin-bottom: 8px; }
        .stat-label { font-size: 13px; color: #666; font-weight: 600; }
        
        .data-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; }
        .data-table th, .data-table td { border: 1px solid #ddd; padding: 10px 8px; text-align: right; }
        .data-table th { background: #0A2647; color: white; font-weight: bold; font-size: 13px; }
        .data-table tr:nth-child(even) { background: #fafafa; }
        
        .status-badge { display: inline-block; padding: 5px 12px; border-radius: 4px; font-size: 11px; font-weight: bold; }
        
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
          <h2 className="subtitle">تقرير حضور المحاضرة</h2>
          <div className="info-label" style={{marginTop: '10px'}}>
            {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Session Info */}
        <div className="session-info">
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">المادة التدريبية</div>
              <div className="info-value">{session.scheduleSlot?.content?.name || '-'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">تاريخ المحاضرة</div>
              <div className="info-value">{new Date(session.date).toLocaleDateString('ar-EG')}</div>
            </div>
            <div className="info-item">
              <div className="info-label">يوم المحاضرة</div>
              <div className="info-value">{new Date(session.date).toLocaleDateString('ar-EG', { weekday: 'long' })}</div>
            </div>
            <div className="info-item">
              <div className="info-label">النوع</div>
              <div className="info-value">{session.scheduleSlot?.type === 'THEORY' ? 'نظري' : 'عملي'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">الوقت</div>
              <div className="info-value">{session.scheduleSlot?.startTime} - {session.scheduleSlot?.endTime}</div>
            </div>
            <div className="info-item">
              <div className="info-label">القاعة/المكان</div>
              <div className="info-value">{session.scheduleSlot?.location || '-'}</div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card" style={{borderColor: '#3b82f6'}}>
            <div className="stat-value" style={{color: '#3b82f6'}}>{stats.total}</div>
            <div className="stat-label">إجمالي الطلاب</div>
          </div>
          <div className="stat-card" style={{borderColor: '#10b981'}}>
            <div className="stat-value" style={{color: '#10b981'}}>{stats.present}</div>
            <div className="stat-label">حاضر</div>
          </div>
          <div className="stat-card" style={{borderColor: '#ef4444'}}>
            <div className="stat-value" style={{color: '#ef4444'}}>{stats.absent}</div>
            <div className="stat-label">غائب</div>
          </div>
          <div className="stat-card" style={{borderColor: '#f59e0b'}}>
            <div className="stat-value" style={{color: '#f59e0b'}}>{stats.late}</div>
            <div className="stat-label">متأخر</div>
          </div>
          <div className="stat-card" style={{borderColor: '#6b7280'}}>
            <div className="stat-value" style={{color: '#6b7280'}}>{stats.excused}</div>
            <div className="stat-label">غياب بعذر</div>
          </div>
        </div>

        {/* Attendance Table */}
        <div style={{marginTop: '30px'}}>
          <h3 style={{fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', color: '#0A2647'}}>
            كشف الحضور
          </h3>
          
          {attendanceRecords.length === 0 ? (
            <div style={{textAlign: 'center', padding: '40px', color: '#666'}}>
              لا توجد سجلات حضور لهذه المحاضرة
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{width: '50px'}}>#</th>
                  <th>اسم المتدرب</th>
                  <th style={{width: '150px'}}>الرقم القومي</th>
                  <th style={{width: '100px'}}>حالة الحضور</th>
                  <th style={{width: '100px'}}>التوقيع</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((record: any, index: number) => (
                  <tr key={record.id}>
                    <td style={{textAlign: 'center', fontWeight: 'bold'}}>{index + 1}</td>
                    <td style={{fontWeight: 'bold'}}>{record.trainee?.nameAr}</td>
                    <td style={{fontFamily: 'monospace', fontSize: '11px'}}>{record.trainee?.nationalId}</td>
                    <td style={{textAlign: 'center'}}>
                      <span 
                        className="status-badge"
                        style={{
                          backgroundColor: getStatusColor(record.status) + '20',
                          color: getStatusColor(record.status),
                          border: `2px solid ${getStatusColor(record.status)}`
                        }}
                      >
                        {getStatusText(record.status)}
                      </span>
                    </td>
                    <td></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div style={{textAlign: 'center', borderTop: '2px solid #ddd', paddingTop: '20px', marginTop: '40px', fontSize: '11px', color: '#666'}}>
          <p style={{fontWeight: 'bold', marginBottom: '5px'}}>{settings?.centerName || 'مركز تدريب مهني'}</p>
          <p>نظام إدارة الحضور والغياب</p>
          <p>تم إنشاء هذا التقرير في: {new Date().toLocaleString('ar-EG')}</p>
        </div>
      </div>
    </div>
  );
}