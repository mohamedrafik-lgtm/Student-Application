'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { fetchAPI, getImageUrl } from '@/lib/api';
import { getSystemSettings } from '@/app/lib/api/settings';

export default function TraineeCertificatePrint() {
  const params = useParams();
  const traineeId = params.id as string;
  
  const [trainee, setTrainee] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (traineeId) {
      fetchData();
    }
  }, [traineeId]);

  const fetchData = async () => {
    try {
      const [traineeData, settingsData] = await Promise.all([
        fetchAPI(`/trainees/${traineeId}`),
        getSystemSettings(),
      ]);
      
      setTrainee(traineeData);
      setSettings(settingsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && trainee) {
      setTimeout(() => window.print(), 500);
    }
  }, [loading, trainee]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#0A2647] mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  if (!trainee) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-red-600 text-xl">لم يتم العثور على المتدرب</p>
        </div>
      </div>
    );
  }

  const currentDate = new Date().toLocaleDateString('ar-EG', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="min-h-screen bg-white text-black font-cairo" dir="rtl" style={{margin: 0, padding: 0}}>
      <style jsx global>{`
        @page { size: A4 portrait; margin: 20mm; }
        @media print {
          body { font-family: 'Cairo', 'Arial', sans-serif !important; direction: rtl !important; margin: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .print-button { display: none !important; }
        }
        
        .certificate-container { max-width: 210mm; margin: 0 auto; padding: 30px; background: white; min-height: 297mm; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 50px; }
        .student-photo { width: 120px; height: 150px; border: 2px solid #333; }
        .logo { width: 140px; height: 140px; }
        .title { font-size: 26px; font-weight: bold; color: #000; text-align: center; margin-bottom: 40px; }
        .content { font-size: 17px; line-height: 2; color: #000; }
        .student-info { font-size: 19px; line-height: 2.5; margin-bottom: 30px; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
        .label { font-weight: 900; }
        .signatures { display: flex; justify-content: space-around; margin-top: 80px; padding-top: 20px; }
        .signature { text-align: center; }
        .print-button { position: fixed; top: 20px; left: 20px; z-index: 1000; background: linear-gradient(135deg, #0A2647, #1e3a52); color: white; border: none; border-radius: 12px; padding: 12px 24px; font-size: 16px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 15px rgba(10, 38, 71, 0.3); transition: all 0.3s ease; }
        .print-button:hover { background: linear-gradient(135deg, #1e3a52, #0A2647); transform: translateY(-2px); }
      `}</style>

      <button onClick={() => window.print()} className="print-button no-print">
        🖨️ طباعة الإفادة
      </button>

      <div className="certificate-container">
        {/* Header - صورة على اليسار ولوجو على اليمين */}
        <div className="header">
          <div className="student-photo">
            {trainee.photoUrl ? (
              <img
                src={getImageUrl(trainee.photoUrl)}
                alt={trainee.nameAr}
                style={{width: '100%', height: '100%', objectFit: 'cover', border: '2px solid #333'}}
              />
            ) : (
              <div style={{width: '120px', height: '150px', background: '#f5f5f5', border: '2px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <span style={{fontSize: '48px'}}>👤</span>
              </div>
            )}
          </div>
          
          <div className="logo">
            {settings?.centerLogo ? (
              <img
                src={getImageUrl(settings.centerLogo)}
                alt="Logo"
                style={{width: '100%', height: '100%', objectFit: 'contain'}}
              />
            ) : (
              <div style={{width: '140px', height: '140px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '50px'}}>
                🏛️
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="title">
          تشهد / {settings?.centerName || 'مركز تدريب مهني'}... بأن
        </div>

        {/* Student Info */}
        <div className="student-info">
          <p><span className="label">المتدرب/</span> {trainee.nameAr}</p>
          <p><span className="label">مقيد لدينا :</span> بالعام التدريبي {trainee.academicYear || new Date().getFullYear() + '/' + (new Date().getFullYear() + 1)}</p>
          
          <div className="info-row">
            <div style={{flex: 1}}><span className="label">الدولة:</span> {trainee.country || 'جمهورية مصر العربية'}</div>
            <div style={{flex: 1, textAlign: 'left'}}><span className="label">الرقم القومي:</span> {trainee.nationalId}</div>
          </div>
          
          <p><span className="label">برنامج:</span> {trainee.program?.nameAr}</p>
        </div>

        {/* Content */}
        <div className="content">
          <p style={{textAlign: 'justify', marginBottom: '20px'}}>
            لا يوجد لدينا مانع من تدريب المتدرب لديكم دون أدنى مسئولية على المركز
          </p>
          <p style={{textAlign: 'justify', marginBottom: '20px'}}>
            مع أفادتنا بتقرير في نهاية مدة التدريب موضحا فيه نسبة الحضور والالتزام و مستوى المتدرب المعني
          </p>
          <p style={{textAlign: 'right', marginTop: '40px'}}>
            <span className="label">تحريراً في:</span> {currentDate}
          </p>
        </div>

        {/* Signatures */}
        <div className="signatures">
          <div className="signature">
            <div style={{borderTop: '2px solid #000', width: '150px', margin: '0 auto 10px'}}></div>
            <p style={{fontWeight: 'bold'}}>مدير المركز</p>
            <p style={{fontSize: '14px', color: '#666'}}>{settings?.centerManagerName || ''}</p>
          </div>
          <div className="signature">
            <div style={{borderTop: '2px solid #000', width: '150px', margin: '0 auto 10px'}}></div>
            <p style={{fontWeight: 'bold'}}>شؤون المتدربين</p>
          </div>
          <div className="signature">
            <div style={{borderTop: '2px solid #000', width: '150px', margin: '0 auto 10px'}}></div>
            <p style={{fontWeight: 'bold'}}>مسئول البرنامج</p>
          </div>
        </div>
      </div>
    </div>
  );
}