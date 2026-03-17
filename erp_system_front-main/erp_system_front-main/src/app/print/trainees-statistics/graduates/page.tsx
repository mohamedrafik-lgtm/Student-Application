'use client';

import { useState, useEffect } from 'react';
import { fetchAPI } from '@/lib/api';
import { getSystemSettings } from '@/app/lib/api/settings';
import { getImageUrl } from '@/lib/api';

export default function PrintGraduatesReportPage() {
  const [trainees, setTrainees] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        const [traineesResponse, settingsData] = await Promise.all([
          fetchAPI('/trainees?limit=10000'),
          getSystemSettings(),
        ]);

        setSettings(settingsData);
        
        const allTrainees = traineesResponse.data || traineesResponse || [];
        
        // فلترة الخريجين فقط
        const graduates = allTrainees.filter((t: any) => 
          t.status === 'GRADUATE'
        );
        
        setTrainees(graduates);
        
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!isLoading && trainees.length > 0) {
      setTimeout(() => window.print(), 500);
    }
  }, [isLoading, trainees]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل سجل القيد...</p>
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
        
        .stats-card { text-align: center; padding: 15px; background: #e8edf2; border: 2px solid #0A2647; border-radius: 10px; margin: 20px 0; }
        .stat-value { font-size: 36px; font-weight: bold; color: #0A2647; margin-bottom: 8px; }
        .stat-label { font-size: 14px; color: #666; font-weight: 600; }
        
        .data-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 11px; }
        .data-table th, .data-table td { border: 2px solid #ddd; padding: 10px; text-align: center; }
        .data-table th { background: #0A2647; color: white; font-weight: bold; font-size: 12px; }
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
          <h2 className="subtitle">سجل قيد الخريجين</h2>
          <div className="info-label" style={{marginTop: '10px', fontSize: '12px', color: '#888'}}>
            {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* إجمالي الخريجين */}
        <div className="stats-card">
          <div className="stat-value">{trainees.length}</div>
          <div className="stat-label">إجمالي الخريجين 👨‍🎓</div>
        </div>

        {/* جدول الخريجين */}
        <div style={{marginTop: '30px'}}>
          <h3 style={{fontSize: '20px', fontWeight: 'bold', marginBottom: '15px', color: '#0A2647'}}>
            🎓 قائمة الطلاب الخريجين
          </h3>
          
          {trainees.length === 0 ? (
            <div style={{textAlign: 'center', padding: '40px', color: '#666'}}>
              لا يوجد طلاب خريجين
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{width: '50px'}}>#</th>
                  <th style={{textAlign: 'right'}}>اسم الطالب</th>
                  <th style={{width: '120px'}}>الرقم القومي</th>
                  <th style={{width: '150px'}}>البرنامج التدريبي</th>
                  <th style={{width: '100px'}}>العام الدراسي</th>
                  <th style={{width: '80px'}}>الجنس</th>
                  <th style={{width: '120px'}}>رقم الهاتف</th>
                </tr>
              </thead>
              <tbody>
                {trainees.map((trainee: any, index: number) => (
                  <tr key={trainee.id}>
                    <td style={{fontWeight: 'bold', fontSize: '12px'}}>{index + 1}</td>
                    <td className="name-col" style={{fontSize: '12px'}}>{trainee.nameAr}</td>
                    <td style={{fontFamily: 'monospace', fontSize: '10px'}}>{trainee.nationalId}</td>
                    <td style={{fontSize: '11px'}}>{trainee.program?.nameAr || 'غير محدد'}</td>
                    <td style={{fontSize: '11px'}}>{trainee.academicYear || 'غير محدد'}</td>
                    <td style={{fontSize: '11px'}}>
                      <span style={{
                        backgroundColor: trainee.gender === 'MALE' ? '#dbeafe' : '#fce7f3',
                        color: trainee.gender === 'MALE' ? '#1e40af' : '#be185d',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        fontWeight: 'bold'
                      }}>
                        {trainee.gender === 'MALE' ? 'ذكر' : 'أنثى'}
                      </span>
                    </td>
                    <td style={{fontFamily: 'monospace', fontSize: '10px'}} dir="ltr">{trainee.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div style={{textAlign: 'center', borderTop: '2px solid #ddd', paddingTop: '20px', marginTop: '40px', fontSize: '11px', color: '#666'}}>
          <p style={{fontWeight: 'bold', marginBottom: '5px'}}>{settings?.centerName || 'مركز تدريب مهني'}</p>
          <p>نظام إدارة المتدربين - سجل قيد الخريجين</p>
          <p>تم إنشاء هذا التقرير في: {new Date().toLocaleString('ar-EG')}</p>
        </div>
      </div>
    </div>
  );
}