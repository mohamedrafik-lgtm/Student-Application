'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { getSystemSettings } from '@/app/lib/api/settings';

export default function TraineeEnrollmentPrint() {
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
        
        .enrollment-container { max-width: 210mm; margin: 0 auto; padding: 40px; background: white; min-height: 297mm; }
        .info-header { display: flex; justify-content: space-between; margin-bottom: 50px; font-size: 18px; line-height: 1.8; }
        .title { font-size: 28px; font-weight: bold; color: #000; text-align: center; margin: 60px 0 40px 0; }
        .content { font-size: 18px; line-height: 2.2; color: #000; text-align: center; margin: 40px 0; }
        .date { font-size: 16px; text-align: right; margin-top: 60px; }
        .signatures { display: flex; justify-content: space-around; margin-top: 100px; }
        .signature { text-align: center; }
        .label { font-weight: 900; }
        .print-button { position: fixed; top: 20px; left: 20px; z-index: 1000; background: linear-gradient(135deg, #0A2647, #1e3a52); color: white; border: none; border-radius: 12px; padding: 12px 24px; font-size: 16px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 15px rgba(10, 38, 71, 0.3); transition: all 0.3s ease; }
        .print-button:hover { background: linear-gradient(135deg, #1e3a52, #0A2647); transform: translateY(-2px); }
      `}</style>

      <button onClick={() => window.print()} className="print-button no-print">
        🖨️ طباعة إثبات القيد
      </button>

      <div className="enrollment-container">
        {/* Info Header */}
        <div className="info-header">
          <div style={{flex: 1}}>
            <p><span className="label">الاسم:</span> {trainee.nameAr}</p>
          </div>
          <div style={{flex: 1, textAlign: 'left'}}>
            <p><span className="label">الرقم القومي:</span> {trainee.nationalId}</p>
          </div>
        </div>

        <div className="info-header" style={{marginTop: '-30px'}}>
          <div style={{flex: 1}}>
            <p><span className="label">القسم:</span> {trainee.program?.nameAr}</p>
          </div>
          <div style={{flex: 1, textAlign: 'left'}}>
            <p><span className="label">العام التدريبي:</span> {trainee.academicYear || new Date().getFullYear() + '/' + (new Date().getFullYear() + 1)}</p>
          </div>
        </div>

        {/* Title */}
        <div className="title">
          مقيد/ة لدينا بالمركز
        </div>

        {/* Content */}
        <div className="content">
          <p style={{marginBottom: '20px'}}>
            و قد اعطيت له هذه الشهادة بناء على طلبه و تحت مسؤليته للتقديمها الى
          </p>
          <p style={{marginBottom: '20px'}}>
            من يهمه الامر
          </p>
        </div>

        {/* Date */}
        <div className="date">
          <p><span className="label">تحريراً في:</span> {currentDate}</p>
        </div>

        {/* Signatures */}
        <div className="signatures">
          <div className="signature">
            <div style={{borderTop: '2px solid #000', width: '180px', margin: '0 auto 15px'}}></div>
            <p style={{fontWeight: 'bold', fontSize: '16px'}}>مدير المركز</p>
            <p style={{fontSize: '14px', color: '#666', marginTop: '5px'}}>{settings?.centerManagerName || ''}</p>
          </div>
          <div className="signature">
            <div style={{borderTop: '2px solid #000', width: '180px', margin: '0 auto 15px'}}></div>
            <p style={{fontWeight: 'bold', fontSize: '16px'}}>شؤون المتدربين</p>
          </div>
        </div>
      </div>
    </div>
  );
}