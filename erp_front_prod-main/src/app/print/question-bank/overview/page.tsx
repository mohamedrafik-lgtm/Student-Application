'use client';

import { useState, useEffect } from 'react';
import { fetchAPI } from '@/lib/api';
import { getSystemSettings } from '@/app/lib/api/settings';
import { getImageUrl } from '@/lib/api';

interface ContentStats {
  id: number;
  code: string;
  name: string;
  program: {
    nameAr: string;
  };
  chaptersCount: number;
  _count?: {
    questions: number;
  };
  questions?: {
    type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE';
  }[];
}

export default function QuestionBankOverviewPrint() {
  const [contents, setContents] = useState<ContentStats[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [contentsData, settingsData] = await Promise.all([
        fetchAPI('/training-contents?includeQuestionCount=true'),
        getSystemSettings(),
      ]);
      
      // جلب تفاصيل كل مادة مع الأسئلة الكاملة
      const enrichedContents = await Promise.all(
        (contentsData || []).map(async (content: any) => {
          try {
            const questionsData = await fetchAPI(`/questions/content/${content.id}`);
            return {
              ...content,
              questions: questionsData || []
            };
          } catch {
            return {
              ...content,
              questions: []
            };
          }
        })
      );
      
      setContents(enrichedContents);
      setSettings(settingsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      setContents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && contents.length > 0) {
      setTimeout(() => window.print(), 500);
    }
  }, [loading, contents]);

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

  const totalQuestions = contents.reduce((sum, c) => sum + (c._count?.questions || c.questions?.length || 0), 0);
  const totalMcq = contents.reduce((sum, c) => {
    const mcqCount = c.questions?.filter(q => q.type === 'MULTIPLE_CHOICE').length || 0;
    return sum + mcqCount;
  }, 0);
  const totalTrueFalse = contents.reduce((sum, c) => {
    const tfCount = c.questions?.filter(q => q.type === 'TRUE_FALSE').length || 0;
    return sum + tfCount;
  }, 0);

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
          @page { size: A4 landscape; margin: 15mm; }
        }
        
        .print-container { max-width: 297mm; margin: 0 auto; padding: 20px; background: white; }
        @media print { .print-container { padding: 10px; } }
        
        .header {
          text-align: center; border-bottom: 3px solid #1e293b;
          padding-bottom: 16px; margin-bottom: 20px;
        }
        @media print { .header { padding-bottom: 10px; margin-bottom: 10px; } }
        
        .header-logo {
          width: 80px; height: 80px; margin: 0 auto 12px;
          background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px;
          display: flex; align-items: center; justify-content: center; overflow: hidden;
        }
        .header-logo img { width: 100%; height: 100%; object-fit: contain; }
        @media print { .header-logo { width: 60px; height: 60px; margin: 0 auto 8px; } }
        
        .header-title { font-size: 26px; font-weight: 800; color: #1e293b; margin: 10px 0 4px; }
        @media print { .header-title { font-size: 20px; margin: 6px 0 2px; } }
        
        .header-subtitle { font-size: 18px; color: #64748b; margin: 4px 0; }
        @media print { .header-subtitle { font-size: 14px; } }
        
        .header-date { margin-top: 8px; font-size: 11px; color: #94a3b8; }
        
        .section { margin: 16px 0; page-break-inside: avoid; }
        @media print { .section { margin: 0 0 10px 0; } }
        
        .section-title {
          font-size: 16px; font-weight: 700; color: #1e293b;
          margin-bottom: 10px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;
        }
        @media print { .section-title { margin-bottom: 6px; font-size: 14px; } }
        
        .data-table {
          width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px;
        }
        @media print { .data-table { margin: 5px 0; } }
        
        .data-table th, .data-table td {
          border: 1px solid #e2e8f0; padding: 8px 10px; text-align: center;
        }
        .data-table th {
          background: #f1f5f9; font-weight: 700; font-size: 12px; color: #334155;
        }
        .data-table tr:nth-child(even) { background: #f8fafc; }
        .data-table .content-name { text-align: right; font-weight: 600; }
        .data-table tbody tr:last-child {
          background: #f1f5f9; font-weight: 700; border-top: 2px solid #1e293b;
        }
        
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
          <h2 className="header-subtitle">تقرير بنك الأسئلة الشامل</h2>
          <div className="header-date">
            {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Contents Table */}
        <div className="section">
          <h3 className="section-title">تفاصيل المواد التدريبية</h3>
          
          {contents.length === 0 ? (
            <div style={{textAlign: 'center', padding: '40px', color: '#64748b'}}>
              لا توجد مواد تدريبية
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{width: '50px'}}>#</th>
                  <th style={{width: '100px'}}>الكود</th>
                  <th style={{textAlign: 'right'}}>اسم المادة</th>
                  <th style={{width: '150px'}}>البرنامج</th>
                  <th style={{width: '80px'}}>الأبواب</th>
                  <th style={{width: '100px'}}>إجمالي الأسئلة</th>
                  <th style={{width: '80px'}}>اختيار متعدد</th>
                  <th style={{width: '80px'}}>صح/خطأ</th>
                </tr>
              </thead>
              <tbody>
                {contents.map((content, index) => {
                  const contentQuestions = content._count?.questions || content.questions?.length || 0;
                  const contentMcq = content.questions?.filter(q => q.type === 'MULTIPLE_CHOICE').length || 0;
                  const contentTrueFalse = content.questions?.filter(q => q.type === 'TRUE_FALSE').length || 0;
                  
                  return (
                    <tr key={content.id}>
                      <td style={{fontWeight: 700}}>{index + 1}</td>
                      <td style={{fontFamily: 'monospace', fontWeight: 700}}>{content.code}</td>
                      <td className="content-name">{content.name}</td>
                      <td style={{fontSize: '11px'}}>{content.program?.nameAr || '-'}</td>
                      <td style={{fontWeight: 700}}>{content.chaptersCount}</td>
                      <td style={{fontWeight: 700}}>{contentQuestions}</td>
                      <td style={{color: '#059669', fontWeight: 700}}>{contentMcq}</td>
                      <td style={{color: '#dc2626', fontWeight: 700}}>{contentTrueFalse}</td>
                    </tr>
                  );
                })}
                
                {/* Total row */}
                <tr>
                  <td colSpan={5} style={{textAlign: 'right', fontWeight: 700}}>الإجمالي</td>
                  <td style={{fontWeight: 700, color: '#1e293b'}}>{totalQuestions}</td>
                  <td style={{fontWeight: 700, color: '#059669'}}>{totalMcq}</td>
                  <td style={{fontWeight: 700, color: '#dc2626'}}>{totalTrueFalse}</td>
                </tr>
              </tbody>
            </table>
          )}
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