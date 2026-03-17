'use client';

import { use, useEffect, useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { useSettings } from '@/lib/settings-context';
import { useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';

export default function ThreeColumnsOMR({
  params
}: {
  params: Promise<{ examId: string; modelId: string }>;
}) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const { settings } = useSettings();
  const [sheets, setSheets] = useState<any[]>([]);
  const [qrCodes, setQrCodes] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(true);
  
  const singleSheetId = searchParams.get('singleSheet');

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchAPI(`/paper-exams/${parseInt(resolvedParams.examId)}/models/${parseInt(resolvedParams.modelId)}/sheets`);
        setSheets(data || []);
        const qrs: {[key: string]: string} = {};
        for (const s of data) qrs[s.id] = await QRCode.toDataURL(s.qrCodeData, {
          width: 256,
          margin: 2,
          errorCorrectionLevel: 'H' // أعلى مستوى تصحيح أخطاء
        });
        setQrCodes(qrs);
        if (data.length > 0) setTimeout(() => window.print(), 200);
      } catch (err) {
        console.error('Error:', err);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div style={{padding:'40px',textAlign:'center'}}>جاري التحميل...</div>;

  return (
    <div>
      <style jsx global>{`
        @media print { @page{size:A4;margin:5mm} body{margin:0;-webkit-print-color-adjust:exact} .page{page-break-after:always} }
        .page{width:200mm;height:287mm;background:#fff;font-family:Arial;color:#000;position:relative;direction:ltr}
        .mark{width:3mm;height:3mm;background:#000;position:absolute}
        .circle{width:4mm;height:4mm;border:1.2px solid #000;border-radius:50%;background:#fff;display:inline-block}
      `}</style>

      {sheets.filter(s => !singleSheetId || s.id === singleSheetId || s.id.toString() === singleSheetId).map(s => {
        // الأسئلة مرتبة بالفعل في database (تم ترتيبها عند إنشاء النموذج)
        const qs = s.model?.questions || [];
        
        const questionsPerRow = 3;
        const totalRows = Math.ceil(qs.length / questionsPerRow);
        
        return (
          <div key={s.id} className="page">
            
            <div className="mark" style={{top:0,right:0}}/>
            <div className="mark" style={{top:0,left:0}}/>
            <div className="mark" style={{bottom:0,right:0}}/>
            <div className="mark" style={{bottom:0,left:0}}/>

            <div style={{textAlign:'center',borderBottom:'3px solid #000',marginBottom:'2mm',paddingBottom:'2mm',direction:'rtl'}}>
              <div style={{fontSize:'16pt',fontWeight:'bold',marginBottom:'1mm'}}>{s.paperExam.title}</div>
              <div style={{fontSize:'9pt',color:'#666',display:'flex',justifyContent:'space-around',marginTop:'1mm'}}>
                <span>البرنامج: {s.paperExam.trainingContent?.program?.nameAr || 'N/A'}</span>
                <span>المدة: {s.paperExam.duration} دقيقة</span>
              </div>
            </div>

            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',border:'2px solid #000',padding:'2mm',marginBottom:'2mm',direction:'rtl'}}>
              {qrCodes[s.id] && (
                <img src={qrCodes[s.id]} style={{width:'25mm',height:'25mm'}} alt="QR"/>
              )}
              <div style={{fontSize:'10pt'}}>
                <strong>الاسم:</strong> {s.trainee.nameAr.split(' ').slice(0,4).join(' ')}
              </div>
              <div style={{fontSize:'10pt'}}>
                <strong>الرقم:</strong> {s.trainee.nationalId}
              </div>
              <div style={{fontSize:'12pt'}}>
                <strong>النموذج:</strong> <span style={{fontSize:'15pt',fontWeight:'bold'}}>{s.model.modelName}</span>
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
                      // حروف إنجليزية: A B C D من اليسار لليمين
                      const labels = q.question.options.length === 2 ? ['T','F'] : ['A','B','C','D'];
                      
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
              {s.sheetCode} | {qs.length} سؤال
            </div>
          </div>
        );
      })}
    </div>
  );
}