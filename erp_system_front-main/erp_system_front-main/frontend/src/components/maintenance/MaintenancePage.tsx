import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Construction } from 'lucide-react';

interface MaintenancePageProps {
  title?: string;
  description?: string;
  maintenanceStart?: string;
  maintenanceEnd?: string;
}

const MaintenancePage: React.FC<MaintenancePageProps> = ({
  title = 'نظام تحت الصيانة',
  description = 'نحن نعمل على تحسين خدماتنا. سنعود قريباً.',
  maintenanceStart,
  maintenanceEnd,
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
            <Construction className="h-6 w-6 text-yellow-600" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {maintenanceStart && maintenanceEnd && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-md">
              <p className="text-sm text-yellow-700">
                توقيت الصيانة: من {maintenanceStart} إلى {maintenanceEnd}
              </p>
            </div>
          )}
          <p className="mt-4 text-sm text-gray-500">
            شكراً لانتظاركم. سنكون على استعداد قريباً.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MaintenancePage;