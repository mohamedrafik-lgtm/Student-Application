'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { getTraineeAttendanceDetails } from '@/lib/attendance-records-api';
import { getSystemSettings } from '@/app/lib/api/settings';
import { getImageUrl } from '@/lib/api';

export default function PrintAttendanceRecordPage() {
  const params = useParams();
  const traineeId = params.id as string;
  
  const [trainee, setTrainee] = useState<any>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [stats, setStats] = useState<any>({ present: 0, absent: 0, late: 0, excused: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        const [traineeData, attendanceData, settingsData] = await Promise.all([
          fetchAPI(`/trainees/${traineeId}`),
          getTraineeAttendanceDetails(parseInt(traineeId)),
          getSystemSettings(),
        ]);

        setTrainee(traineeData);
        setSettings(settingsData);
        
        console.log('Attendance Data:', attendanceData);
        
        // استخراج السجلات من البنية المختلفة
        let records: any[] = [];
        
        if (Array.isArray(attendanceData)) {
          records = attendanceData;
        } else if (attendanceData && typeof attendanceData === 'object') {
          // قد يكون object يحتوي على byContent أو مفاتيح أخرى
          if (attendanceData.records && Array.isArray(attendanceData.records)) {
            records = attendanceData.records;
          } else if (attendanceData.data && Array.isArray(attendanceData.data)) {
            records = attendanceData.data;
          } else if (attendanceData.byContent) {
            // تجميع من byContent
            const allRecords: any[] = [];
            Object.values(attendanceData.byContent).forEach((content: any) => {
              if (content.records && Array.isArray(content.records)) {
                allRecords.push(...content.records);
              }
            });
            records = allRecords;
          } else {
            // محاولة أخيرة: تحويل values إلى array
            records = Object.values(attendanceData).flat().filter((item: any) =>
              item && typeof item === 'object' && item.id && item.status
            );
          }
        }
        
        console.log('Extracted records:', records.length, records);
        
        setAttendanceRecords(records);
        
        // حساب الإحصائيات
        const calculatedStats = {
          present: records.filter((a: any) => a.status === 'PRESENT').length,
          absent: records.filter((a: any) => a.status === 'ABSENT').length,
          late: records.filter((a: any) => a.status === 'LATE').length,
          excused: records.filter((a: any) => a.status === 'EXCUSED').length,
        };
        setStats(calculatedStats);
        
        console.log('Stats:', calculatedStats);
        
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (traineeId) {
      loadData();
    }
  }, [traineeId]);

  useEffect(() => {
    if (!isLoading && trainee) {
      setTimeout(() => window.print(), 500);
    }
  }, [isLoading, trainee]);

  const getStatusText = (status: string) => {
    const labels: Record<string, string> = {
      PRESENT: 'حاضر',
      ABSENT: 'غائب',
      LATE: 'متأخر',
      EXCUSED: 'غياب بعذر',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PRESENT: '#10b981',
      ABSENT: '#ef4444',
      LATE: '#f59e0b',
      EXCUSED: '#6b7280',
    };
    return colors[status] || '#6b7280';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل التقرير...</p>
        </div>
      </div>
    );
  }

  if (!trainee) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-red-600 text-lg">❌ المتدرب غير موجود</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black" dir="rtl">
      <style jsx global>{`
        @page {
          size: A4;
          margin: 15mm;
        }

        @media print {
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print { display: none !important; }
          .print-button { display: none !important; }
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
          justify-center;
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

        .trainee-info {
          background: #f9f9f9;
          border: 2px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .info-item {
          padding: 10px;
        }

        .info-label {
          font-size: 12px;
          color: #666;
          margin-bottom: 5px;
        }

        .info-value {
          font-size: 14px;
          font-weight: bold;
          color: #333;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          margin: 20px 0;
        }

        .stat-card {
          text-align: center;
          padding: 15px;
          background: #f9f9f9;
          border: 2px solid #ddd;
          border-radius: 8px;
        }

        .stat-value {
          font-size: 32px;
          font-weight: bold;
          margin-bottom: 8px;
        }

        .stat-label {
          font-size: 13px;
          color: #666;
          font-weight: 600;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          font-size: 12px;
        }

        .data-table th,
        .data-table td {
          border: 1px solid #ddd;
          padding: 10px 8px;
          text-align: right;
        }

        .data-table th {
          background: #0A2647;
          color: white;
          font-weight: bold;
          font-size: 13px;
        }

        .data-table tr:nth-child(even) {
          background: #fafafa;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: bold;
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
      `}</style>

      {/* Print Button */}
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
                  (e.target as HTMLElement).style.display = 'none';
                  if (e.currentTarget.parentElement) {
                    e.currentTarget.parentElement.innerHTML = '🏛️';
                  }
                }}
              />
            ) : '🏛️'}
          </div>
          <h1 className="title">{settings?.centerName || 'مركز تدريب مهني'}</h1>
          <h2 className="subtitle">تقرير الحضور والغياب</h2>
          <div className="info-label" style={{marginTop: '10px'}}>
            تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
        </div>

        {/* Trainee Info */}
        <div className="trainee-info">
          <div className="info-item">
            <div className="info-label">اسم المتدرب</div>
            <div className="info-value">{trainee.nameAr}</div>
          </div>
          <div className="info-item">
            <div className="info-label">الرقم القومي</div>
            <div className="info-value">{trainee.nationalId}</div>
          </div>
          <div className="info-item">
            <div className="info-label">البرنامج التدريبي</div>
            <div className="info-value">{trainee.program?.nameAr}</div>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card" style={{borderColor: '#10b981'}}>
            <div className="stat-value" style={{color: '#10b981'}}>{stats.present || 0}</div>
            <div className="stat-label">حاضر</div>
          </div>
          <div className="stat-card" style={{borderColor: '#ef4444'}}>
            <div className="stat-value" style={{color: '#ef4444'}}>{stats.absent || 0}</div>
            <div className="stat-label">غائب</div>
          </div>
          <div className="stat-card" style={{borderColor: '#f59e0b'}}>
            <div className="stat-value" style={{color: '#f59e0b'}}>{stats.late || 0}</div>
            <div className="stat-label">متأخر</div>
          </div>
          <div className="stat-card" style={{borderColor: '#6b7280'}}>
            <div className="stat-value" style={{color: '#6b7280'}}>{stats.excused || 0}</div>
            <div className="stat-label">غياب بعذر</div>
          </div>
        </div>

        {/* Attendance Table */}
        <div style={{marginTop: '30px'}}>
          <h3 style={{fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', color: '#0A2647'}}>
            سجل الحضور التفصيلي
          </h3>
          
          {attendanceRecords.length === 0 ? (
            <div style={{textAlign: 'center', padding: '40px', color: '#666'}}>
              لا توجد سجلات حضور لهذا المتدرب
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{width: '50px'}}>#</th>
                  <th>التاريخ</th>
                  <th>اليوم</th>
                  <th>المادة</th>
                  <th>النوع</th>
                  <th>الحالة</th>
                  <th>ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(attendanceRecords) && attendanceRecords.map((record: any, index: number) => (
                  <tr key={record.id}>
                    <td style={{textAlign: 'center', fontWeight: 'bold'}}>{index + 1}</td>
                    <td>{new Date(record.session?.date || record.createdAt).toLocaleDateString('ar-EG')}</td>
                    <td>{new Date(record.session?.date || record.createdAt).toLocaleDateString('ar-EG', { weekday: 'long' })}</td>
                    <td>
                      {record.session?.scheduleSlot?.content?.name ||
                       record.session?.content?.name ||
                       record.content?.name ||
                       '-'}
                    </td>
                    <td>
                      {record.session?.scheduleSlot?.type === 'THEORY' ? 'نظري' :
                       record.session?.scheduleSlot?.type === 'PRACTICAL' ? 'عملي' :
                       record.session?.type === 'THEORY' ? 'نظري' :
                       record.session?.type === 'PRACTICAL' ? 'عملي' : '-'}
                    </td>
                    <td>
                      <span 
                        className="status-badge"
                        style={{
                          backgroundColor: getStatusColor(record.status) + '20',
                          color: getStatusColor(record.status),
                          border: `1px solid ${getStatusColor(record.status)}`
                        }}
                      >
                        {getStatusText(record.status)}
                      </span>
                    </td>
                    <td style={{fontSize: '10px'}}>{record.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          borderTop: '2px solid #ddd',
          paddingTop: '20px',
          marginTop: '40px',
          fontSize: '11px',
          color: '#666'
        }}>
          <p style={{fontWeight: 'bold', marginBottom: '5px'}}>
            {settings?.centerName || 'مركز تدريب مهني'}
          </p>
          <p>نظام إدارة الحضور والغياب</p>
          <p>تم إنشاء هذا التقرير في: {new Date().toLocaleString('ar-EG')}</p>
          <p style={{marginTop: '10px', fontSize: '10px'}}>
            هذا التقرير سري ومخصص للاستخدام الداخلي فقط
          </p>
        </div>
      </div>
    </div>
  );
}