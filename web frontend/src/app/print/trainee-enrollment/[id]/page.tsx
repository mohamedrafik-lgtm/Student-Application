'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { getSystemSettings } from '@/app/lib/api/settings';
import PrintStyles from '../../components/PrintStyles';
import PrintButton from '../../components/PrintButton';
import PrintHeader from '../../components/PrintHeader';
import PrintFooter from '../../components/PrintFooter';
import PrintLoading from '../../components/PrintLoading';

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
    return <PrintLoading message="جاري تحميل البيانات..." />;
  }

  if (!trainee) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p style={{ color: '#991b1b', fontSize: 18 }}>لم يتم العثور على المتدرب</p>
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
    <div className="min-h-screen bg-white text-black font-cairo" dir="rtl" style={{ margin: 0, padding: 0 }}>
      <PrintStyles />
      <PrintButton label="طباعة إثبات القيد" />

      <div className="print-enrollment-container">
        {/* Info Header */}
        <div className="print-info-grid cols-2" style={{ fontSize: 18, lineHeight: 1.8, marginBottom: 50 }}>
          <div className="print-info-item" style={{ background: 'transparent', border: 'none' }}>
            <span style={{ fontWeight: 900 }}>الاسم:</span> {trainee.nameAr}
          </div>
          <div className="print-info-item" style={{ background: 'transparent', border: 'none', textAlign: 'left' }}>
            <span style={{ fontWeight: 900 }}>الرقم القومي:</span> {trainee.nationalId}
          </div>
        </div>

        <div className="print-info-grid cols-2" style={{ fontSize: 18, lineHeight: 1.8, marginTop: -30 }}>
          <div className="print-info-item" style={{ background: 'transparent', border: 'none' }}>
            <span style={{ fontWeight: 900 }}>القسم:</span> {trainee.program?.nameAr}
          </div>
          <div className="print-info-item" style={{ background: 'transparent', border: 'none', textAlign: 'left' }}>
            <span style={{ fontWeight: 900 }}>العام التدريبي:</span> {trainee.academicYear || new Date().getFullYear() + '/' + (new Date().getFullYear() + 1)}
          </div>
        </div>

        {/* Title */}
        <div className="print-header" style={{ border: 'none', margin: '60px 0 40px 0' }}>
          <div className="report-title" style={{ fontSize: 28 }}>مقيد/ة لدينا بالمركز</div>
        </div>

        {/* Content */}
        <div className="print-content-centered">
          <p style={{ marginBottom: 20 }}>
            و قد اعطيت له هذه الشهادة بناء على طلبه و تحت مسؤليته للتقديمها الى
          </p>
          <p style={{ marginBottom: 20 }}>
            من يهمه الامر
          </p>
        </div>

        {/* Date */}
        <div style={{ fontSize: 16, textAlign: 'right', marginTop: 60 }}>
          <p><span style={{ fontWeight: 900 }}>تحريراً في:</span> {currentDate}</p>
        </div>

        {/* Signatures */}
        <PrintFooter
          settings={settings}
          signatures={[
            { title: 'مدير المركز', name: settings?.centerManagerName || '' },
            { title: 'شؤون المتدربين' },
          ]}
        />
      </div>
    </div>
  );
}