'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { getSystemSettings } from '@/app/lib/api/settings';
import { getImageUrl } from '@/lib/api';

export default function NotDeliveredStudyMaterialsPrint() {
  const params = useParams();
  const materialId = params.id as string;
  
  const [material, setMaterial] = useState<any>(null);
  const [allTrainees, setAllTrainees] = useState<any[]>([]);
  const [deliveredTrainees, setDeliveredTrainees] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [includePhone, setIncludePhone] = useState(true);

  useEffect(() => {
    if (materialId) {
      // قراءة query parameter
      const searchParams = new URLSearchParams(window.location.search);
      const phoneParam = searchParams.get('includePhone');
      setIncludePhone(phoneParam === 'true');
      fetchData();
    }
  }, [materialId]);

  const fetchData = async () => {
    try {
      const [materialData, deliveriesData, settingsData] = await Promise.all([
        fetchAPI(`/study-materials/${materialId}`),
        fetchAPI(`/study-materials/deliveries/list?studyMaterialId=${materialId}&limit=10000`),
        getSystemSettings(),
      ]);
      
      setMaterial(materialData);
      setSettings(settingsData);
      
      // جلب المستلمين فعلياً
      const delivered = deliveriesData.deliveries?.filter((d: any) => 
        d.status === 'DELIVERED'
      ).map((d: any) => d.traineeId) || [];
      
      setDeliveredTrainees(delivered);
      
      // جلب جميع المتدربين في البرنامج
      if (materialData.programId) {
        const traineesResponse = await fetchAPI(`/trainees?programId=${materialData.programId}&limit=10000`);
        const traineesData = traineesResponse.data || traineesResponse || [];
        setAllTrainees(traineesData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && material) {
      setTimeout(() => window.print(), 500);
    }
  }, [loading, material]);

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

  if (!material) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-red-600 text-xl">لم يتم العثور على الأداة</p>
        </div>
      </div>
    );
  }

  // فلترة المتدربين الغير مستلمين
  const notDeliveredTrainees = allTrainees.filter(trainee => 
    !deliveredTrainees.includes(trainee.id)
  );

  return (
    <div className="min-h-screen bg-white text-black font-cairo" dir="rtl" style={{margin: 0, padding: 0}}>
      <style jsx global>{`
        * { box-sizing: border-box; }
        html, body { margin: 0 !important; padding: 0 !important; overflow-x: hidden; }
        
        @media print {
          body { font-family: 'Cairo', 'Arial', sans-serif !important; direction: rtl !important; margin: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .print-button { display: none !important; }
          @page { size: A4 portrait; margin: 15mm; }
        }
        
        .print-container { max-width: 210mm; margin: 0 auto; padding: 20px; background: white; }
        .header { text-align: center; border-bottom: 3px solid #0A2647; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { width: 100px; height: 100px; margin: 0 auto 15px; background: #f0f0f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40px; }
        .title { font-size: 28px; font-weight: bold; color: #0A2647; margin: 15px 0; }
        .subtitle { font-size: 20px; color: #666; margin: 10px 0; }
        .section { margin: 25px 0; page-break-inside: avoid; }
        .section-title { font-size: 18px; font-weight: bold; color: #0A2647; margin-bottom: 15px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
        .data-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 11px; }
        .data-table th, .data-table td { border: 1px solid #ddd; padding: 8px 6px; text-align: right; }
        .data-table th { background: #f5f5f5; font-weight: bold; font-size: 12px; }
        .data-table tr:nth-child(even) { background: #fafafa; }
        .footer { text-align: center; border-top: 2px solid #ddd; padding-top: 15px; margin-top: 40px; font-size: 11px; color: #666; }
        .print-button { position: fixed; top: 20px; left: 20px; z-index: 1000; background: linear-gradient(135deg, #0A2647, #1e3a52); color: white; border: none; border-radius: 12px; padding: 12px 24px; font-size: 16px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 15px rgba(10, 38, 71, 0.3); transition: all 0.3s ease; }
        .print-button:hover { background: linear-gradient(135deg, #1e3a52, #0A2647); transform: translateY(-2px); }
      `}</style>

      <button onClick={() => window.print()} className="print-button no-print">
        🖨️ طباعة التقرير
      </button>

      <div className="print-container">
        {/* Header */}
        <div className="header">
          <div className="logo">
            {settings?.centerLogo ? (
              <img 
                src={getImageUrl(settings.centerLogo)} 
                alt="Logo" 
                style={{width: '100%', height: '100%', objectFit: 'contain'}}
                onError={(e) => { 
                  (e.target as any).style.display = 'none'; 
                  if (e.currentTarget.parentElement) e.currentTarget.parentElement.innerHTML = '🏛️'; 
                }} 
              />
            ) : '🏛️'}
          </div>
          <h1 className="title">{settings?.centerName || 'مركز تدريب مهني'}</h1>
          <h2 className="subtitle">المتدربون الغير مستلمين</h2>
          <div style={{background: '#f9f9f9', border: '1px solid #ddd', padding: '12px', borderRadius: '5px', display: 'inline-block', marginTop: '15px'}}>
            <p style={{fontSize: '16px', fontWeight: 'bold', color: '#0A2647', marginBottom: '5px'}}>{material.name}</p>
            <p style={{fontSize: '12px', color: '#666'}}>
              البرنامج: {material.program?.nameAr}
            </p>
          </div>
          <div style={{marginTop: '10px', fontSize: '12px', color: '#888'}}>
            {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Not Delivered Table */}
        <div className="section">
          <h3 className="section-title">قائمة الغير مستلمين ({notDeliveredTrainees.length} متدرب)</h3>
          
          {notDeliveredTrainees.length === 0 ? (
            <div style={{textAlign: 'center', padding: '40px', color: '#666'}}>
              جميع المتدربين استلموا الأداة
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{width: '50px'}}>#</th>
                  <th>اسم المتدرب</th>
                  <th style={{width: '150px'}}>الرقم القومي</th>
                  {includePhone && <th style={{width: '120px'}}>رقم الهاتف</th>}
                  <th style={{width: '120px'}}>التوقيع</th>
                </tr>
              </thead>
              <tbody>
                {notDeliveredTrainees.map((trainee, index) => (
                  <tr key={trainee.id}>
                    <td style={{fontWeight: 'bold', textAlign: 'center'}}>{index + 1}</td>
                    <td style={{fontWeight: 'bold'}}>{trainee.nameAr}</td>
                    <td style={{fontFamily: 'monospace'}}>{trainee.nationalId}</td>
                    {includePhone && <td style={{fontFamily: 'monospace', direction: 'ltr', textAlign: 'left'}}>{trainee.phone}</td>}
                    <td style={{textAlign: 'center', background: '#f9f9f9'}}></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="footer">
          <div style={{borderTop: '1px solid #ccc', paddingTop: '15px'}}>
            <p style={{margin: '5px 0', fontWeight: 'bold'}}>{settings?.centerName || 'مركز تدريب مهني'}</p>
            <p style={{margin: '5px 0'}}>نظام إدارة الأدوات الدراسية</p>
            <p style={{margin: '5px 0'}}>تم إنشاء هذا التقرير بتاريخ: {new Date().toLocaleDateString('ar-EG')} - الساعة: {new Date().toLocaleTimeString('ar-EG')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}