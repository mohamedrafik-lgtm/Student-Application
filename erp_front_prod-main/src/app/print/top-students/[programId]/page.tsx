'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getTopStudentsByClassroom } from '@/lib/top-students-api';
import { fetchAPI, getImageUrl } from '@/lib/api';
import { getSystemSettings } from '@/app/lib/api/settings';

export default function PrintTopStudentsPage() {
  const params = useParams();
  const programId = params.programId as string;
  
  const [topStudentsData, setTopStudentsData] = useState<any[]>([]);
  const [programName, setProgramName] = useState('');
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        const [topStudents, program, settingsData] = await Promise.all([
          getTopStudentsByClassroom(parseInt(programId), 1000),
          fetchAPI(`/training-programs/${programId}`),
          getSystemSettings(),
        ]);

        setTopStudentsData(topStudents);
        setProgramName(program?.nameAr || 'البرنامج التدريبي');
        setSettings(settingsData);
        
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [programId]);

  useEffect(() => {
    if (!isLoading && topStudentsData.length > 0) {
      setTimeout(() => window.print(), 500);
    }
  }, [isLoading, topStudentsData]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل كشف الأوائل...</p>
        </div>
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

        .print-container { max-width: 100%; margin: 0 auto; padding: 20px; background: white; }
        .header { text-align: center; border-bottom: 3px solid #0A2647; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { width: 100px; height: 100px; margin: 0 auto 15px; background: #f0f0f0; border-radius: 50%; display: flex; align-items: center; justify-center; font-size: 40px; }
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
        
        .rank-badge { display: inline-block; width: 32px; height: 32px; border-radius: 50%; color: white; font-weight: bold; line-height: 32px; text-align: center; }
        .rank-1 { background: linear-gradient(135deg, #fbbf24, #f59e0b); }
        .rank-2 { background: linear-gradient(135deg, #9ca3af, #6b7280); }
        .rank-3 { background: linear-gradient(135deg, #fb923c, #ea580c); }
        .rank-other { background: linear-gradient(135deg, #0A2647, #1e3a52); }
        
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
          <h2 className="subtitle">كشف الأوائل - {programName}</h2>
          <div className="info-label" style={{marginTop: '10px', fontSize: '12px', color: '#888'}}>
            {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* الفصول والأوائل */}
        {topStudentsData.map((classroomData: any) => (
          <div key={classroomData.classroom.id} style={{marginBottom: '40px', pageBreakInside: 'avoid'}}>
            {/* عنوان الفصل */}
            <h3 style={{fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', color: '#0A2647', borderBottom: '2px solid #e8edf2', paddingBottom: '8px'}}>
              {classroomData.classroom.name}
            </h3>
            
            {classroomData.topStudents.length === 0 ? (
              <div style={{textAlign: 'center', padding: '20px', color: '#666', background: '#f9fafb', borderRadius: '8px'}}>
                لا توجد درجات مسجلة في هذا الفصل
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{width: '60px'}}>الترتيب</th>
                    <th style={{textAlign: 'right'}}>اسم المتدرب</th>
                    <th style={{width: '120px'}}>الرقم القومي</th>
                    <th style={{width: '80px'}}>عدد المواد</th>
                    <th style={{width: '100px'}}>المجموع</th>
                    <th style={{width: '80px'}}>النسبة</th>
                  </tr>
                </thead>
                <tbody>
                  {classroomData.topStudents.map((student: any, index: number) => (
                    <tr key={student.trainee.id}>
                      <td>
                        <span className={`rank-badge ${
                          index === 0 ? 'rank-1' : 
                          index === 1 ? 'rank-2' : 
                          index === 2 ? 'rank-3' : 'rank-other'
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="name-col" style={{fontSize: '12px'}}>{student.trainee.nameAr}</td>
                      <td style={{fontFamily: 'monospace', fontSize: '10px'}}>{student.trainee.nationalId}</td>
                      <td style={{fontSize: '11px', fontWeight: 'bold'}}>{student.subjectsCount}</td>
                      <td style={{fontSize: '11px'}}>
                        <span style={{fontWeight: 'bold', color: '#3b82f6'}}>{student.totalMarks.toFixed(1)}</span>
                        <span style={{color: '#999'}}> / </span>
                        <span>{student.maxMarks.toFixed(1)}</span>
                      </td>
                      <td style={{fontSize: '13px', fontWeight: 'bold', color: '#0A2647'}}>
                        {student.percentage.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}

        {/* Footer */}
        <div style={{textAlign: 'center', borderTop: '2px solid #ddd', paddingTop: '20px', marginTop: '40px', fontSize: '11px', color: '#666'}}>
          <p style={{fontWeight: 'bold', marginBottom: '5px'}}>{settings?.centerName || 'مركز تدريب مهني'}</p>
          <p>نظام إدارة المتدربين - كشف الأوائل</p>
          <p>تم إنشاء هذا التقرير في: {new Date().toLocaleString('ar-EG')}</p>
        </div>
      </div>
    </div>
  );
}