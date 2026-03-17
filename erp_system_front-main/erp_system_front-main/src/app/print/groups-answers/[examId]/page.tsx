'use client';

import { useState, useEffect, use } from 'react';
import { fetchAPI } from '@/lib/api';
import QRCode from 'qrcode';

export default function GroupsAnswersPrintPage({ params }: { params: Promise<{ examId: string }> }) {
  const resolvedParams = use(params);
  const examId = parseInt(resolvedParams.examId);
  
  const [data, setData] = useState<any>(null);
  const [qrCodes, setQrCodes] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [examId]);

  useEffect(() => {
    if (!loading && data) {
      setTimeout(() => window.print(), 200);
    }
  }, [loading, data]);

  const loadData = async () => {
    try {
      const result = await fetchAPI(`/paper-exams/${examId}/groups-sheets`);
      setData(result);
      
      // توليد QR Codes لجميع الأوراق
      const qrs: {[key: string]: string} = {};
      for (const group of result.groups) {
        for (const committee of group.committees) {
          for (const sheet of committee.sheets) {
            qrs[sheet.id] = await QRCode.toDataURL(sheet.qrCodeData, {
              width: 256,
              margin: 2,
              errorCorrectionLevel: 'H'
            });
          }
        }
      }
      setQrCodes(qrs);
    } catch (error) {
      console.error('خطأ في تحميل البيانات:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-600">جاري تحميل أوراق الإجابة...</p>
        </div>
      </div>
    );
  }

  if (!data || !data.groups || data.groups.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-600">لا توجد أوراق إجابة</p>
      </div>
    );
  }

  return (
    <div>
      <style jsx global>{`
        @media print { @page{size:A4;margin:5mm} body{margin:0;-webkit-print-color-adjust:exact} .page{page-break-after:always} }
        .page{width:200mm;height:287mm;background:#fff;font-family:Arial;color:#000;position:relative;direction:ltr}
        .mark{width:3mm;height:3mm;background:#000;position:absolute}
        .circle{width:4mm;height:4mm;border:1.2px solid #000;border-radius:50%;background:#fff;display:inline-block}
      `}</style>

      {data.groups.map((group: any) => (
        <div key={group.groupId}>
          {group.committees.map((committee: any) => (
            <div key={committee.committeeNumber}>
              {committee.sheets.map((sheet: any) => {
                const qs = sheet.model?.questions || [];
                const questionsPerRow = 3;
                const totalRows = Math.ceil(qs.length / questionsPerRow);
                const labels = qs.length > 0 && qs[0].question.options.length === 2 ? ['T','F'] : ['A','B','C','D'];
                
                return (
                <div key={sheet.id} className="page">
                  <div className="mark" style={{top:0,right:0}}/>
                  <div className="mark" style={{top:0,left:0}}/>
                  <div className="mark" style={{bottom:0,right:0}}/>
                  <div className="mark" style={{bottom:0,left:0}}/>

                  <div style={{textAlign:'center',borderBottom:'3px solid #000',marginBottom:'2mm',paddingBottom:'2mm',direction:'rtl'}}>
                    <div style={{fontSize:'16pt',fontWeight:'bold',marginBottom:'1mm'}}>{sheet.paperExam.title}</div>
                    <div style={{fontSize:'9pt',color:'#666',display:'flex',justifyContent:'space-around',marginTop:'1mm'}}>
                      <span>البرنامج: {sheet.paperExam.trainingContent?.program?.nameAr || 'N/A'}</span>
                      <span>المجموعة: {group.groupName}</span>
                      <span>اللجنة: {committee.committeeNumber}</span>
                      <span>المدة: {sheet.paperExam.duration} دقيقة</span>
                    </div>
                  </div>

                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',border:'2px solid #000',padding:'2mm',marginBottom:'2mm',direction:'rtl'}}>
                    {qrCodes[sheet.id] && (
                      <img src={qrCodes[sheet.id]} style={{width:'25mm',height:'25mm'}} alt="QR"/>
                    )}
                    <div style={{fontSize:'10pt'}}>
                      <strong>الاسم:</strong> {sheet.trainee.nameAr.split(' ').slice(0,4).join(' ')}
                    </div>
                    <div style={{fontSize:'10pt'}}>
                      <strong>الرقم:</strong> {sheet.trainee.nationalId}
                    </div>
                    <div style={{fontSize:'12pt'}}>
                      <strong>النموذج:</strong> <span style={{fontSize:'15pt',fontWeight:'bold'}}>{sheet.model.modelName}</span>
                    </div>
                  </div>

                  <div style={{display:'flex',flexDirection:'column',gap:'3mm',marginTop:'3mm'}}>
                    {Array.from({length: totalRows}).map((_, rowIdx) => {
                      const startIdx = rowIdx * questionsPerRow;
                      const rowQuestions = qs.slice(startIdx, startIdx + questionsPerRow);
                      
                      return (
                        <div key={rowIdx} style={{display:'flex',gap:'3mm',justifyContent:'space-between'}}>
                          {rowQuestions.map((q:any, qIdx:number) => {
                            const num = startIdx + qIdx + 1;
                            
                            return (
                              <div key={q.id} style={{display:'flex',alignItems:'center',gap:'2mm',flex:1}}>
                                <div style={{minWidth:'10mm',height:'10mm',border:'3px solid #000',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13pt',fontWeight:'bold',flexShrink:0}}>
                                  {num}
                                </div>
                                <div style={{display:'flex',gap:'3mm'}}>
                                  {labels.map((l,j) => (
                                    <div key={j} style={{textAlign:'center'}}>
                                      <div style={{
                                        width:'7mm',
                                        height:'7mm',
                                        border:'2.5px solid #000',
                                        borderRadius:'50%',
                                        display:'flex',
                                        alignItems:'center',
                                        justifyContent:'center',
                                        fontSize:'12pt',
                                        fontWeight:'900',
                                        fontFamily:'Arial Black, Arial, sans-serif',
                                        background:'#fff'
                                      }}>{l}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{position:'absolute',bottom:'2mm',left:0,right:0,textAlign:'center',fontSize:'8pt',fontWeight:'bold',direction:'rtl'}}>
                    {sheet.sheetCode} | {qs.length} سؤال | {group.groupName} - اللجنة {committee.committeeNumber}
                  </div>
                </div>
                );
              })}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
