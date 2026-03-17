'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { fetchAPI, getImageUrl } from '@/lib/api';
import { getSystemSettings } from '@/app/lib/api/settings';

export default function PrintSecondRoundPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const programId = params.programId as string;
  const classroomId = searchParams.get('classroomId');

  const [data, setData] = useState<any[]>([]);
  const [programName, setProgramName] = useState('');
  const [classroomName, setClassroomName] = useState('');
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        const [secondRound, program, settingsData] = await Promise.all([
          fetchAPI(`/grades/second-round?programId=${programId}`),
          fetchAPI(`/training-programs/${programId}`),
          getSystemSettings(),
        ]);

        // فلترة حسب الفصل إذا تم تحديده
        let filtered = secondRound;
        if (classroomId) {
          filtered = secondRound.filter((c: any) => c.classroom.id === parseInt(classroomId));
          if (filtered.length > 0) {
            setClassroomName(filtered[0].classroom.name);
          }
        }

        setData(filtered);
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
    if (!isLoading && data.length > 0) {
      setTimeout(() => window.print(), 500);
    }
  }, [isLoading, data]);

  // إحصائيات
  const totalStudents = data.reduce((sum: number, c: any) => sum + c.totalStudents, 0);
  const totalFailedSubjects = data.reduce(
    (sum: number, c: any) => sum + c.students.reduce((s: number, st: any) => s + st.failedSubjects.length, 0),
    0,
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#0A2647] mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل كشف الدور الثاني...</p>
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
          .page-break { page-break-before: always; }
        }

        .print-container { max-width: 210mm; margin: 0 auto; padding: 20px; background: white; }
        .header { text-align: center; border-bottom: 3px solid #0A2647; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { width: 100px; height: 100px; margin: 0 auto 15px; background: #f0f0f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40px; }
        .title { font-size: 28px; font-weight: bold; color: #0A2647; margin: 15px 0; }
        .subtitle { font-size: 20px; color: #666; margin: 10px 0; }

        .stats-row { display: flex; justify-content: center; gap: 30px; margin: 20px 0; }
        .stat-box { text-align: center; padding: 12px 24px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 5px; }
        .stat-value { font-size: 28px; font-weight: bold; color: #0A2647; }
        .stat-label { font-size: 12px; color: #666; font-weight: 600; margin-top: 4px; }

        .data-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 11px; }
        .data-table th, .data-table td { border: 1px solid #ddd; padding: 8px 6px; text-align: center; }
        .data-table th { background: #f5f5f5; font-weight: bold; font-size: 12px; color: #0A2647; }
        .data-table tr:nth-child(even) { background: #fafafa; }
        .data-table .name-col { text-align: right; font-weight: bold; }
        .data-table .failed-subjects { text-align: right; font-size: 10px; color: #333; }

        .classroom-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #0A2647; border-bottom: 1px solid #ddd; padding-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
        .classroom-count { font-size: 13px; color: #666; font-weight: normal; background: #f9f9f9; padding: 4px 12px; border-radius: 5px; border: 1px solid #ddd; }

        .print-button { position: fixed; top: 20px; left: 20px; z-index: 1000; background: linear-gradient(135deg, #0A2647, #1e3a52);
          color: white; border: none; border-radius: 12px; padding: 12px 24px; font-size: 16px; font-weight: bold;
          cursor: pointer; box-shadow: 0 4px 15px rgba(10, 38, 71, 0.3); transition: all 0.3s ease; display: flex; align-items: center; gap: 8px; }
        .print-button:hover { background: linear-gradient(135deg, #1e3a52, #0A2647); transform: translateY(-2px); }

        .footer { text-align: center; border-top: 2px solid #ddd; padding-top: 15px; margin-top: 40px; font-size: 11px; color: #666; }
      `}</style>

      <button onClick={() => window.print()} className="print-button no-print">
        🖨️ طباعة التقرير
      </button>

      <div className="print-container">
        {/* Header */}
        <div className="header">
          <div className="logo">
            {settings?.centerLogo ? (
              <img
                src={getImageUrl(settings.centerLogo)}
                alt="Logo"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onError={(e) => {
                  (e.target as any).style.display = 'none';
                  if (e.currentTarget.parentElement) e.currentTarget.parentElement.innerHTML = '🏛️';
                }}
              />
            ) : (
              '🏛️'
            )}
          </div>
          <h1 className="title">{settings?.centerName || 'مركز تدريب مهني'}</h1>
          <h2 className="subtitle">كشف طلاب الدور الثاني - {programName}{classroomName ? ` - ${classroomName}` : ''}</h2>
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#888' }}>
            {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* إحصائيات */}
        <div className="stats-row">
          <div className="stat-box">
            <div className="stat-value">{totalStudents}</div>
            <div className="stat-label">إجمالي الطلاب</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{totalFailedSubjects}</div>
            <div className="stat-label">إجمالي المواد الراسبة</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{data.length}</div>
            <div className="stat-label">فصول دراسية</div>
          </div>
        </div>

        {/* الفصول والطلاب */}
        {data.map((classroomData: any, classIdx: number) => (
          <div key={classroomData.classroom.id} style={{ marginBottom: '40px', pageBreakInside: 'avoid' }} className={classIdx > 0 ? 'page-break' : ''}>
            <div className="classroom-title">
              <span>{classroomData.classroom.name}</span>
              <span className="classroom-count">{classroomData.totalStudents} طالب</span>
            </div>

            {classroomData.students.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#666', background: '#f9fafb', borderRadius: '8px' }}>
                لا يوجد طلاب دور ثاني في هذا الفصل
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th style={{ textAlign: 'right' }}>اسم المتدرب</th>
                    <th style={{ width: '120px' }}>الرقم القومي</th>
                    <th style={{ width: '60px' }}>عدد المواد</th>
                    <th style={{ textAlign: 'right' }}>المواد الراسبة</th>
                  </tr>
                </thead>
                <tbody>
                  {classroomData.students.map((student: any, index: number) => (
                    <tr key={student.trainee.id}>
                      <td style={{ fontWeight: 'bold' }}>{index + 1}</td>
                      <td className="name-col" style={{ fontSize: '12px' }}>{student.trainee.nameAr}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '10px' }}>{student.trainee.nationalId}</td>
                      <td style={{ fontWeight: 'bold', color: '#0A2647' }}>{student.failedSubjects.length}</td>
                      <td className="failed-subjects">
                        {student.failedSubjects.map((s: any, i: number) => (
                          <span key={i}>
                            {s.content.name} ({s.percentage.toFixed(1)}%)
                            {i < student.failedSubjects.length - 1 ? ' ، ' : ''}
                          </span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}

        {/* Footer */}
        <div style={{ textAlign: 'center', borderTop: '2px solid #ddd', paddingTop: '20px', marginTop: '40px', fontSize: '11px', color: '#666' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>{settings?.centerName || 'مركز تدريب مهني'}</p>
          <p>نظام إدارة المتدربين - كشف طلاب الدور الثاني</p>
          <p>تم إنشاء هذا التقرير في: {new Date().toLocaleString('ar-EG')}</p>
        </div>
      </div>
    </div>
  );
}
