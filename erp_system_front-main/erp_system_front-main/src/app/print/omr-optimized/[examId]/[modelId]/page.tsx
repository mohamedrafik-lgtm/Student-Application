'use client';

import { use, useEffect, useState } from 'react';
import { fetchAPI } from '@/lib/api';
import QRCode from 'qrcode';

export default function OptimizedOMRSheet({
  params
}: {
  params: Promise<{ examId: string; modelId: string }>
}) {
  const resolvedParams = use(params);
  const [sheets, setSheets] = useState<any[]>([]);
  const [qrCodes, setQrCodes] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchAPI(
          `/paper-exams/${parseInt(resolvedParams.examId)}/models/${parseInt(resolvedParams.modelId)}/sheets`
        );
        setSheets(data || []);
        
        const qrs: {[key: string]: string} = {};
        for (const s of data) {
          qrs[s.id] = await QRCode.toDataURL(s.qrCodeData, { 
            width: 80,
            margin: 1 
          });
        }
        setQrCodes(qrs);
        
        if (data.length > 0) setTimeout(() => window.print(), 200);
      } catch (error) {
        console.error('Error:', error);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div style={{padding:'40px',textAlign:'center'}}>جاري التحميل...</div>;

  return (
    <div>
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 5mm; }
          body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page { page-break-after: always; }
        }
        
        .page {
          width: 200mm;
          height: 287mm;
          background: #fff;
          font-family: 'Arial', sans-serif;
          color: #000;
          position: relative;
          padding: 5mm;
        }
        
        .calib-mark {
          width: 4mm;
          height: 4mm;
          background: #000;
          position: absolute;
        }
        
        .q-num {
          width: 7mm;
          height: 7mm;
          background: #2563EB;
          color: white;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 10pt;
          font-weight: bold;
          flex-shrink: 0;
        }
        
        .bubble {
          width: 5.5mm;
          height: 5.5mm;
          border: 2.5px solid #000;
          border-radius: 50%;
          background: #fff;
          display: inline-block;
        }
        
        .opt-label {
          font-size: 11pt;
          font-weight: bold;
          margin-top: 0.5mm;
          text-align: center;
          font-family: 'Arial Black', Arial, sans-serif;
        }
      `}</style>

      {sheets.map(sheet => {
        const qs = sheet.model?.questions || [];
        const perCol = 24;
        
        return (
          <div key={sheet.id} className="page">
            <div className="calib-mark" style={{top:0,left:0}}/>
            <div className="calib-mark" style={{top:0,right:0}}/>
            <div className="calib-mark" style={{bottom:0,left:0}}/>
            <div className="calib-mark" style={{bottom:0,right:0}}/>

            <div style={{display:'flex',justifyContent:'space-between',borderBottom:'3px solid #000',paddingBottom:'3mm',marginBottom:'3mm'}}>
              <div style={{fontSize:'16pt',fontWeight:'bold'}}>{sheet.paperExam.title}</div>
              <div style={{fontSize:'14pt',fontWeight:'bold'}}>النموذج: {sheet.model.modelName}</div>
            </div>

            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',border:'2px solid #000',padding:'3mm',marginBottom:'3mm',background:'#f9fafb'}}>
              <div style={{display:'flex',gap:'10mm',alignItems:'center'}}>
                {qrCodes[sheet.id] && <img src={qrCodes[sheet.id]} style={{width:'18mm',height:'18mm'}} alt="QR"/>}
                <div style={{fontSize:'11pt'}}>
                  <div><strong>الاسم:</strong> {sheet.trainee.nameAr}</div>
                  <div><strong>الرقم:</strong> {sheet.trainee.nationalId}</div>
                  <div style={{fontSize:'9pt',color:'#666'}}><strong>الكود:</strong> {sheet.sheetCode}</div>
                </div>
              </div>
            </div>

            <div style={{border:'2px solid #000',padding:'2mm',marginBottom:'4mm',fontSize:'9pt',textAlign:'center',fontWeight:'bold',background:'#fef3c7'}}>
              قلم رصاص أسود 2B | ظلل الدائرة بالكامل ● | إجابة واحدة فقط لكل سؤال
            </div>

            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'5mm',fontSize:'10pt'}}>
              {[0,1,2].map(colIdx => (
                <div key={colIdx}>
                  {qs.slice(colIdx*perCol,(colIdx+1)*perCol).map((q:any,idx:number) => {
                    const qNum = colIdx*perCol+idx+1;
                    const isTF = q.question.options.length === 2;
                    const labels = isTF ? ['ص','خ'] : ['A','B','C','D'];
                    
                    return (
                      <div key={q.id} style={{display:'flex',alignItems:'center',marginBottom:'3mm',gap:'2mm'}}>
                        <div className="q-num">{qNum}</div>
                        <div style={{display:'flex',gap:isTF?'10mm':'6mm'}}>
                          {labels.map((lbl,i) => (
                            <div key={i} style={{textAlign:'center',minWidth:'8mm'}}>
                              <div className="bubble"/>
                              <div className="opt-label">{lbl}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div style={{position:'absolute',bottom:'2mm',left:0,right:0,textAlign:'center',fontSize:'9pt',fontWeight:'bold'}}>
              {sheet.sheetCode} | {qs.length} سؤال | تصميم محسّن لـ AI
            </div>
          </div>
        );
      })}
    </div>
  );
}