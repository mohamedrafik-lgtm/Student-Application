'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getTraineesForGrades, getTraineeGradesDetailed } from '@/lib/grades-api';
import { fetchAPI, getImageUrl } from '@/lib/api';

interface ContentGrade {
  content: {
    id: number;
    name: string;
  };
  grade: {
    yearWorkMarks: number;
    practicalMarks: number;
    writtenMarks: number;
    attendanceMarks: number;
    quizzesMarks: number;
    finalExamMarks: number;
  } | null;
}

interface GradeRow {
  traineeId: number;
  traineeName: string;
  nationalId: string;
  programName: string;
  subjectName: string;
  total: number;
}

function PrintContent() {
  const searchParams = useSearchParams();
  const [gradeRows, setGradeRows] = useState<GradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const [totalTrainees, setTotalTrainees] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const search = searchParams.get('search') || undefined;
        const programId = searchParams.get('programId') ? parseInt(searchParams.get('programId')!) : undefined;

        const [data, settingsData] = await Promise.all([
          getTraineesForGrades(1, 1000, search, programId),
          fetchAPI('/settings')
        ]);

        setSettings(settingsData);
        const trainees = data.data || [];
        setTotalTrainees(trainees.length);

        const rows: GradeRow[] = [];
        for (const trainee of trainees) {
          try {
            const gradesData = await getTraineeGradesDetailed(trainee.id);
            const contentGrades: ContentGrade[] = gradesData.contentGrades || [];
            
            if (contentGrades.length > 0) {
              contentGrades.forEach((cg: ContentGrade) => {
                const grade = cg.grade;
                const yearWork = grade?.yearWorkMarks || 0;
                const practical = grade?.practicalMarks || 0;
                const written = grade?.writtenMarks || 0;
                const attendance = grade?.attendanceMarks || 0;
                const quizzes = grade?.quizzesMarks || 0;
                const finalExam = grade?.finalExamMarks || 0;
                const total = Math.round(yearWork + practical + written + attendance + quizzes + finalExam);
                
                rows.push({
                  traineeId: trainee.id,
                  traineeName: trainee.nameAr,
                  nationalId: trainee.nationalId,
                  programName: trainee.program?.nameAr || '-',
                  subjectName: cg.content.name || '-',
                  total
                });
              });
            } else {
              rows.push({
                traineeId: trainee.id,
                traineeName: trainee.nameAr,
                nationalId: trainee.nationalId,
                programName: trainee.program?.nameAr || '-',
                subjectName: 'لا توجد درجات',
                total: 0
              });
            }
          } catch (err) {
            console.error(`Error fetching grades for trainee ${trainee.id}:`, err);
          }
        }
        setGradeRows(rows);
        setLoading(false);

        setTimeout(() => {
          window.print();
        }, 1000);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [searchParams]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
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
          .section-title { font-size: 14px !important; margin-bottom: 6px !important; padding-bottom: 3px !important; }
          
          .data-table { font-size: 10px !important; }
          .data-table th, .data-table td { padding: 4px 3px !important; }
          .data-table th { font-size: 10px !important; }

          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
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
          text-align: center;
        }
        
        .data-table tr:nth-child(even) { background: #fafafa; }

        .data-table td.grade-cell {
          text-align: center;
          font-weight: bold;
          background: #f9f9f9;
        }

        .data-table td.num-cell {
          text-align: center;
          background: #f5f5f5;
          font-weight: 500;
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
                  if (parent) parent.innerHTML = '◆';
                }}
              />
            ) : (
              <span style={{fontSize: 40}}>◆</span>
            )}
          </div>
          <h1 className="title">
            {settings?.centerName || settings?.centerNameAr || settings?.systemName || 'مركز التدريب المهني'}
          </h1>
          <h2 className="subtitle">تقرير درجات المتدربين الشامل</h2>
          <div className="date">
            عدد المتدربين: {totalTrainees} | تاريخ إصدار التقرير: {new Date().toLocaleDateString('ar-EG', { 
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
            })}
          </div>
        </div>

        {/* الجدول */}
        {gradeRows.length > 0 ? (
          <div>
            <h3 className="section-title">تفاصيل الدرجات</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{width: 40}}>م</th>
                  <th>اسم المتدرب</th>
                  <th>الرقم القومي</th>
                  <th>البرنامج</th>
                  <th>المادة</th>
                  <th style={{width: 70}}>الدرجة</th>
                </tr>
              </thead>
              <tbody>
                {gradeRows.map((row, idx) => {
                  const isFirstForTrainee = idx === 0 || gradeRows[idx - 1].traineeId !== row.traineeId;
                  const traineeRowCount = gradeRows.filter(r => r.traineeId === row.traineeId).length;
                  
                  return (
                    <tr key={idx}>
                      {isFirstForTrainee && (
                        <>
                          <td className="num-cell" rowSpan={traineeRowCount}>
                            {gradeRows.slice(0, idx + 1).filter((r, i) => i === 0 || gradeRows[i - 1].traineeId !== r.traineeId).length}
                          </td>
                          <td style={{fontWeight: 500}} rowSpan={traineeRowCount}>
                            {row.traineeName}
                          </td>
                          <td style={{textAlign: 'center'}} rowSpan={traineeRowCount}>
                            {row.nationalId}
                          </td>
                          <td style={{textAlign: 'center'}} rowSpan={traineeRowCount}>
                            {row.programName}
                          </td>
                        </>
                      )}
                      <td>{row.subjectName}</td>
                      <td className="grade-cell">{row.total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{textAlign: 'center', padding: 40}}>
            <p style={{color: '#666', fontSize: 16}}>لا توجد بيانات للعرض</p>
          </div>
        )}

        {/* تذييل التقرير */}
        <div className="footer">
          <p style={{margin: '5px 0', fontWeight: 'bold'}}>{settings?.centerName || settings?.centerNameAr || settings?.systemName || 'مركز التدريب المهني'}</p>
          <p style={{margin: '5px 0'}}>تقرير درجات المتدربين</p>
          <p style={{margin: '5px 0'}}>تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG', { 
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
          })}</p>
        </div>
      </div>
    </div>
  );
}

export default function PrintTraineesGradesPage() {
  return (
    <Suspense fallback={
      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh'}}>
        <div style={{textAlign: 'center'}}>
          <div style={{width: 48, height: 48, border: '3px solid #f3f3f3', borderTop: '3px solid #0A2647', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px'}}></div>
          <p style={{color: '#666'}}>جاري تحميل البيانات...</p>
          <style jsx global>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    }>
      <PrintContent />
    </Suspense>
  );
}
