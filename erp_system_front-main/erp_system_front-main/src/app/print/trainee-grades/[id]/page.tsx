'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getTraineeById } from '@/app/lib/api/trainees';
import { getSystemSettings } from '@/app/lib/api/settings';
import { Trainee } from '@/app/types/trainees';
import { getImageUrl } from '@/lib/api';
import { getTraineeGradesDetailed } from '@/lib/grades-api';

export default function PrintTraineeGradesPage() {
  const params = useParams();
  const traineeId = Number(params.id);
  const [trainee, setTrainee] = useState<Trainee | null>(null);
  const [grades, setGrades] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // جلب بيانات المتدرب ودرجاته
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [traineeData, gradesData, settingsData] = await Promise.all([
        getTraineeById(traineeId),
        getTraineeGradesDetailed(traineeId),
        getSystemSettings(),
      ]);
      setTrainee(traineeData);
      setGrades(gradesData?.contentGrades || []);
      setSettings(settingsData);
    } catch (error) {
      console.error('خطأ في جلب البيانات:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (traineeId) {
      fetchData();
    }
  }, [traineeId]);

  // طباعة تلقائية
  useEffect(() => {
    if (!isLoading && trainee && grades.length > 0) {
      setTimeout(() => {
        window.print();
      }, 1000);
    }
  }, [isLoading, trainee, grades]);

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

  return (
    <div className="min-h-screen bg-white text-black font-cairo" dir="rtl">
      <style jsx global>{`
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
        
        .section {
          margin: 25px 0;
          page-break-inside: avoid;
        }
        
        .section-title {
          font-size: 18px;
          font-weight: bold;
          color: #0A2647;
          margin-bottom: 15px;
          border-bottom: 2px solid #ddd;
          padding-bottom: 8px;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
          margin: 15px 0;
        }
        
        .info-item {
          padding: 10px;
          background: #f9f9f9;
          border: 1px solid #ddd;
          border-radius: 5px;
        }
        
        .info-label {
          font-size: 12px;
          color: #666;
          margin-bottom: 5px;
        }
        
        .info-value {
          font-size: 14px;
          font-weight: bold;
          color: #333;
        }
        
        .grade-card {
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 20px;
          background: #fafafa;
          page-break-inside: avoid;
        }
        
        .grade-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 2px solid #0A2647;
        }
        
        .content-name {
          font-size: 16px;
          font-weight: bold;
          color: #0A2647;
        }
        
        .total-grade {
          font-size: 20px;
          font-weight: bold;
          color: #059669;
        }
        
        .grades-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 15px;
        }
        
        .grade-item {
          background: white;
          border: 1px solid #ddd;
          border-radius: 5px;
          padding: 10px;
          text-align: center;
        }
        
        .grade-label {
          font-size: 11px;
          color: #666;
          margin-bottom: 5px;
        }
        
        .grade-value {
          font-size: 16px;
          font-weight: bold;
          color: #333;
        }
        
        .grade-max {
          font-size: 12px;
          color: #888;
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
          .print-button { display: none !important; }
        }
      `}</style>

      {/* زر الطباعة */}
      <button onClick={handlePrint} className="print-button">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
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
          <h2 className="subtitle">تقرير درجات المتدرب</h2>
          <div style={{fontSize: '14px', color: '#888', marginTop: '15px'}}>
            تاريخ إصدار التقرير: {new Date().toLocaleDateString('ar-EG', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>

        {/* معلومات المتدرب */}
        <div className="section">
          <h3 className="section-title">معلومات المتدرب</h3>
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">اسم المتدرب</div>
              <div className="info-value">{trainee?.nameAr}</div>
            </div>
            <div className="info-item">
              <div className="info-label">الرقم القومي</div>
              <div className="info-value">{trainee?.nationalId}</div>
            </div>
            <div className="info-item">
              <div className="info-label">البرنامج التدريبي</div>
              <div className="info-value">{trainee?.program?.nameAr || '-'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">العام الدراسي</div>
              <div className="info-value">{trainee?.academicYear || '-'}</div>
            </div>
          </div>
        </div>

        {/* الدرجات */}
        {grades && grades.length > 0 ? (
          <div className="section">
            <h3 className="section-title">درجات المواد التدريبية</h3>
            {grades.map((item: any, idx: number) => {
              const gradeData = item.grade || {};
              const contentData = item.content || {};
              const maxMarksData = contentData.maxMarks || {};
              
              const maxTotal = maxMarksData.total || 0;
              const earnedTotal = gradeData.totalMarks || 0;
              const percentage = maxTotal > 0 ? (earnedTotal / maxTotal) * 100 : 0;

              return (
                <div key={idx} className="grade-card">
                  <div className="grade-header">
                    <div>
                      <div className="content-name">{contentData.name || 'مادة تدريبية'}</div>
                      {contentData.code && (
                        <div style={{fontSize: '12px', color: '#666', marginTop: '4px'}}>
                          {contentData.code}
                        </div>
                      )}
                    </div>
                    <div style={{textAlign: 'left'}}>
                      <div className="total-grade">{percentage.toFixed(1)}%</div>
                      <div style={{fontSize: '14px', color: '#666'}}>
                        {earnedTotal.toFixed(1)} / {maxTotal}
                      </div>
                    </div>
                  </div>

                  <div className="grades-grid">
                    <div className="grade-item">
                      <div className="grade-label">أعمال السنة</div>
                      <div className="grade-value">{gradeData.yearWorkMarks || 0}</div>
                      <div className="grade-max">/ {maxMarksData.yearWorkMarks || 0}</div>
                    </div>

                    <div className="grade-item">
                      <div className="grade-label">العملي</div>
                      <div className="grade-value">{gradeData.practicalMarks || 0}</div>
                      <div className="grade-max">/ {maxMarksData.practicalMarks || 0}</div>
                    </div>

                    <div className="grade-item">
                      <div className="grade-label">التحريري</div>
                      <div className="grade-value">{gradeData.writtenMarks || 0}</div>
                      <div className="grade-max">/ {maxMarksData.writtenMarks || 0}</div>
                    </div>

                    <div className="grade-item">
                      <div className="grade-label">الحضور</div>
                      <div className="grade-value">{(gradeData.attendanceMarks || 0).toFixed(1)}</div>
                      <div className="grade-max">/ {maxMarksData.attendanceMarks || 0}</div>
                    </div>

                    <div className="grade-item">
                      <div className="grade-label">اختبارات اونلاين</div>
                      <div className="grade-value">{gradeData.quizzesMarks || 0}</div>
                      <div className="grade-max">/ {maxMarksData.quizzesMarks || 0}</div>
                    </div>

                    <div className="grade-item">
                      <div className="grade-label">الميد تيرم</div>
                      <div className="grade-value">{gradeData.finalExamMarks || 0}</div>
                      <div className="grade-max">/ {maxMarksData.finalExamMarks || 0}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="section">
            <div style={{textAlign: 'center', padding: '40px', color: '#666'}}>
              لا توجد درجات مسجلة لهذا المتدرب
            </div>
          </div>
        )}

        {/* تذييل التقرير */}
        <div style={{textAlign: 'center', borderTop: '2px solid #ddd', paddingTop: '20px', marginTop: '40px', fontSize: '11px', color: '#666'}}>
          <p style={{margin: '5px 0', fontWeight: 'bold'}}>
            {settings && settings.centerName ? settings.centerName : 'مركز طيبة للتدريب المهني'}
          </p>
          <p style={{margin: '5px 0'}}>نظام إدارة الدرجات</p>
          <p style={{margin: '5px 0'}}>
            تم إنشاء هذا التقرير بتاريخ: {new Date().toLocaleDateString('ar-EG')} - الساعة: {new Date().toLocaleTimeString('ar-EG')}
          </p>
          <p style={{margin: '10px 0 0 0', fontSize: '10px'}}>
            هذا التقرير سري ومخصص للاستخدام الداخلي فقط
          </p>
        </div>
      </div>
    </div>
  );
}