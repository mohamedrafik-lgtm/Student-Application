'use client';

import { use, useEffect, useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';
import { getPaperExamQuestionOptions } from '@/lib/paper-exams-utils';

export default function ThreeColumnsOMR({
  params,
}: {
  params: Promise<{ examId: string; modelId: string }>;
}) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const [sheets, setSheets] = useState<any[]>([]);
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const singleSheetId = searchParams.get('singleSheet');

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchAPI(
          `/paper-exams/${parseInt(resolvedParams.examId)}/models/${parseInt(resolvedParams.modelId)}/sheets`,
        );
        setSheets(data || []);
        const qrs: Record<string, string> = {};
        for (const sheet of data || []) {
          qrs[sheet.id] = await QRCode.toDataURL(sheet.qrCodeData, {
            width: 256,
            margin: 2,
            errorCorrectionLevel: 'H',
          });
        }
        setQrCodes(qrs);
        if (data?.length > 0) setTimeout(() => window.print(), 250);
      } catch (error) {
        console.error('Error loading OMR sheets:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [resolvedParams.examId, resolvedParams.modelId]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>جاري تحميل الأوراق...</div>;

  return (
    <div className="sheets-root">
      <style jsx global>{`
        @page { size: A4 portrait; margin: 5mm; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page { margin: 0 auto !important; box-shadow: none !important; }
          .page { break-after: page; page-break-after: always; }
          .page:last-child { break-after: auto; page-break-after: auto; }
        }
        .page {
          box-sizing: border-box; width: 200mm; height: 287mm; margin: 0 auto 8mm;
          padding: 8mm; background: #fff; color: #000; position: relative;
          direction: rtl; text-align: right; font-family: Arial, sans-serif; overflow: hidden;
        }
        .registration-mark { width: 4mm; height: 4mm; background: #000; position: absolute; }
        .question-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 3mm; direction: rtl; }
        .question-cell { min-height: 9mm; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; gap: 1mm; padding: .6mm 1.2mm; border: .35mm solid #777; border-radius: 1mm; direction: rtl; }
        .question-number { width: 6.5mm; height: 6.5mm; flex: 0 0 6.5mm; display: flex; align-items: center; justify-content: center; border: .6mm solid #000; font-weight: 700; font-size: 9pt; }
        .bubbles { display: flex; align-items: center; gap: 1mm; direction: rtl; }
        .bubble { width: 5.6mm; height: 5.6mm; box-sizing: border-box; display: flex; align-items: center; justify-content: center; border: .45mm solid #000; border-radius: 50%; font-family: Arial, sans-serif; font-weight: 700; font-size: 7pt; background: #fff; }
        .identity-value { overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }
        @media screen { .page { box-shadow: 0 2px 14px #0002; } }
      `}</style>

      {sheets
        .filter((sheet) => !singleSheetId || String(sheet.id) === singleSheetId)
        .map((sheet) => {
          const questions = sheet.model?.questions || [];
          const rows = Array.from({ length: Math.ceil(questions.length / 3) }, (_, index) =>
            questions.slice(index * 3, index * 3 + 3),
          );

          return (
            <article key={sheet.id} className="page">
              <span className="registration-mark" style={{ top: '2mm', right: '2mm' }} />
              <span className="registration-mark" style={{ top: '2mm', left: '2mm' }} />
              <span className="registration-mark" style={{ bottom: '2mm', right: '2mm' }} />
              <span className="registration-mark" style={{ bottom: '2mm', left: '2mm' }} />

              <header style={{ textAlign: 'center', borderBottom: '1mm solid #000', paddingBottom: '3mm', marginBottom: '3mm' }}>
                <div style={{ fontSize: '10pt', fontWeight: 700 }}>{sheet.paperExam.trainingContent?.program?.nameAr || 'الاختبار الورقي'}</div>
                <h1 style={{ margin: '1.5mm 0', fontSize: '17pt', lineHeight: 1.2, fontWeight: 800 }}>{sheet.paperExam.title}</h1>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12mm', fontSize: '9pt' }}>
                  <span>المادة: {sheet.paperExam.trainingContent?.name || sheet.paperExam.trainingContent?.code || '—'}</span>
                  <span>المدة: {sheet.paperExam.duration} دقيقة</span>
                  {sheet.paperExam.totalMarks != null && <span>الدرجة الكلية: {sheet.paperExam.totalMarks}</span>}
                </div>
              </header>

              <section aria-label="بيانات المتدرب والورقة" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) 31mm 43mm 27mm', gap: '2mm', alignItems: 'stretch', direction: 'rtl', border: '.7mm solid #000', padding: '2.5mm', marginBottom: '2.5mm' }}>
                <div style={{ borderLeft: '.3mm solid #777', paddingLeft: '2mm', minWidth: 0 }}>
                  <div style={{ fontSize: '8pt', color: '#333', marginBottom: '1mm' }}>اسم المتدرب</div>
                  <div className="identity-value" style={{ fontSize: '10pt', fontWeight: 700 }}>{sheet.trainee.nameAr}</div>
                </div>
                <div style={{ borderLeft: '.3mm solid #777', paddingLeft: '2mm' }}>
                  <div style={{ fontSize: '8pt', color: '#333', marginBottom: '1mm' }}>رقم الملف</div>
                  <div className="identity-value" style={{ fontSize: '12pt', fontWeight: 800 }}>{sheet.trainee.id}</div>
                </div>
                <div style={{ borderLeft: '.3mm solid #777', paddingLeft: '2mm' }}>
                  <div style={{ fontSize: '8pt', color: '#333', marginBottom: '1mm' }}>الرقم القومي</div>
                  <div className="identity-value" style={{ fontSize: '10pt', fontWeight: 700 }}>{sheet.trainee.nationalId || 'غير مسجل'}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                  {qrCodes[sheet.id] && <img src={qrCodes[sheet.id]} style={{ width: '23mm', height: '23mm' }} alt="رمز تعريف ورقة الإجابة" />}
                  <span style={{ fontSize: '7pt', marginTop: '.5mm' }}>امسح الرمز للتحقق</span>
                </div>
              </section>

              <section aria-label="تعليمات الإجابة" style={{ border: '.35mm solid #555', padding: '2mm 3mm', marginBottom: '3mm', fontSize: '8.5pt', lineHeight: 1.55 }}>
                <strong>التعليمات:</strong> استخدم قلمًا داكنًا واملأ دائرة واحدة بالكامل لكل سؤال. لا تضع علامة خارج الدائرة. إذا غيّرت إجابتك، امسح العلامة الأولى تمامًا. ابدأ من السؤال 1 أعلى اليمين، واتبع الترتيب من اليمين إلى اليسار ثم إلى الصف التالي.
              </section>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2mm', padding: '0 1mm', fontSize: '9pt', fontWeight: 700 }}>
                <span>نموذج الإجابة: {sheet.model.modelName}</span>
                <span>عدد الأسئلة: {questions.length}</span>
              </div>

              <section aria-label="منطقة تظليل الإجابات" style={{ display: 'flex', flexDirection: 'column', gap: '1mm', direction: 'rtl' }}>
                {rows.map((rowQuestions, rowIndex) => (
                  <div key={rowIndex} className="question-row">
                    {rowQuestions.map((question: any, questionIndex: number) => {
                      const questionNumber = rowIndex * 3 + questionIndex + 1;
                      const options = getPaperExamQuestionOptions(question);
                      const isTrueFalse = question.question.type === 'TRUE_FALSE';
                      const labels = isTrueFalse
                        ? ['T', 'F']
                        : ['A', 'B', 'C', 'D', 'E', 'F'].slice(0, options.length);
                      return (
                        <div key={question.id} className="question-cell">
                          <div className="question-number">{questionNumber}</div>
                          <div className="bubbles" aria-label={`إجابات السؤال ${questionNumber}`}>
                            {labels.map((label) => <span key={label} className="bubble">{label}</span>)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </section>

              <footer style={{ position: 'absolute', bottom: '6mm', left: '8mm', right: '8mm', borderTop: '.4mm solid #000', paddingTop: '1.5mm', display: 'flex', justifyContent: 'space-between', direction: 'rtl', fontSize: '8pt', fontWeight: 700 }}>
                <span>كود الورقة: {sheet.sheetCode}</span>
                <span>رقم الملف {sheet.trainee.id} · نموذج {sheet.model.modelCode}</span>
              </footer>
            </article>
          );
        })}
    </div>
  );
}
