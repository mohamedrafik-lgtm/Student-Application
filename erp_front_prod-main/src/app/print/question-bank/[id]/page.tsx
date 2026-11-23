'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { getSystemSettings } from '@/app/lib/api/settings';
import { getImageUrl } from '@/lib/api';

interface QuestionOption {
  id: number;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: number;
  text: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE';
  skill: string;
  difficulty: string;
  chapter: number;
  options: QuestionOption[];
}

interface ContentData {
  id: number;
  code: string;
  name: string;
  chaptersCount: number;
  program: {
    nameAr: string;
  };
  questions: Question[];
}

export default function QuestionBankContentPrint() {
  const params = useParams();
  const contentId = params.id as string;
  
  const [content, setContent] = useState<ContentData | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (contentId) {
      fetchData();
    }
  }, [contentId]);

  const fetchData = async () => {
    try {
      const [contentData, questionsData, settingsData] = await Promise.all([
        fetchAPI(`/training-contents/${contentId}`),
        fetchAPI(`/questions/content/${contentId}`),
        getSystemSettings(),
      ]);
      
      setContent({
        ...contentData,
        questions: questionsData || []
      });
      setSettings(settingsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && content) {
      setTimeout(() => window.print(), 500);
    }
  }, [loading, content]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-700 mx-auto mb-4"></div>
          <p className="text-slate-500 text-sm">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-red-600 text-lg font-medium">لم يتم العثور على المادة</p>
      </div>
    );
  }

  const mcqQuestions = content.questions?.filter(q => q.type === 'MULTIPLE_CHOICE') || [];
  const trueFalseQuestions = content.questions?.filter(q => q.type === 'TRUE_FALSE') || [];
  
  // تجميع حسب الأبواب
  const questionsByChapter: Record<number, Question[]> = {};
  content.questions?.forEach(q => {
    if (!questionsByChapter[q.chapter]) {
      questionsByChapter[q.chapter] = [];
    }
    questionsByChapter[q.chapter].push(q);
  });

  return (
    <div className="min-h-screen bg-white text-black" dir="rtl" style={{margin: 0, padding: 0}}>
      <style jsx global>{`
        * { box-sizing: border-box; }
        html, body { margin: 0 !important; padding: 0 !important; overflow-x: hidden; }
        
        @media print {
          body { 
            font-family: 'Cairo', 'Arial', sans-serif !important;
            direction: rtl !important;
            margin: 0 !important; padding: 0 !important;
          }
          .no-print { display: none !important; }
          @page { size: A4 portrait; margin: 15mm; }
          .page-break-before { page-break-before: always; }
          .page-break-inside-avoid { page-break-inside: avoid; }
        }
        
        .print-container { max-width: 210mm; margin: 0 auto; padding: 20px; background: white; }
        
        .header {
          text-align: center;
          border-bottom: 3px solid #1e293b;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header-logo {
          width: 80px; height: 80px; margin: 0 auto 12px;
          background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
        }
        .header-logo img { width: 100%; height: 100%; object-fit: contain; }
        .header-title { font-size: 26px; font-weight: 800; color: #1e293b; margin: 12px 0 4px; }
        .header-subtitle { font-size: 18px; color: #64748b; margin: 4px 0; }
        .header-info {
          display: inline-block; margin-top: 12px; padding: 10px 20px;
          background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
        }
        .header-info-name { font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
        .header-info-meta { font-size: 12px; color: #64748b; }
        .header-date { margin-top: 8px; font-size: 11px; color: #94a3b8; }
        
        .stats-row {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 12px; margin: 20px 0;
        }
        .stat-box {
          text-align: center; padding: 14px;
          border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;
        }
        .stat-value { font-size: 22px; font-weight: 800; color: #1e293b; }
        .stat-value.green { color: #059669; }
        .stat-value.red { color: #dc2626; }
        .stat-label { font-size: 11px; color: #64748b; margin-top: 2px; }
        .stat-pct { font-size: 10px; color: #94a3b8; margin-top: 2px; }
        
        @media print { .stats-row { display: none; } }
        
        .section { margin: 24px 0; page-break-inside: avoid; }
        .section-title {
          font-size: 16px; font-weight: 700; color: #1e293b;
          margin-bottom: 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;
        }
        
        .data-table {
          width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px;
        }
        .data-table th, .data-table td {
          border: 1px solid #e2e8f0; padding: 8px 10px; text-align: center;
        }
        .data-table th {
          background: #f1f5f9; font-weight: 700; font-size: 12px; color: #334155;
        }
        .data-table tr:nth-child(even) { background: #f8fafc; }
        
        .chapter-divider {
          background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px;
          padding: 8px 14px; margin: 20px 0 12px;
          font-size: 15px; font-weight: 700; color: #1e293b;
        }
        
        .q-card {
          background: #fafbfc; border: 1px solid #e2e8f0; border-radius: 8px;
          padding: 14px; margin-bottom: 12px; page-break-inside: avoid;
        }
        .q-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0;
        }
        .q-num {
          width: 32px; height: 32px; background: #1e293b; color: white; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 14px;
        }
        .q-text { font-size: 13px; color: #334155; font-weight: 500; line-height: 1.7; margin-bottom: 10px; }
        
        .q-opt {
          display: flex; align-items: center; padding: 7px 10px; margin-bottom: 5px;
          background: white; border: 1px solid #e2e8f0; border-radius: 6px;
        }
        .q-opt.correct { background: #ecfdf5; border-color: #a7f3d0; }
        .q-opt-letter {
          width: 24px; height: 24px; background: #e2e8f0; border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; margin-left: 8px; font-size: 11px; flex-shrink: 0;
        }
        .q-opt.correct .q-opt-letter { background: #059669; color: white; }
        .q-opt-text { font-size: 12px; color: #334155; }
        
        .badge {
          display: inline-block; padding: 2px 8px; border-radius: 4px;
          font-size: 10px; font-weight: 600; margin-left: 4px;
        }
        .badge-type { background: #ecfdf5; color: #065f46; }
        .badge-skill { background: #eff6ff; color: #1e40af; }
        .badge-diff { background: #fef2f2; color: #991b1b; }
        
        .print-footer {
          text-align: center; border-top: 2px solid #e2e8f0;
          padding-top: 14px; margin-top: 30px; font-size: 11px; color: #64748b;
        }
        
        .print-btn {
          position: fixed; top: 16px; left: 16px; z-index: 1000;
          background: #1e293b; color: white; border: none; border-radius: 10px;
          padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: all 0.2s;
        }
        .print-btn:hover { background: #334155; transform: translateY(-1px); }
      `}</style>

      <button onClick={() => window.print()} className="print-btn no-print">
        طباعة التقرير
      </button>

      <div className="print-container">
        {/* Header */}
        <div className="header">
          <div className="header-logo">
            {settings?.centerLogo ? (
              <img 
                src={getImageUrl(settings.centerLogo)} 
                alt="Logo"
                onError={(e) => { 
                  (e.target as any).style.display = 'none';
                }} 
              />
            ) : (
              <span style={{fontSize: 28, color: '#94a3b8'}}>◆</span>
            )}
          </div>
          <h1 className="header-title">{settings?.centerName || 'مركز تدريب مهني'}</h1>
          <h2 className="header-subtitle">تقرير بنك أسئلة المادة التدريبية</h2>
          <div className="header-info">
            <p className="header-info-name">{content.name}</p>
            <p className="header-info-meta">
              الكود: <span style={{fontFamily: 'monospace', fontWeight: 700}}>{content.code}</span> • 
              البرنامج: {content.program?.nameAr}
            </p>
          </div>
          <div className="header-date">
            {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="stats-row">
          <div className="stat-box">
            <div className="stat-value">{content.questions.length}</div>
            <div className="stat-label">إجمالي الأسئلة</div>
          </div>
          <div className="stat-box">
            <div className="stat-value green">{mcqQuestions.length}</div>
            <div className="stat-label">اختيار متعدد</div>
            <div className="stat-pct">
              {content.questions.length > 0 ? Math.round((mcqQuestions.length / content.questions.length) * 100) : 0}%
            </div>
          </div>
          <div className="stat-box">
            <div className="stat-value red">{trueFalseQuestions.length}</div>
            <div className="stat-label">صح/خطأ</div>
            <div className="stat-pct">
              {content.questions.length > 0 ? Math.round((trueFalseQuestions.length / content.questions.length) * 100) : 0}%
            </div>
          </div>
        </div>

        {/* Chapters Table */}
        <div className="section">
          <h3 className="section-title">توزيع الأسئلة حسب الأبواب</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{width: '150px'}}>رقم الباب</th>
                <th style={{width: '150px'}}>عدد الأسئلة</th>
                <th style={{width: '120px'}}>اختيار متعدد</th>
                <th style={{width: '120px'}}>صح/خطأ</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(questionsByChapter)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([chapter, questions]) => {
                  const chapterMcq = questions.filter(q => q.type === 'MULTIPLE_CHOICE').length;
                  const chapterTrueFalse = questions.filter(q => q.type === 'TRUE_FALSE').length;
                  return (
                    <tr key={chapter}>
                      <td style={{fontWeight: 700}}>الباب {chapter}</td>
                      <td style={{fontWeight: 700}}>{questions.length}</td>
                      <td style={{color: '#059669', fontWeight: 700}}>{chapterMcq}</td>
                      <td style={{color: '#dc2626', fontWeight: 700}}>{chapterTrueFalse}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="print-footer">
          <p style={{margin: '4px 0', fontWeight: 700}}>{settings?.centerName || 'مركز تدريب مهني'}</p>
          <p style={{margin: '4px 0'}}>نظام إدارة بنك الأسئلة</p>
          <p style={{margin: '4px 0'}}>تم إنشاء هذا التقرير بتاريخ: {new Date().toLocaleDateString('ar-EG')} - الساعة: {new Date().toLocaleTimeString('ar-EG')}</p>
        </div>
      </div>
    </div>
  );
}