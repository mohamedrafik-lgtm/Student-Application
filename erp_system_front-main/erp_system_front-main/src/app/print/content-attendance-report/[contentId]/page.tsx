'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { getSystemSettings } from '@/app/lib/api/settings';
import { getImageUrl } from '@/lib/api';

export default function PrintContentAttendanceReportPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const contentId = params.contentId as string;
  const includeTraineePhone = searchParams.get('includeTraineePhone') === 'true';
  const includeGuardianPhone = searchParams.get('includeGuardianPhone') === 'true';
  const includeNotes = searchParams.get('includeNotes') === 'true';
  
  const [content, setContent] = useState<any>(null);
  const [trainees, setTrainees] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any>({});
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        const [contentData, settingsData] = await Promise.all([
          fetchAPI(`/training-contents/${contentId}`),
          getSystemSettings(),
        ]);

        setContent(contentData);
        setSettings(settingsData);
        
        // استخدام programId مباشرة من TrainingContent
        const programId = contentData.programId;
        const classroomId = contentData.classroomId || contentData.classroom?.id;
        
        console.log('Content Data:', contentData);
        console.log('Program ID:', programId);
        console.log('Classroom ID:', classroomId);
        
        if (!programId) {
          console.error('Program ID is missing from content data');
          throw new Error('Program ID not found');
        }
        const slots = await fetchAPI(`/schedule/classroom/${classroomId}`);
        
        // تصفية الحصص الخاصة بهذه المادة فقط
        const contentSlots = slots.filter((slot: any) => slot.content.id === parseInt(contentId));
        
        // جلب المحاضرات لكل حصة
        const allSessions: any[] = [];
        for (const slot of contentSlots) {
          const slotSessions = await fetchAPI(`/schedule/slots/${slot.id}/sessions`);
          allSessions.push(...slotSessions);
        }

        // ترتيب من الأقدم للأحدث
        allSessions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setSessions(allSessions);
        
        // جلب جميع الطلاب في البرنامج
        let traineesData;
        if (includeNotes) {
          traineesData = await fetchAPI(`/trainees?programId=${programId}&includeNotes=true`);
        } else {
          traineesData = await fetchAPI(`/trainees?programId=${programId}`);
        }
        setTrainees(traineesData || []);
        
        // جلب سجلات الحضور لجميع المحاضرات
        const attendanceMap: any = {};
        
        for (const session of allSessions) {
          // جلب سجلات الحضور لكل محاضرة إذا لم تكن محملة
          if (!session.attendance || session.attendance.length === 0) {
            try {
              const sessionData = await fetchAPI(`/attendance/session/${session.id}`);
              session.attendance = sessionData.attendance || sessionData.records || [];
            } catch (error) {
              console.error(`Error loading attendance for session ${session.id}:`, error);
              session.attendance = [];
            }
          }
          
          if (session.attendance && session.attendance.length > 0) {
            attendanceMap[session.id] = {};
            session.attendance.forEach((record: any) => {
              // استخدم كلا النوعين للتأكد
              attendanceMap[session.id][record.traineeId] = record.status;
              attendanceMap[session.id][String(record.traineeId)] = record.status;
            });
          }
        }
        
        console.log('Attendance Map:', attendanceMap);
        console.log('Trainees:', traineesData);
        console.log('Sessions:', allSessions.length);
        
        setAttendanceData(attendanceMap);
        
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (contentId) {
      loadData();
    }
  }, [contentId]);

  useEffect(() => {
    if (!isLoading && content) {
      setTimeout(() => window.print(), 500);
    }
  }, [isLoading, content]);

  const getStatusText = (status: string) => {
    const labels: Record<string, string> = {
      PRESENT: 'حاضر',
      ABSENT: 'غائب',
      LATE: 'متأخر',
      EXCUSED: 'عذر',
    };
    return labels[status] || '-';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PRESENT: '#10b981',
      ABSENT: '#ef4444',
      LATE: '#f59e0b',
      EXCUSED: '#6b7280',
    };
    return colors[status] || '#d1d5db';
  };

  const calculateTraineeStats = (traineeId: number) => {
    let present = 0, absent = 0, late = 0, excused = 0, total = 0;
    
    sessions.forEach(session => {
      // جرب كلا النوعين: number و string
      const status = attendanceData[session.id]?.[traineeId] || attendanceData[session.id]?.[String(traineeId)];
      
      // احسب فقط المحاضرات التي لها سجل لهذا الطالب
      if (status) {
        total++;
        if (status === 'PRESENT') present++;
        else if (status === 'ABSENT') absent++;
        else if (status === 'LATE') late++;
        else if (status === 'EXCUSED') excused++;
      }
    });
    
    const recorded = present + absent + late + excused;
    const attendanceRate = total > 0 ? ((present + late) / total * 100).toFixed(1) : '0';
    
    return { present, absent, late, excused, total, recorded, attendanceRate };
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

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-red-600 text-lg">❌ المادة غير موجودة</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black" dir="rtl">
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }
        
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          overflow-x: hidden;
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
          
          @page {
            size: A4;
            margin: 15mm;
          }
        }

        .print-container { max-width: 210mm; margin: 0 auto; padding: 20px; background: white; }
        .header { text-align: center; border-bottom: 3px solid #0A2647; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { width: 100px; height: 100px; margin: 0 auto 15px; background: #f0f0f0; border-radius: 50%; display: flex; align-items: center; justify-center; font-size: 40px; }
        .title { font-size: 28px; font-weight: bold; color: #0A2647; margin: 15px 0; }
        .subtitle { font-size: 20px; color: #666; margin: 10px 0; }
        
        .content-info { background: #f9f9f9; border: 1px solid #ddd; border-radius: 5px; padding: 15px; margin: 20px 0; }
        .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
        .info-item { padding: 10px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 5px; }
        .info-label { font-size: 12px; color: #666; margin-bottom: 5px; }
        .info-value { font-size: 14px; font-weight: bold; color: #333; }
        
        .attendance-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 11px; }
        .attendance-table th, .attendance-table td { border: 1px solid #ddd; padding: 8px 6px; text-align: center; }
        .attendance-table th { background: #f5f5f5; font-weight: bold; font-size: 12px; }
        .attendance-table tr:nth-child(even) { background: #fafafa; }
        .attendance-table .trainee-name { text-align: right; font-weight: bold; }
        
        .stats-summary { display: grid; grid-template-columns: repeat(6, 1fr); gap: 15px; margin: 20px 0; }
        .stat-box { text-align: center; padding: 15px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 5px; }
        .stat-value { font-size: 20px; font-weight: bold; margin-bottom: 5px; color: #0A2647; }
        .stat-label { font-size: 12px; color: #666; }
        
        .print-button { position: fixed; top: 20px; left: 20px; z-index: 1000; background: linear-gradient(135deg, #0A2647, #1e3a52);
          color: white; border: none; border-radius: 12px; padding: 12px 24px; font-size: 16px; font-weight: bold;
          cursor: pointer; box-shadow: 0 4px 15px rgba(10, 38, 71, 0.3); transition: all 0.3s ease; }
        .print-button:hover { background: linear-gradient(135deg, #1e3a52, #0A2647); transform: translateY(-2px); }
      `}</style>

      <button onClick={() => window.print()} className="print-button">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 9V2H18V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6 18H4C3.44772 18 3 17.5523 3 17V11C3 10.4477 3.44772 10 4 10H20C20.5523 10 21 10.4477 21 11V17C21 17.5523 20.5523 18 20 18H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M18 14H6V22H18V14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        طباعة التقرير
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
          <h2 className="subtitle">تقرير حضور وغياب الطلاب - {content.name}</h2>
          <div className="info-label" style={{marginTop: '8px'}}>
            {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Content Info */}
        <div className="content-info">
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">المادة التدريبية</div>
              <div className="info-value">{content.name}</div>
            </div>
            <div className="info-item">
              <div className="info-label">كود المادة</div>
              <div className="info-value">{content.code}</div>
            </div>
            <div className="info-item">
              <div className="info-label">المحاضر</div>
              <div className="info-value">{content.instructor?.name || '-'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">عدد المحاضرات</div>
              <div className="info-value">{sessions.length} محاضرة</div>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="stats-summary">
          <div className="stat-box">
            <div className="stat-value">{trainees.length}</div>
            <div className="stat-label">عدد الطلاب</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{sessions.length}</div>
            <div className="stat-label">عدد المحاضرات</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">
              {trainees.reduce((sum, t) => sum + calculateTraineeStats(t.id).present, 0)}
            </div>
            <div className="stat-label">إجمالي الحضور</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">
              {trainees.reduce((sum, t) => sum + calculateTraineeStats(t.id).absent, 0)}
            </div>
            <div className="stat-label">إجمالي الغياب</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">
              {trainees.reduce((sum, t) => sum + calculateTraineeStats(t.id).late, 0)}
            </div>
            <div className="stat-label">إجمالي التأخير</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">
              {trainees.reduce((sum, t) => sum + calculateTraineeStats(t.id).excused, 0)}
            </div>
            <div className="stat-label">إجمالي الأعذار</div>
          </div>
        </div>

        {/* Attendance Table */}
        {trainees.length === 0 ? (
          <div style={{textAlign: 'center', padding: '40px', color: '#666'}}>
            لا توجد سجلات حضور لهذه المادة
          </div>
        ) : (
          <table className="attendance-table">
            <thead>
              <tr>
                <th style={{width: '50px'}}>#</th>
                <th style={{width: '300px'}}>اسم الطالب</th>
                <th style={{width: '150px'}}>الرقم القومي</th>
                {includeTraineePhone && (
                  <th style={{width: '120px'}}>هاتف المتدرب</th>
                )}
                {includeGuardianPhone && (
                  <th style={{width: '120px'}}>هاتف ولي الأمر</th>
                )}
                <th style={{width: '150px', background: '#10b981', color: 'white'}}>مرات الحضور</th>
                <th style={{width: '150px', background: '#ef4444', color: 'white'}}>مرات الغياب</th>
                {includeNotes && (
                  <th style={{width: '200px'}}>الملاحظات</th>
                )}
              </tr>
            </thead>
            <tbody>
              {trainees.map((trainee, index) => {
                const stats = calculateTraineeStats(trainee.id);
                return (
                  <tr key={trainee.id}>
                    <td style={{fontWeight: 'bold', textAlign: 'center', fontSize: '12px'}}>{index + 1}</td>
                    <td style={{fontWeight: 'bold', fontSize: '12px', textAlign: 'right', padding: '8px'}}>{trainee.nameAr}</td>
                    <td style={{fontFamily: 'monospace', fontSize: '11px', textAlign: 'center'}}>{trainee.nationalId}</td>
                    {includeTraineePhone && (
                      <td style={{fontSize: '11px', textAlign: 'center', direction: 'ltr'}}>{trainee.phone || '-'}</td>
                    )}
                    {includeGuardianPhone && (
                      <td style={{fontSize: '11px', textAlign: 'center', direction: 'ltr'}}>{trainee.guardianPhone || '-'}</td>
                    )}
                    <td style={{fontWeight: 'bold', color: '#10b981', fontSize: '14px', textAlign: 'center'}}>{stats.present + stats.late}</td>
                    <td style={{fontWeight: 'bold', color: '#ef4444', fontSize: '14px', textAlign: 'center'}}>{stats.absent}</td>
                    {includeNotes && (
                      <td style={{fontSize: '10px', textAlign: 'right', padding: '6px'}}>
                        {trainee.traineeNotes && trainee.traineeNotes.length > 0 ? (
                          <div style={{maxWidth: '200px'}}>
                            {trainee.traineeNotes.map((note: any, noteIndex: number) => (
                              <div key={noteIndex} style={{
                                marginBottom: '6px',
                                paddingBottom: '6px',
                                borderBottom: noteIndex < trainee.traineeNotes.length - 1 ? '1px dashed #ddd' : 'none'
                              }}>
                                <div style={{fontWeight: 'bold', color: '#0A2647', marginBottom: '2px', fontSize: '9px'}}>
                                  {note.user?.name || 'مستخدم'}
                                </div>
                                <div style={{color: '#666', marginBottom: '2px'}}>
                                  {note.content}
                                </div>
                                <div style={{fontSize: '8px', color: '#999'}}>
                                  {new Date(note.createdAt).toLocaleDateString('ar-EG')}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{color: '#999'}}>-</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Footer */}
        <div style={{textAlign: 'center', borderTop: '2px solid #ddd', paddingTop: '15px', marginTop: '20px', fontSize: '10px', color: '#666'}}>
          <p style={{fontWeight: 'bold', marginBottom: '4px'}}>{settings?.centerName || 'مركز تدريب مهني'}</p>
          <p>نظام إدارة الحضور والغياب</p>
          <p>تم إنشاء هذا التقرير في: {new Date().toLocaleString('ar-EG')}</p>
        </div>
      </div>
    </div>
  );
}