import React from 'react';

// قاموس ترجمة أسماء الحقول
const fieldTranslations: { [key: string]: string } = {
  // معلومات أساسية
  nameAr: 'الاسم بالعربية',
  nameEn: 'الاسم بالإنجليزية',
  title: 'العنوان',
  description: 'الوصف',
  price: 'السعر',
  duration: 'المدة',
  
  // معلومات المتدرب
  nationalId: 'الرقم القومي',
  idIssueDate: 'تاريخ إصدار الهوية',
  idExpiryDate: 'تاريخ انتهاء الهوية',
  birthDate: 'تاريخ الميلاد',
  gender: 'الجنس',
  nationality: 'الجنسية',
  religion: 'الدين',
  maritalStatus: 'الحالة الاجتماعية',
  
  // معلومات الاتصال
  phone: 'رقم الهاتف',
  email: 'البريد الإلكتروني',
  address: 'العنوان',
  residenceAddress: 'عنوان الإقامة',
  landline: 'الهاتف الأرضي',
  whatsapp: 'واتساب',
  facebook: 'فيسبوك',
  
  // معلومات الوصي
  guardianPhone: 'هاتف الوصي',
  guardianEmail: 'بريد الوصي',
  guardianJob: 'وظيفة الوصي',
  guardianRelation: 'صلة القرابة',
  guardianNationalId: 'الرقم القومي للوصي',
  
  // معلومات تعليمية
  educationType: 'نوع التعليم',
  schoolName: 'اسم المدرسة',
  graduationDate: 'تاريخ التخرج',
  totalGrade: 'المجموع الكلي',
  gradePercentage: 'النسبة المئوية',
  
  // الأنشطة
  sportsActivity: 'النشاط الرياضي',
  culturalActivity: 'النشاط الثقافي',
  educationalActivity: 'النشاط التعليمي',
  
  // معلومات البرنامج
  programType: 'نوع البرنامج',
  enrollmentType: 'نوع التسجيل',
  trainees: 'المتدربون',
  country: 'البلد',
  governorate: 'المحافظة',
  city: 'المدينة',
  
  // معلومات أخرى
  notes: 'ملاحظات',
  photoUrl: 'صورة شخصية',
  createdAt: 'تاريخ الإنشاء',
  updatedAt: 'تاريخ التحديث',
};

// دالة لترجمة الرسائل الإنجليزية
const translateMessage = (message: string) => {
  return message
    .replace(/Created news with title:/g, 'تم إنشاء خبر بعنوان:')
    .replace(/Created job with title:/g, 'تم إنشاء وظيفة بعنوان:')
    .replace(/Created trainee/g, 'تم إنشاء متدرب')
    .replace(/Created program/g, 'تم إنشاء برنامج')
    .replace(/Deleted user/g, 'تم حذف مستخدم')
    .replace(/Created/g, 'تم إنشاء')
    .replace(/Deleted/g, 'تم حذف')
    .replace(/Updated/g, 'تم تحديث')
    .replace(/with title:/g, 'بعنوان:')
    .replace(/news/g, 'خبر')
    .replace(/job/g, 'وظيفة')
    .replace(/trainee/g, 'متدرب')
    .replace(/program/g, 'برنامج')
    .replace(/user/g, 'مستخدم');
};

// دالة لترجمة أسماء الأدوار
const translateRole = (role: string) => {
  const roleTranslations: { [key: string]: string } = {
    'ADMIN': 'مدير النظام',
    'MARKETER': 'مسوق',
    'TRAINER': 'مدرب',
    'STUDENT': 'طالب',
    'USER': 'مستخدم',
    'admin': 'مدير النظام',
    'marketer': 'مسوق',
    'trainer': 'مدرب',
    'student': 'طالب',
    'user': 'مستخدم',
  };
  return roleTranslations[role] || role;
};

