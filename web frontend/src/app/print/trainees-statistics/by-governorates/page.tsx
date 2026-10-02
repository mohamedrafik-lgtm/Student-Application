'use client';

import { useState, useEffect } from 'react';
import { fetchAPI } from '@/lib/api';
import { getSystemSettings } from '@/app/lib/api/settings';
import { getImageUrl } from '@/lib/api';
import { egyptGovernoratesAndCities } from '@/app/lib/locations';

// تحويل كود المحافظة إلى اسم عربي
const getGovernorateLabel = (governorateValue: string): string => {
  const governorate = egyptGovernoratesAndCities.find(g => g.value === governorateValue);
  return governorate?.label || governorateValue || 'غير محدد';
};

export default function PrintTraineesStatisticsByGovernoratesPage() {
  const [governorateStats, setGovernorateStats] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>({ total: 0, males: 0, females: 0 });
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
        
        const trainees = traineesResponse.data || traineesResponse || [];
        
        // تجميع الإحصائيات حسب المحافظة
        const statsMap = new Map<string, any>();
        
        trainees.forEach((trainee: any) => {
          const governorateValue = trainee.governorate || trainee.address?.governorate || 'غير محدد';
          const governorateLabel = getGovernorateLabel(governorateValue);
          
          if (!statsMap.has(governorateLabel)) {
            statsMap.set(governorateLabel, { governorate: governorateLabel, total: 0, males: 0, females: 0 });
          }
          
          const stats = statsMap.get(governorateLabel);
          stats.total++;
          if (trainee.gender === 'MALE') stats.males++;
          else if (trainee.gender === 'FEMALE') stats.females++;
        });
        
        // تحويل إلى array وترتيب حسب العدد
        const statsArray = Array.from(statsMap.values()).sort((a, b) => b.total - a.total);
        setGovernorateStats(statsArray);
        
        // حساب الإجماليات
        setTotals({
          total: trainees.length,
          males: trainees.filter((t: any) => t.gender === 'MALE').length,
          females: trainees.filter((t: any) => t.gender === 'FEMALE').length,
        });
        
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!isLoading && governorateStats.length > 0) {
      setTimeout(() => window.print(), 500);
    }
  }, [isLoading, governorateStats]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل الإحصائيات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black" dir="rtl">
      <style jsx global>{`
        @page { size: A4 portrait; margin: 15mm; }
        @media print {
          body { margin: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; }
        }

        .print-container { max-width: 210mm; margin: 0 auto; padding: 20px; background: white; }
        .header { text-align: center; border-bottom: 3px solid #0A2647; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { width: 100px; height: 100px; margin: 0 auto 15px; background: #f0f0f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40px; }
        .title { font-size: 28px; font-weight: bold; color: #0A2647; margin: 15px 0; }
        .subtitle { font-size: 20px; color: #666; margin: 10px 0; }
        
        .stats-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 25px 0; }
        .stat-card { text-align: center; padding: 20px; background: #f9f9f9; border: 2px solid #ddd; border-radius: 10px; }
        .stat-value { font-size: 36px; font-weight: bold; margin-bottom: 8px; }
        .stat-label { font-size: 14px; color: #666; font-weight: 600; }
        
        .data-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .data-table th, .data-table td { border: 2px solid #ddd; padding: 12px; text-align: center; }
        .data-table th { background: #0A2647; color: white; font-weight: bold; font-size: 14px; }
        .data-table tr:nth-child(even) { background: #fafafa; }
        .data-table .governorate-name { text-align: right; font-weight: bold; }
        .data-table tbody tr:last-child { background: #e8edf2; font-weight: bold; border-top: 3px solid #0A2647; }
        
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
          <h2 className="subtitle">إحصائية المتدربين حسب المحافظات</h2>
          <div className="info-label" style={{marginTop: '10px', fontSize: '12px', color: '#888'}}>
            {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="stats-summary">
          <div className="stat-card" style={{borderColor: '#3b82f6'}}>
            <div className="stat-value" style={{color: '#3b82f6'}}>{totals.total}</div>
            <div className="stat-label">إجمالي المتدربين</div>
          </div>
          <div className="stat-card" style={{borderColor: '#0A2647'}}>
            <div className="stat-value" style={{color: '#0A2647'}}>{totals.males}</div>
            <div className="stat-label">ذكور</div>
          </div>
          <div className="stat-card" style={{borderColor: '#ec4899'}}>
            <div className="stat-value" style={{color: '#ec4899'}}>{totals.females}</div>
            <div className="stat-label">إناث</div>
          </div>
        </div>

        {/* Governorates Table */}
        <div style={{marginTop: '30px'}}>
          <h3 style={{fontSize: '20px', fontWeight: 'bold', marginBottom: '15px', color: '#0A2647'}}>
            🗺️ توزيع المتدربين حسب المحافظات
          </h3>
          
          {governorateStats.length === 0 ? (
            <div style={{textAlign: 'center', padding: '40px', color: '#666'}}>
              لا توجد بيانات محافظات
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{width: '60px'}}>#</th>
                  <th style={{textAlign: 'right'}}>المحافظة</th>
                  <th style={{width: '120px'}}>عدد المتدربين</th>
                  <th style={{width: '100px'}}>ذكور</th>
                  <th style={{width: '100px'}}>إناث</th>
                  <th style={{width: '120px'}}>النسبة المئوية</th>
                </tr>
              </thead>
              <tbody>
                {governorateStats.map((stat: any, index: number) => {
                  const percentage = totals.total > 0 
                    ? ((stat.total / totals.total) * 100).toFixed(1) 
                    : '0.0';
                  
                  return (
                    <tr key={index}>
                      <td style={{fontWeight: 'bold', fontSize: '14px'}}>{index + 1}</td>
                      <td className="governorate-name" style={{fontSize: '14px'}}>{stat.governorate}</td>
                      <td style={{fontWeight: 'bold', color: '#3b82f6', fontSize: '16px'}}>{stat.total}</td>
                      <td style={{fontWeight: 'bold', color: '#0A2647', fontSize: '14px'}}>{stat.males}</td>
                      <td style={{fontWeight: 'bold', color: '#ec4899', fontSize: '14px'}}>{stat.females}</td>
                      <td style={{fontWeight: 'bold', color: '#8b5cf6', fontSize: '14px'}}>{percentage}%</td>
                    </tr>
                  );
                })}
                
                {/* صف الإجمالي */}
                <tr>
                  <td colSpan={2} style={{textAlign: 'right', fontSize: '16px'}}>الإجمالي</td>
                  <td style={{fontWeight: 'bold', color: '#3b82f6', fontSize: '18px'}}>{totals.total}</td>
                  <td style={{fontWeight: 'bold', color: '#0A2647', fontSize: '16px'}}>{totals.males}</td>
                  <td style={{fontWeight: 'bold', color: '#ec4899', fontSize: '16px'}}>{totals.females}</td>
                  <td style={{fontWeight: 'bold', color: '#3b82f6', fontSize: '16px'}}>100%</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div style={{textAlign: 'center', borderTop: '2px solid #ddd', paddingTop: '20px', marginTop: '40px', fontSize: '11px', color: '#666'}}>
          <p style={{fontWeight: 'bold', marginBottom: '5px'}}>{settings?.centerName || 'مركز تدريب مهني'}</p>
          <p>نظام إدارة المتدربين</p>
          <p>تم إنشاء هذا التقرير في: {new Date().toLocaleString('ar-EG')}</p>
        </div>
      </div>
    </div>
  );
}