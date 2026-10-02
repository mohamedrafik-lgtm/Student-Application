'use client';

import { useState, useEffect, use } from 'react';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import QRCode from 'qrcode';

/**
 * ورقة إجابة OMR احترافية
 * المواصفات:
 * - A4 (210x297mm)
 * - هوامش 10mm
 * - دوائر 9mm قطر
 * - تباعد 12mm
 * - علامات محاذاة في الزوايا
 * - متوافقة مع Google Cloud Vision OCR
 */

export default function OMRAnswerSheetsPage({
  params
}: {
  params: Promise<{ id: string; modelId: string }>
}) {
  const resolvedParams = use(params);
  const examId = parseInt(resolvedParams.id);
  const modelId = parseInt(resolvedParams.modelId);
  
  const [sheets, setSheets] = useState<any[]>([]);
  const [qrCodes, setQrCodes] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const sheetsData = await fetchAPI(`/paper-exams/${examId}/models/${modelId}/sheets`);
      setSheets(sheetsData || []);
      
      const qrs: {[key: string]: string} = {};
      for (const sheet of sheetsData) {
        const qrDataURL = await QRCode.toDataURL(sheet.qrCodeData, {
          width: 100,
          margin: 1,
        });
        qrs[sheet.id] = qrDataURL;
      }
      setQrCodes(qrs);
      
    } catch (error) {
      toast.error('فشل تحميل أوراق الإجابة');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && sheets.length > 0) {
      setTimeout(() => window.print(), 1000);
    }
  }, [loading, sheets]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl">جاري تحميل {sheets.length} ورقة...</p>
      </div>
    );
  }

  return (
    <div>
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          
          body { margin: 0; padding: 0; }
          
          .omr-page {
            page-break-after: always;
            width: 190mm;
            height: 277mm;
            position: relative;
            background: white;
          }
        }
        
        @media screen {
          .omr-page {
            width: 210mm;
            min-height: 297mm;
            padding: 10mm;
            margin: 10mm auto;
            background: white;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            position: relative;
          }
        }
        
        .alignment-mark {
          width: 8mm;
          height: 8mm;
          background: black;
          position: absolute;
        }
        
        .bubble {
          width: 9mm;
          height: 9mm;
          border: 2.5px solid black;
          border-radius: 50%;
          background: white;
          display: inline-flex;
          align-items: center;
          justify-center;
          position: relative;
        }
        
        .bubble::after {
          content: '';
          width: 6mm;
          height: 6mm;
          border: 1px solid #ccc;
          border-radius: 50%;
          position: absolute;
        }
      `}</style>

      {sheets.map((sheet) => {
        const questions = sheet.model?.questions || [];
        
        return (
          <div key={sheet.id} className="omr-page">
            
            {/* علامات المحاذاة (Alignment Marks) */}
            <div className="alignment-mark" style={{ top: 0, right: 0 }} />
            <div className="alignment-mark" style={{ top: 0, left: 0 }} />
            <div className="alignment-mark" style={{ bottom: 0, right: 0 }} />
            <div className="alignment-mark" style={{ bottom: 0, left: 0 }} />

            {/* الرأسية */}
            <div style={{
              textAlign: 'center',
              borderBottom: '4px solid black',
              paddingBottom: '4mm',
              marginBottom: '4mm'
            }}>
              <h1 style={{ fontSize: '22pt', fontWeight: 'bold', margin: '0 0 2mm 0' }}>
                ورقة الإجابة - نظام OMR الاحترافي
              </h1>
              <p style={{ fontSize: '13pt', margin: 0, fontWeight: 'bold' }}>
                {sheet.paperExam.title}
              </p>
              <p style={{ fontSize: '11pt', color: '#333', margin: '1mm 0 0 0' }}>
                {sheet.paperExam.trainingContent.name}
              </p>
            </div>

            {/* معلومات الطالب + QR */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: '5mm',
              border: '3px solid black',
              padding: '4mm',
              marginBottom: '5mm'
            }}>
              {/* معلومات */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '3mm'
              }}>
                <div>
                  <p style={{ fontSize: '10pt', margin: '0 0 1mm 0', fontWeight: 'bold' }}>الاسم:</p>
                  <p style={{ fontSize: '12pt', margin: 0, fontWeight: 'bold', borderBottom: '2px dotted black', paddingBottom: '1mm' }}>
                    {sheet.trainee.nameAr}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '10pt', margin: '0 0 1mm 0', fontWeight: 'bold' }}>الرقم القومي:</p>
                  <p style={{ fontSize: '12pt', margin: 0, fontWeight: 'bold', borderBottom: '2px dotted black', paddingBottom: '1mm' }}>
                    {sheet.trainee.nationalId}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '10pt', margin: '0 0 1mm 0', fontWeight: 'bold' }}>النموذج:</p>
                  <p style={{ fontSize: '14pt', margin: 0, fontWeight: 'bold', color: '#2563eb', borderBottom: '2px dotted black', paddingBottom: '1mm' }}>
                    {sheet.model.modelName}
                  </p>
                </div>
              </div>

              {/* QR Code */}
              {qrCodes[sheet.id] && (
                <div style={{ textAlign: 'center' }}>
                  <img src={qrCodes[sheet.id]} alt="QR" style={{ width: '28mm', height: '28mm', border: '2px solid black', padding: '1mm' }} />
                  <p style={{ fontSize: '8pt', marginTop: '1mm', fontWeight: 'bold' }}>{sheet.sheetCode}</p>
                </div>
              )}
            </div>

            {/* تعليمات */}
            <div style={{
              background: '#fef3c7',
              border: '3px solid #fbbf24',
              padding: '3mm',
              marginBottom: '5mm',
              borderRadius: '2mm'
            }}>
              <p style={{ fontSize: '10pt', fontWeight: 'bold', margin: '0 0 2mm 0' }}>⚠️ تعليمات التظليل:</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2mm', fontSize: '9pt' }}>
                <div>• استخدم قلم رصاص أسود (HB أو 2B)</div>
                <div>• ظلل الدائرة بالكامل هكذا: ●</div>
                <div>• لا تكتب خارج الدوائر</div>
                <div>• إجابة واحدة فقط لكل سؤال</div>
                <div>• امسح جيداً إذا أخطأت</div>
                <div>• لا تطوِ أو تمزق الورقة</div>
              </div>
            </div>

            {/* منطقة الإجابات */}
            <div>
              <h3 style={{
                fontSize: '13pt',
                fontWeight: 'bold',
                margin: '0 0 4mm 0',
                borderBottom: '3px solid black',
                paddingBottom: '2mm',
                background: '#e0e7ff',
                padding: '2mm 3mm'
              }}>
                منطقة الإجابات - ظلل الدائرة بالكامل ●
              </h3>

              {/* الأسئلة */}
              <div style={{ marginTop: '3mm' }}>
                {questions.map((examQuestion: any, index: number) => {
                  const options = examQuestion.question.options;
                  const optionLabels = ['A', 'B', 'C', 'D', 'E'];
                  
                  // تحديد نوع السؤال
                  const isTrueFalse = options.length === 2 && 
                    (options[0].text === 'صحيح' || options[0].text === 'صح');
                  
                  return (
                    <div key={examQuestion.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      minHeight: '12mm',
                      borderBottom: index < questions.length - 1 ? '1px solid #ddd' : 'none',
                      paddingTop: '2mm',
                      paddingBottom: '2mm'
                    }}>
                      {/* رقم السؤال */}
                      <div style={{
                        width: '10mm',
                        height: '10mm',
                        background: '#2563eb',
                        color: 'white',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13pt',
                        fontWeight: 'bold',
                        flexShrink: 0,
                        marginLeft: '2mm'
                      }}>
                        {index + 1}
                      </div>

                      {/* الدوائر */}
                      <div style={{
                        display: 'flex',
                        gap: '12mm',
                        marginRight: '8mm',
                        flexShrink: 0,
                        alignItems: 'center'
                      }}>
                        {options.map((option: any, optIndex: number) => (
                          <div key={option.id} style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '1.5mm'
                          }}>
                            <div className="bubble" />
                            <span style={{
                              fontSize: '10pt',
                              fontWeight: 'bold',
                              color: '#000'
                            }}>
                              {isTrueFalse ? 
                                (option.text === 'صحيح' || option.text === 'صح' ? 'ص' : 'خ') : 
                                optionLabels[optIndex]
                              }
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div style={{
              position: 'absolute',
              bottom: '3mm',
              left: '0',
              right: '0',
              textAlign: 'center',
              fontSize: '8pt',
              color: '#666'
            }}>
              <p style={{ margin: 0 }}>
                Google Cloud Vision OMR System - Tiba Training Center
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}