// Helper to format values for display
const formatValue = (value: any) => {
  if (value === null || value === undefined || value === '') {
    return <span className="text-gray-400 italic">فارغ</span>;
  }
  if (typeof value === 'boolean') {
    return value ? 
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">نعم</span> : 
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">لا</span>;
  }
  
  const date = new Date(value);
  if (typeof value === 'string' && !isNaN(date.getTime()) && value.includes('T')) {
      return <span className="font-mono text-sm">{date.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}</span>;
  }

  if (typeof value === 'object') {
    // Handle arrays specifically
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-gray-400 italic">فارغ</span>;
      }
      // If it's an array of objects with a name, display them as a list
      if (value.every(item => typeof item === 'object' && item !== null && (item.nameAr || item.nameEn || item.title))) {
        return (
          <div className="space-y-1">
            {value.map((item: any, index: number) => (
              <div key={item.id || index} className="flex items-center p-2 bg-white rounded border border-gray-200">
                <span className="w-6 h-6 bg-tiba-primary-100 text-tiba-primary-600 rounded-full flex items-center justify-center text-xs font-medium mr-2">
                  {index + 1}
                </span>
                <span className="text-sm text-gray-700">
                  {item.nameAr || item.nameEn || item.title}
                </span>
              </div>
            ))}
          </div>
        );
      }
    }
    // Fallback for other objects
    return <pre className="text-xs bg-gray-50 p-2 rounded-lg overflow-x-auto">{JSON.stringify(value, null, 2)}</pre>;
  }

  // ترجمة الأدوار إذا كانت القيمة نصية
  if (typeof value === 'string' && ['ADMIN', 'MARKETER', 'TRAINER', 'STUDENT', 'USER'].includes(value)) {
    return <span className="text-gray-700">{translateRole(value)}</span>;
  }

  return <span className="text-gray-700">{String(value)}</span>;
};

const getFieldName = (field: string) => {
  return fieldTranslations[field] || field;
};

const UpdateDetails = ({ before, after }: { before: any, after: any }) => {
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
    const changes: { field: string; from: any; to: any }[] = [];

    allKeys.forEach(key => {
        if (['id', 'updatedAt', 'password'].includes(key)) return;

        const valBefore = before[key];
        const valAfter = after[key];
        
        if (JSON.stringify(valBefore) !== JSON.stringify(valAfter)) {
            changes.push({
                field: key,
                from: valBefore,
                to: valAfter
            });
        }
    });

    if (changes.length === 0) {
        return (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">لم يتم تغيير أي بيانات.</p>
          </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-gray-200 border border-gray-200 rounded-lg">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                        <th className="px-4 py-3 font-semibold text-right text-gray-700">الحقل</th>
                        <th className="px-4 py-3 font-semibold text-right text-gray-700">القيمة القديمة</th>
                        <th className="px-4 py-3 font-semibold text-right text-gray-700">القيمة الجديدة</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {changes.map(({ field, from, to }) => (
                        <tr key={field} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-800">
                              {getFieldName(field)}
                            </td>
                            <td className="px-4 py-3 text-gray-600">{formatValue(from)}</td>
                            <td className="px-4 py-3 text-gray-600">{formatValue(to)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const DeletedDetails = ({ data, message }: { data: any, message: string }) => {
    const translatedMessage = translateMessage(message);
    
    return (
        <div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-700 font-medium">{translatedMessage}</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                  البيانات المحذوفة:
                </h5>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    {Object.entries(data).map(([key, value]) => {
                         if (['id', 'password'].includes(key)) return null;
                        return (
                            <React.Fragment key={key}>
                                <dt className="font-semibold text-gray-600 truncate">{getFieldName(key)}:</dt>
                                <dd className="text-gray-800">{formatValue(value)}</dd>
                            </React.Fragment>
                        );
                    })}
                </dl>
            </div>
        </div>
    );
}

interface AuditLogDetailsProps {
  details: any;
}

export default function AuditLogDetails({ details }: AuditLogDetailsProps) {
  if (!details) {
    return null;
  }

  if (details.before && details.after) {
    return <UpdateDetails before={details.before} after={details.after} />;
  }
  
  if (details.deletedData) {
    return <DeletedDetails data={details.deletedData} message={details.message} />;
  }

  if (details.message) {
    const translatedMessage = translateMessage(details.message);
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-700">{translatedMessage}</p>
      </div>
    );
  }

  return (
    <pre className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg overflow-x-auto">
      {JSON.stringify(details, null, 2)}
    </pre>
  );
} 