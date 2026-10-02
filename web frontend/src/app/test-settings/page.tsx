'use client';

import { useState, useEffect } from 'react';
import { getSystemSettings } from '@/app/lib/api/settings';
import { getImageUrl } from '@/lib/api';

export default function TestSettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const settingsData = await getSystemSettings();
        console.log('Raw settings data:', settingsData);
        setSettings(settingsData);
      } catch (err) {
        console.error('Error fetching settings:', err);
        setError(err instanceof Error ? err.message : 'حدث خطأ');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  if (loading) return <div className="p-8">جاري التحميل...</div>;
  if (error) return <div className="p-8 text-red-500">خطأ: {error}</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">اختبار إعدادات النظام</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">البيانات الخام:</h2>
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
          {JSON.stringify(settings, null, 2)}
        </pre>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">العرض المنسق:</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium mb-2">اسم المركز:</h3>
            <p className="text-gray-700 bg-gray-50 p-3 rounded">
              {settings?.centerName || 'غير محدد'}
            </p>
          </div>

          <div>
            <h3 className="font-medium mb-2">اسم المدير:</h3>
            <p className="text-gray-700 bg-gray-50 p-3 rounded">
              {settings?.centerManagerName || 'غير محدد'}
            </p>
          </div>

          <div>
            <h3 className="font-medium mb-2">العنوان:</h3>
            <p className="text-gray-700 bg-gray-50 p-3 rounded">
              {settings?.centerAddress || 'غير محدد'}
            </p>
          </div>

          <div>
            <h3 className="font-medium mb-2">مسار اللوجو:</h3>
            <p className="text-gray-700 bg-gray-50 p-3 rounded break-all">
              {settings?.centerLogo || 'غير محدد'}
            </p>
          </div>
        </div>

        {settings?.centerLogo && (
          <div className="mt-6">
            <h3 className="font-medium mb-2">معاينة اللوجو:</h3>
            <div className="border rounded p-4">
              <img 
                src={getImageUrl(settings.centerLogo)} 
                alt="شعار المركز"
                className="max-w-xs max-h-32 object-contain"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = '<p class="text-red-500">فشل تحميل الصورة</p>';
                  }
                }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              URL المُنسق: {getImageUrl(settings.centerLogo)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
