'use client';

import { use } from 'react';
import { useEffect, useState } from 'react';
import { getAnswerSheetByCode } from '@/lib/paper-exams-api';
import QRCode from 'qrcode';

/**
 * ورقة إجابة OMR احترافية
 * مصممة وفق معايير دولية للتعرف التلقائي
 */

export default function OMRAnswerSheetPage({ params }: { params: Promise<{ sheetId: string }> }) {
  const resolvedParams = use(params);
  const [sheet, setSheet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeMain, setQrCodeMain] = useState<string>('');
  const [qrCodeTop, setQrCodeTop] = useState<string>('');

  useEffect(() => {
    loadSheet();
  }, []);

  const loadSheet = async () => {
    try {
      const data = await getAnswerSheetByCode(resolvedParams.sheetId);
      setSheet(data);
      
      // توليد QR codes
      if (data.qrCodeData) {
        const qrMain = await QRCode.toDataURL(data.qrCodeData, { width: 80, margin: 1 });
        const qrTop = await QRCode.toDataURL(data.qrCodeData, { width: 80, margin: 1 });
        setQrCodeMain(qrMain);
        setQrCodeTop(qrTop);
      }
    } catch (error) {
      console.error('Error loading sheet:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sheet && !loading && qrCodeMain) {
      setTimeout(() => window.print(), 500);
    }
  }, [sheet, loading, qrCodeMain]);

  if (loading || !sheet) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>جاري التحميل...</p>
      </div>
    );
  }

  // الأسئلة مرتبة بالفعل في database (تم ترتيبها عند إنشاء النموذج)
  const questions = sheet.model?.questions || [];

  return (
    <div className="omr-sheet" style={{ 
      width: '210mm', 
      minHeight: '297mm',
      margin: '0 auto',
      padding: '10mm',
      background: 'white',
      fontFamily: 'Arial, sans-serif',
      position: 'relative'
    }}>
      
      {/* علامات المعايرة الأربعة */}
      <div className="calibration-marks">
        {/* أعلى يمين */}
        <div style={{
          position: 'absolute',
          top: '5mm',
          right: '5mm',
          width: '10mm',
          height: '10mm',
          background: 'black',
          border: '2px solid black'
        }} />
        
        {/* أعلى يسار */}
        <div style={{
          position: 'absolute',
          top: '5mm',
          left: '5mm',
          width: '10mm',
          height: '10mm',
          background: 'black',
          border: '2px solid black'
        }} />
        
        {/* أسفل يمين */}
        <div style={{
          position: 'absolute',
          bottom: '5mm',
          right: '5mm',
          width: '10mm',
          height: '10mm',
          background: 'black',
          border: '2px solid black'
        }} />
        
        {/* أسفل يسار */}
        <div style={{
          position: 'absolute',
          bottom: '5mm',
          left: '5mm',
          width: '10mm',
          height: '10mm',
          background: 'black',
          border: '2px solid black'
        }} />
      </div>

      {/* الرأسية */}
      <div style={{ 
        textAlign: 'center', 
        borderBottom: '3px solid black',
        paddingBottom: '5mm',
        marginBottom: '5mm'
      }}>
        <h1 style={{ fontSize: '20pt', fontWeight: 'bold', margin: '0 0 3mm 0' }}>
          ورقة الإجابة - نظام OMR
        </h1>
        <p style={{ fontSize: '12pt', margin: 0 }}>
          {sheet.paperExam.title}
        </p>
        <p style={{ fontSize: '10pt', color: '#666', margin: '2mm 0 0 0' }}>
          {sheet.paperExam.trainingContent.name}
        </p>
      </div>

      {/* معلومات الطالب */}
      <div style={{ 
        border: '2px solid black',
        padding: '4mm',
        marginBottom: '5mm',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '3mm'
      }}>
        <div>
          <p style={{ fontSize: '9pt', margin: '0 0 1mm 0', fontWeight: 'bold' }}>الاسم:</p>
          <p style={{ fontSize: '11pt', margin: 0 }}>{sheet.trainee.nameAr}</p>
        </div>
        <div>
          <p style={{ fontSize: '9pt', margin: '0 0 1mm 0', fontWeight: 'bold' }}>الرقم القومي:</p>
          <p style={{ fontSize: '11pt', margin: 0 }}>{sheet.trainee.nationalId}</p>
        </div>
        <div>
          <p style={{ fontSize: '9pt', margin: '0 0 1mm 0', fontWeight: 'bold' }}>النموذج:</p>
          <p style={{ fontSize: '11pt', margin: 0 }}>{sheet.model.modelName}</p>
        </div>
      </div>

      {/* QR Code - الرئيسي */}
      {qrCodeMain && (
        <div style={{
          position: 'absolute',
          top: '45mm',
          left: '10mm',
          textAlign: 'center'
        }}>
          <img src={qrCodeMain} alt="QR Code" style={{ width: '20mm', height: '20mm' }} />
          <p style={{ fontSize: '8pt', marginTop: '2mm' }}>{sheet.sheetCode}</p>
        </div>
      )}

      {/* QR Code - إضافي في الأعلى */}
      {qrCodeTop && (
        <div style={{
          position: 'absolute',
          top: '10mm',
          right: '10mm',
          textAlign: 'center'
        }}>
          <img src={qrCodeTop} alt="QR Code Top" style={{ width: '20mm', height: '20mm' }} />
        </div>
      )}

      {/* منطقة الإجابات - شبكة OMR */}
      <div style={{ marginTop: '8mm' }}>
        <h3 style={{
          fontSize: '12pt',
          fontWeight: 'bold',
          marginBottom: '4mm',
          borderBottom: '2px solid black',
          paddingBottom: '2mm'
        }}>
          منطقة الإجابات
        </h3>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4mm',
          marginTop: '5mm'
        }}>
          {Array.from({ length: Math.ceil(questions.length / 3) }).map((_, rowIdx) => {
            const startIdx = rowIdx * 3;
            const rowQuestions = questions.slice(startIdx, startIdx + 3);
            
            return (
              <div key={rowIdx} style={{
                display: 'flex',
                gap: '4mm',
                justifyContent: 'space-between'
              }}>
                {rowQuestions.map((examQuestion: any, qIdx: number) => {
                  const index = startIdx + qIdx;
                  const options = examQuestion.question.options;
                  
                  return (
                    <div key={examQuestion.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2mm',
                      flex: 1
                    }}>
                      {/* رقم السؤال */}
                      <div style={{
                        width: '10mm',
                        height: '10mm',
                        border: '3px solid #000',
                        background: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13pt',
                        fontWeight: 'bold',
                        flexShrink: 0
                      }}>
                        {index + 1}
                      </div>

                      {/* الدوائر - LTR للحفاظ على ترتيب ا ب ج د */}
                      <div style={{
                        display: 'flex',
                        gap: '3mm',
                        direction: 'ltr'
                      }}>
                        {options.map((option: any, optIndex: number) => {
                          // حروف إنجليزية
                          const label = options.length === 2
                            ? (optIndex === 0 ? 'T' : 'F')
                            : ['A', 'B', 'C', 'D'][optIndex];
                          
                          return (
                            <div key={option.id} style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center'
                            }}>
                              <div style={{
                                width: '7mm',
                                height: '7mm',
                                border: '2.5px solid #000',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12pt',
                                fontWeight: '900',
                                fontFamily: 'Arial Black, Arial, sans-serif',
                                background: '#fff'
                              }}>
                                {label}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>


      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          
          body {
            margin: 0;
            padding: 0;
          }
          
          .omr-sheet {
            page-break-after: always;
          }
        }
      `}</style>
    </div>
  );
}