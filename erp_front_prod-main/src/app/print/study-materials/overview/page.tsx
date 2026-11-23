'use client';

import { useState, useEffect } from 'react';
import { fetchAPI } from '@/lib/api';
import { getSystemSettings } from '@/app/lib/api/settings';
import { getImageUrl } from '@/lib/api';

export default function StudyMaterialsOverviewPrint() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [materialsResponse, settingsData] = await Promise.all([
        fetchAPI('/study-materials?limit=10000'),
        getSystemSettings(),
      ]);
      
      setMaterials(materialsResponse.materials || []);
      setSettings(settingsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && materials.length > 0) {
      setTimeout(() => window.print(), 500);
    }
  }, [loading, materials]);

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


  return (
    <div className="min-h-screen bg-white text-black font-cairo" dir="rtl" style={{margin: 0, padding: 0}}>
      <style jsx global>{`
        * { box-sizing: border-box; }
        html, body { margin: 0 !important; padding: 0 !important; overflow-x: hidden; }
        
        @media print {
          body { font-family: 'Cairo', 'Arial', sans-serif !important; direction: rtl !important; margin: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .print-button { display: none !important; }
          @page { size: A4 landscape; margin: 15mm; }
        }
        
        .print-container { max-width: 297mm; margin: 0 auto; padding: 20px; background: white; }
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
          <h2 className="subtitle">تقرير الأدوات الدراسية الشامل</h2>
          <div style={{marginTop: '10px', fontSize: '12px', color: '#888'}}>
            {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Materials Table */}
        <div className="section">
          <h3 className="section-title">تفاصيل الأدوات الدراسية</h3>
          
          {materials.length === 0 ? (
            <div style={{textAlign: 'center', padding: '40px', color: '#666'}}>
              لا توجد أدوات دراسية
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{width: '50px'}}>#</th>
                  <th>اسم الأداة</th>
                  <th style={{width: '150px'}}>البرنامج</th>
                  <th style={{width: '80px'}}>الكمية</th>
                  <th style={{width: '80px'}}>التسليمات</th>
                  <th style={{width: '100px'}}>الرسم المرتبط</th>
                  <th style={{width: '80px'}}>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((material, index) => (
                  <tr key={material.id}>
                    <td style={{fontWeight: 'bold', textAlign: 'center'}}>{index + 1}</td>
                    <td style={{fontWeight: 'bold'}}>
                      {material.name}
                      {material.nameEn && <div style={{fontSize: '10px', color: '#666', fontWeight: 'normal'}}>{material.nameEn}</div>}
                    </td>
                    <td>{material.program?.nameAr || '-'}</td>
                    <td style={{textAlign: 'center', fontWeight: 'bold'}}>{material.quantity}</td>
                    <td style={{textAlign: 'center', fontWeight: 'bold'}}>{material._count?.deliveries || 0}</td>
                    <td style={{fontSize: '10px'}}>
                      {material.linkedFee ? (
                        <span style={{background: '#fef3c7', padding: '2px 6px', borderRadius: '4px', color: '#92400e'}}>
                          {material.linkedFee.name}
                        </span>
                      ) : (
                        <span style={{color: '#059669'}}>مجاني</span>
                      )}
                    </td>
                    <td style={{textAlign: 'center'}}>
                      <span style={{
                        background: material.isActive ? '#d1fae5' : '#fee2e2',
                        color: material.isActive ? '#065f46' : '#991b1b',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 'bold'
                      }}>
                        {material.isActive ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
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