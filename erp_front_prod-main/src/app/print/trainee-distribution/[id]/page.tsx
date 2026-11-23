'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { getDistribution, type TraineeDistribution } from '@/lib/trainee-distribution-api';
import { getSystemSettings } from '@/app/lib/api/settings';
import { getImageUrl } from '@/lib/api';
import { usePermissions } from '@/hooks/usePermissions';

export default function PrintDistributionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const roomId = searchParams.get('roomId');
  const { hasPermission } = usePermissions();
  
  // قراءة خيارات الطباعة من URL
  const includeName = searchParams.get('name') !== 'false';
  const includeNationalId = searchParams.get('nationalId') !== 'false';
  const includePhone = searchParams.get('phone') === 'true';
  const includeGuardianPhone = searchParams.get('guardianPhone') === 'true';
  
  const [distribution, setDistribution] = useState<TraineeDistribution | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // التحقق من صلاحية عرض أرقام الهواتف
  const canViewPhone = hasPermission('dashboard.trainees', 'view_phone');

  // جلب البيانات
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [distributionData, settingsData] = await Promise.all([
        getDistribution(id),
        getSystemSettings(),
      ]);
      setDistribution(distributionData);
      setSettings(settingsData);
    } catch (error) {
      console.error('خطأ في جلب البيانات:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  // طباعة تلقائية عند تحميل الصفحة
  useEffect(() => {
    if (!isLoading && distribution) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [isLoading, distribution]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#0A2647] mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل التقرير...</p>
        </div>
      </div>
    );
  }

  if (!distribution) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">غير موجود</h2>
          <p className="text-gray-600">التوزيع المطلوب غير موجود</p>
        </div>
      </div>
    );
  }

  // فلترة المجموعات
  const roomsToDisplay = roomId 
    ? distribution.rooms.filter(room => room.id === roomId)
    : distribution.rooms;

  const totalTrainees = roomsToDisplay.reduce((sum, room) => sum + (room.assignments?.length || 0), 0);

  return (
    <div className="min-h-screen bg-white text-black font-cairo" dir="rtl" style={{margin: 0, padding: 0}}>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }
        
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          overflow-x: hidden;
        }
        
        .print-only-layout {
          margin: 0 !important;
          padding: 0 !important;
        }
        
        @media print {
          body { 
            font-family: 'Cairo', 'Arial', sans-serif !important;
            direction: rtl !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .no-print { display: none !important; }
          .print-button { display: none !important; }
          
          @page { 
            size: A4;
            margin: 15mm;
          }
          
          .page-break {
            page-break-before: always;
          }
          
          .data-table {
            font-size: 9px !important;
          }
          
          .data-table th,
          .data-table td {
            padding: 4px !important;
            font-size: 9px !important;
          }
        }
        
        .print-container {
          max-width: 210mm;
          margin: 0 auto;
          padding: 20px;
          background: white;
        }
        
        .header {
          text-align: center;
          border-bottom: 3px solid #0A2647;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        
        .logo {
          width: 100px;
          height: 100px;
          margin: 0 auto 15px;
          background: #f0f0f0;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
        }
        
        .title {
          font-size: 28px;
          font-weight: bold;
          color: #0A2647;
          margin: 15px 0;
        }
        
        .subtitle {
          font-size: 20px;
          color: #666;
          margin: 10px 0;
        }
        
        .info-line {
          font-size: 14px;
          color: #666;
          margin: 5px 0;
        }
        
        .section {
          margin: 25px 0;
          page-break-inside: avoid;
        }
        
        .room-header {
          background: #f5f5f5;
          padding: 15px;
          border: 2px solid #0A2647;
          border-radius: 8px;
          margin-bottom: 15px;
        }
        
        .room-title {
          font-size: 22px;
          font-weight: bold;
          color: #0A2647;
        }
        
        .room-info {
          font-size: 14px;
          color: #666;
          margin-top: 5px;
        }
        
        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          font-size: 11px;
        }
        
        .data-table th,
        .data-table td {
          border: 1px solid #ddd;
          padding: 8px 6px;
          text-align: right;
        }
        
        .data-table th {
          background: #0A2647;
          color: white;
          font-weight: bold;
          font-size: 12px;
        }
        
        .data-table tr:nth-child(even) {
          background: #fafafa;
        }
        
        .footer-note {
          text-align: center;
          margin-top: 20px;
          font-size: 11px;
          color: #888;
          border-top: 1px solid #ddd;
          padding-top: 10px;
        }
        
        .print-button {
          position: fixed;
          top: 20px;
          left: 20px;
          z-index: 1000;
          background: linear-gradient(135deg, #0A2647, #1e3a52);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 12px 24px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(10, 38, 71, 0.3);
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .print-button:hover {
          background: linear-gradient(135deg, #1e3a52, #0A2647);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(10, 38, 71, 0.4);
        }
        
        .print-icon {
          width: 20px;
          height: 20px;
          fill: currentColor;
        }
        
        .type-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 15px;
          font-size: 14px;
          font-weight: bold;
          margin: 10px 0;
        }
        
        .type-theory {
          background: #dbeafe;
          color: #1e40af;
        }
        
        .type-practical {
          background: #d1fae5;
          color: #065f46;
        }
        
        @media print {
          .print-button {
            display: none !important;
          }
        }
      `}</style>

      {/* زر الطباعة */}
      <button onClick={handlePrint} className="print-button">
        <svg className="print-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 9V2H18V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6 18H4C3.44772 18 3 17.5523 3 17V11C3 10.4477 3.44772 10 4 10H20C20.5523 10 21 10.4477 21 11V17C21 17.5523 20.5523 18 20 18H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M18 14H6V22H18V14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        طباعة القائمة
      </button>

      <div className="print-container">
        {/* رأس التقرير */}
        <div className="header">
          <div className="logo">
            {settings && settings.centerLogo && settings.centerLogo.trim() !== '' ? (
              <img 
                src={getImageUrl(settings.centerLogo)} 
                alt="شعار المركز" 
                style={{width: '100%', height: '100%', objectFit: 'contain'}}
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = '🏛️';
                  }
                }}
              />
            ) : (
              '🏛️'
            )}
          </div>
          <h1 className="title">
            {settings && settings.centerName && settings.centerName.trim() !== '' 
              ? settings.centerName 
              : 'مركز طيبة للتدريب المهني'}
          </h1>
          <h2 className="subtitle">توزيع المتدربين على المجموعات</h2>
          <div className="info-line">
            <strong>البرنامج التدريبي:</strong> {distribution.program.nameAr}
          </div>
          <div className={distribution.type === 'THEORY' ? 'type-badge type-theory' : 'type-badge type-practical'}>
            {distribution.type === 'THEORY' ? '📚 مجموعات النظري' : '🔬 مجموعات العملي'}
          </div>
          <div className="info-line">
            <strong>العام الدراسي:</strong> {distribution.academicYear}
          </div>
          <div className="info-line">
            <strong>عدد المجموعات:</strong> {roomId ? '1' : distribution.numberOfRooms}
            {' | '}
            <strong>إجمالي المتدربين:</strong> {totalTrainees}
          </div>
          <div className="info-line">
            <strong>تاريخ الإصدار:</strong> {new Date().toLocaleDateString('ar-SA', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>

        {/* المجموعات */}
        {roomsToDisplay.length > 0 ? (
          roomsToDisplay.map((room, index) => (
            <div
              key={room.id}
              className={`section ${index > 0 ? 'page-break' : ''}`}
            >
              {/* رأس المجموعة */}
              <div className="room-header">
                <div className="room-title">{room.roomName}</div>
                <div className="room-info">عدد المتدربين: {room.assignments?.length || 0}</div>
              </div>

              {/* جدول المتدربين */}
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{width: '50px'}}>الترتيب</th>
                    {includeName && <th>الاسم</th>}
                    {includeNationalId && <th style={{width: '130px'}}>الرقم القومي</th>}
                    {includePhone && <th style={{width: '110px'}}>هاتف المتدرب</th>}
                    {includeGuardianPhone && <th style={{width: '110px'}}>هاتف ولي الأمر</th>}
                    <th style={{width: '100px'}}>التوقيع</th>
                  </tr>
                </thead>
                <tbody>
                  {room.assignments?.map((assignment) => (
                    <tr key={assignment.id}>
                      <td style={{textAlign: 'center', fontWeight: 'bold'}}>{assignment.orderNumber}</td>
                      {includeName && <td style={{fontWeight: 'bold'}}>{assignment.trainee.nameAr}</td>}
                      {includeNationalId && <td style={{fontFamily: 'monospace', fontSize: '10px'}}>{assignment.trainee.nationalId}</td>}
                      {includePhone && (
                        <td style={{fontFamily: 'monospace', fontSize: '9px', direction: 'ltr', textAlign: 'center'}}>
                          {assignment.trainee.phone || '-'}
                        </td>
                      )}
                      {includeGuardianPhone && (
                        <td style={{fontFamily: 'monospace', fontSize: '9px', direction: 'ltr', textAlign: 'center'}}>
                          {assignment.trainee.guardianPhone || '-'}
                        </td>
                      )}
                      <td></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* تذييل الصفحة */}
              <div className="footer-note">
                {roomId ? (
                  <span>تم الإنشاء في {new Date().toLocaleDateString('ar-SA')} | نظام إدارة المتدربين</span>
                ) : (
                  <span>صفحة {index + 1} من {roomsToDisplay.length} | تم الإنشاء في {new Date().toLocaleDateString('ar-SA')} | نظام إدارة المتدربين</span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center" style={{padding: '50px 0'}}>
            <p style={{color: '#666', fontSize: '18px'}}>المجموعة المطلوبة غير موجودة</p>
          </div>
        )}
      </div>
    </div>
  );
}
