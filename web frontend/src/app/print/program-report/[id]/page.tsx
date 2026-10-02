'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { getSystemSettings } from '@/app/lib/api/settings';
import { getImageUrl } from '@/lib/api';

interface ProgramReport {
  program: {
    id: number;
    nameAr: string;
    nameEn: string;
    price: number;
    description: string | null;
    numberOfClassrooms: number;
  };
  traineesCount: number;
  classrooms: {
    classroom: {
      id: number;
      name: string;
      classNumber: number;
    };
    contents: {
      id: number;
      name: string;
      code: string;
      classroom: any;
      instructor: {
        id: string;
        name: string;
      } | null;
      sessionsCount: number;
      questionsCount: number;
      scheduleSlotsCount: number;
    }[];
    totalContents: number;
    totalSessions: number;
    totalQuestions: number;
  }[];
  summary: {
    totalTrainees: number;
    totalClassrooms: number;
    totalContents: number;
    totalSessions: number;
    totalQuestions: number;
  };
}

export default function PrintProgramReportPage() {
  const params = useParams();
  const id = params.id as string;
  
  const [report, setReport] = useState<ProgramReport | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [reportData, settingsData] = await Promise.all([
        fetchAPI(`/programs/${id}/report`),
        getSystemSettings(),
      ]);
      setReport(reportData);
      setSettings(settingsData);
    } catch (error) {
      console.error('خطأ في جلب البيانات:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  useEffect(() => {
    if (!isLoading && report) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [isLoading, report]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#0A2647] mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل التقرير...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">غير موجود</h2>
          <p className="text-gray-600">البرنامج التدريبي غير موجود</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black font-cairo" dir="rtl">
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }
        
        html, body {
          margin: 0 !important;
          padding: 0 !important;
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
          
          .page-break {
            page-break-before: always;
          }
          
          .avoid-break {
            page-break-inside: avoid;
          }
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
          width: 100px;
          height: 100px;
          margin: 0 auto 15px;
          background: #f0f0f0;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
        }
        
        .title {
          font-size: 28px;
          font-weight: bold;
          color: #0A2647;
          margin: 15px 0;
        }
        
        .subtitle {
          font-size: 20px;
          color: #666;
          margin: 10px 0;
        }
        
        .info-box {
          background: #f9f9f9;
          border: 1px solid #ddd;
          border-radius: 5px;
          padding: 15px;
          margin: 20px 0;
        }
        
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #ddd;
        }
        
        .info-row:last-child {
          border-bottom: none;
        }
        
        .info-label {
          font-weight: bold;
          color: #0A2647;
        }
        
        .info-value {
          color: #333;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin: 25px 0;
        }
        
        .summary-card {
          text-align: center;
          padding: 15px;
          background: #f9f9f9;
          border: 1px solid #ddd;
          border-radius: 5px;
        }
        
        .summary-value {
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 5px;
          color: #0A2647;
        }
        
        .summary-label {
          font-size: 12px;
          color: #666;
        }
        
        .section-title {
          font-size: 22px;
          font-weight: bold;
          color: #0A2647;
          margin: 30px 0 15px;
          padding-bottom: 10px;
          border-bottom: 2px solid #0A2647;
        }
        
        .classroom-section {
          margin: 25px 0;
          page-break-inside: avoid;
        }
        
        .classroom-header {
          background: #f9f9f9;
          padding: 15px;
          border: 1px solid #ddd;
          border-radius: 5px;
          margin-bottom: 15px;
        }
        
        .classroom-title {
          font-size: 18px;
          font-weight: bold;
          color: #0A2647;
        }
        
        .classroom-stats {
          display: flex;
          gap: 20px;
          margin-top: 10px;
          font-size: 12px;
          color: #666;
        }
        
        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          font-size: 12px;
        }
        
        .data-table th,
        .data-table td {
          border: 1px solid #ddd;
          padding: 8px 6px;
          text-align: right;
        }
        
        .data-table th {
          background: #f5f5f5;
          color: #333;
          font-weight: bold;
        }
        
        .data-table tr:nth-child(even) {
          background: #fafafa;
        }
        
        .footer-note {
          text-align: center;
          margin-top: 30px;
          font-size: 12px;
          color: #888;
          border-top: 1px solid #ddd;
          padding-top: 15px;
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
        
        @media print {
          .print-button {
            display: none !important;
          }
          
          .summary-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>

      <button onClick={handlePrint} className="print-button">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
            {settings && settings.centerLogo && settings.centerLogo.trim() !== '' ? (
              <img 
                src={getImageUrl(settings.centerLogo)} 
                alt="شعار المركز" 
                style={{width: '100%', height: '100%', objectFit: 'contain'}}
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = '🏛️';
                  }
                }}
              />
            ) : (
              '🏛️'
            )}
          </div>
          <h1 className="title">
            {settings && settings.centerName && settings.centerName.trim() !== '' 
              ? settings.centerName 
              : 'مركز طيبة للتدريب المهني'}
          </h1>
          <h2 className="subtitle">تقرير شامل عن البرنامج التدريبي</h2>
          <div style={{fontSize: '14px', color: '#666', marginTop: '10px'}}>
            <strong>تاريخ الإصدار:</strong> {new Date().toLocaleDateString('ar-SA', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>

        {/* معلومات البرنامج */}
        <div className="info-box">
          <div className="info-row">
            <span className="info-label">اسم البرنامج:</span>
            <span className="info-value">{report.program.nameAr}</span>
          </div>
          <div className="info-row">
            <span className="info-label">الاسم بالإنجليزية:</span>
            <span className="info-value">{report.program.nameEn}</span>
          </div>
          <div className="info-row">
            <span className="info-label">رسوم البرنامج:</span>
            <span className="info-value">{report.program.price.toLocaleString('ar-EG')} جنيه</span>
          </div>
          {report.program.description && (
            <div className="info-row">
              <span className="info-label">الوصف:</span>
              <span className="info-value">{report.program.description}</span>
            </div>
          )}
        </div>

        {/* ملخص إحصائي */}
        <h3 className="section-title">📊 الملخص الإحصائي</h3>
        <div className="summary-grid">
          <div className="summary-card">
            <div className="summary-value">{report.summary.totalTrainees}</div>
            <div className="summary-label">إجمالي المتدربين</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{report.summary.totalClassrooms}</div>
            <div className="summary-label">عدد الفصول</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{report.summary.totalContents}</div>
            <div className="summary-label">المحتويات التدريبية</div>
          </div>
        </div>

        <div className="summary-grid" style={{marginTop: '15px'}}>
          <div className="summary-card">
            <div className="summary-value">{report.summary.totalSessions}</div>
            <div className="summary-label">إجمالي المحاضرات</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{report.summary.totalQuestions}</div>
            <div className="summary-label">إجمالي الأسئلة</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">
              {report.summary.totalContents > 0 
                ? Math.round(report.summary.totalSessions / report.summary.totalContents) 
                : 0}
            </div>
            <div className="summary-label">متوسط المحاضرات/محتوى</div>
          </div>
        </div>

        {/* تفاصيل الفصول والمحتويات */}
        <h3 className="section-title">📚 تفاصيل الفصول والمحتويات التدريبية</h3>
        
        {report.classrooms.length > 0 ? (
          report.classrooms.map((classroomData, index) => (
            <div key={classroomData.classroom.id} className="classroom-section">
              <div className="classroom-header">
                <div className="classroom-title">
                  {classroomData.classroom.name}
                </div>
                <div className="classroom-stats">
                  <span>📖 المحتويات: {classroomData.totalContents}</span>
                  <span>🎓 المحاضرات: {classroomData.totalSessions}</span>
                  <span>❓ الأسئلة: {classroomData.totalQuestions}</span>
                </div>
              </div>

              {classroomData.contents.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{width: '40px'}}>#</th>
                      <th>اسم المحتوى</th>
                      <th style={{width: '100px'}}>الكود</th>
                      <th style={{width: '150px'}}>المدرب</th>
                      <th style={{width: '100px'}}>المحاضرات</th>
                      <th style={{width: '100px'}}>الأسئلة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classroomData.contents.map((content, idx) => (
                      <tr key={content.id}>
                        <td style={{textAlign: 'center', fontWeight: 'bold'}}>{idx + 1}</td>
                        <td style={{fontWeight: 'bold'}}>{content.name}</td>
                        <td style={{textAlign: 'center', fontFamily: 'monospace'}}>{content.code}</td>
                        <td>{content.instructor?.name || 'غير محدد'}</td>
                        <td style={{textAlign: 'center'}}>{content.sessionsCount}</td>
                        <td style={{textAlign: 'center'}}>{content.questionsCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{textAlign: 'center', padding: '20px', color: '#666'}}>
                  لا توجد محتويات تدريبية لهذا الفصل
                </div>
              )}
            </div>
          ))
        ) : (
          <div style={{textAlign: 'center', padding: '30px', color: '#666'}}>
            لا توجد فصول مسجلة لهذا البرنامج
          </div>
        )}

        {/* التذييل */}
        <div className="footer-note">
          تم إنشاء التقرير بواسطة نظام إدارة المتدربين | مركز طيبة للتدريب المهني
          <br />
          {new Date().toLocaleDateString('ar-SA')} - {new Date().toLocaleTimeString('ar-SA')}
        </div>
      </div>
    </div>
  );
}