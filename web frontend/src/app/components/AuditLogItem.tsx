'use client';

import { useState } from 'react';
import {
  PlusCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowRightOnRectangleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  UserCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import AuditLogDetails from './AuditLogDetails';
import type { AuditLog } from '@/app/dashboard/audit-logs/page';

const actionConfig: { [key: string]: { icon: React.ElementType; color: string; bgColor: string; label: string; variant: string } } = {
  CREATE: { 
    icon: PlusCircleIcon, 
    color: 'text-green-600', 
    bgColor: 'bg-green-100', 
    label: 'إنشاء',
    variant: 'success'
  },
  UPDATE: { 
    icon: PencilSquareIcon, 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-100', 
    label: 'تحديث',
    variant: 'primary'
  },
  DELETE: { 
    icon: TrashIcon, 
    color: 'text-red-600', 
    bgColor: 'bg-red-100', 
    label: 'حذف',
    variant: 'danger'
  },
  LOGIN_SUCCESS: { 
    icon: ArrowRightOnRectangleIcon, 
    color: 'text-green-600', 
    bgColor: 'bg-green-100', 
    label: 'تسجيل دخول',
    variant: 'success'
  },
  LOGIN_FAILURE: { 
    icon: ExclamationTriangleIcon, 
    color: 'text-orange-500', 
    bgColor: 'bg-orange-100', 
    label: 'فشل تسجيل دخول',
    variant: 'warning'
  },
  DEFAULT: { 
    icon: InformationCircleIcon, 
    color: 'text-gray-500', 
    bgColor: 'bg-gray-100', 
    label: 'إجراء',
    variant: 'secondary'
  },
};

// قاموس ترجمة أسماء الكيانات
const entityTranslations: { [key: string]: string } = {
  'Trainee': 'متدرب',
  'Program': 'برنامج',
  'Job': 'وظيفة',
  'News': 'خبر',
  'User': 'مستخدم',
  'Admin': 'مدير',
  'trainee': 'متدرب',
  'program': 'برنامج',
  'job': 'وظيفة',
  'news': 'خبر',
  'user': 'مستخدم',
  'admin': 'مدير',
  'TrainingProgram': 'برنامج تدريبي',
  'trainingprogram': 'برنامج تدريبي',
};

const getEntityName = (log: AuditLog) => {
  const details = log.details;
  if (!details) {
    const translatedEntity = entityTranslations[log.entity] || log.entity;
    return <span className="font-bold text-tiba-primary-600">{translatedEntity}</span>;
  }

  const name =
    details.after?.nameAr ||
    details.after?.nameEn ||
    details.after?.title ||
    details.before?.nameAr ||
    details.before?.nameEn ||
    details.before?.title ||
    details.deletedData?.nameAr ||
    details.deletedData?.nameEn ||
    details.deletedData?.title;

  return name ? <span className="font-bold text-tiba-primary-600">{`"${name}"`}</span> : <span className="font-bold text-tiba-primary-600">{entityTranslations[log.entity] || log.entity}</span>;
};

const generateTitle = (log: AuditLog) => {
  const user = <span className="font-bold text-tiba-gray-800">{log.user?.name || 'مستخدم غير معروف'}</span>;
  const entityName = getEntityName(log);
  const actionLabel = actionConfig[log.action]?.label || log.action;
  const entityType = entityTranslations[log.entity] || log.entity;

  // إذا كان هناك رسالة في التفاصيل، نستخدمها
  if (log.details?.message) {
    const message = log.details.message;
    
    // ترجمة الرسائل الإنجليزية الشائعة
    if (message.startsWith('Created news with title:')) {
      const title = message.replace('Created news with title:', '').trim();
      return <>{user} قام بإنشاء خبر بعنوان <span className="font-bold text-tiba-primary-600">"{title}"</span></>;
    }
    
    if (message.startsWith('Created job with title:')) {
      const title = message.replace('Created job with title:', '').trim();
      return <>{user} قام بإنشاء وظيفة بعنوان <span className="font-bold text-tiba-primary-600">"{title}"</span></>;
    }
    
    if (message.startsWith('Created trainee')) {
      const name = message.replace('Created trainee', '').trim();
      return <>{user} قام بإنشاء متدرب <span className="font-bold text-tiba-primary-600">"{name}"</span></>;
    }
    
    if (message.startsWith('Created program')) {
      const name = message.replace('Created program', '').trim();
      return <>{user} قام بإنشاء برنامج <span className="font-bold text-tiba-primary-600">"{name}"</span></>;
    }
    
    if (message.startsWith('Deleted user')) {
      const name = message.replace('Deleted user', '').trim();
      return <>{user} قام بحذف مستخدم <span className="font-bold text-tiba-primary-600">"{name}"</span></>;
    }
    
    // إذا كانت الرسالة تحتوي على كلمات إنجليزية، نحاول ترجمتها
    const translatedMessage = message
      .replace(/Created/g, 'تم إنشاء')
      .replace(/Deleted/g, 'تم حذف')
      .replace(/Updated/g, 'تم تحديث')
      .replace(/with title:/g, 'بعنوان:')
      .replace(/news/g, 'خبر')
      .replace(/job/g, 'وظيفة')
      .replace(/trainee/g, 'متدرب')
      .replace(/program/g, 'برنامج')
      .replace(/user/g, 'مستخدم');
    
    return <>{user} {translatedMessage}</>;
  }

  switch (log.action) {
    case 'CREATE':
      return <>{user} قام بإنشاء {entityName}</>;
    case 'UPDATE':
      return <>{user} قام بتحديث {entityName}</>;
    case 'DELETE':
      return <>{user} قام بحذف {entityName}</>;
    case 'LOGIN_SUCCESS':
      return <>{user} سجل دخوله بنجاح</>;
    case 'LOGIN_FAILURE':
      return <>فشلت محاولة تسجيل الدخول للمستخدم <span className="font-bold text-red-600">{log.details?.email || ''}</span></>;
    default:
      return (
        <>
          {user} قام بـ {actionLabel} {entityName}
        </>
      );
  }
};

export default function AuditLogItem({ log, isLast }: { log: AuditLog, isLast: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  const config = actionConfig[log.action] || actionConfig.DEFAULT;
  const Icon = config.icon;

  return (
    <div className="relative group">
      {/* خط الاتصال */}
      {!isLast && (
        <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gradient-to-b from-gray-200 to-transparent"></div>
      )}
      
      <div className="relative bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-md transition-all duration-200 group-hover:shadow-lg">
        {/* أيقونة الإجراء */}
        <div className="absolute -left-3 top-4 flex items-center justify-center w-12 h-12 rounded-full border-4 border-white shadow-md">
          <div className={`w-full h-full rounded-full ${config.bgColor} flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${config.color}`} />
          </div>
        </div>

        <div className="ml-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* شارة نوع الإجراء */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
                  {config.label}
                </span>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {entityTranslations[log.entity] || log.entity}
                </span>
              </div>
              
              {/* العنوان الرئيسي */}
              <p className="text-sm text-gray-700 leading-relaxed mb-2">{generateTitle(log)}</p>
              
              {/* الوقت */}
              <div className="flex items-center text-xs text-gray-500">
                <ClockIcon className="w-3 h-3 mr-1" />
                <time dateTime={log.createdAt || ''}>
                  {log.createdAt ? 
                    (() => {
                      try {
                        const date = new Date(log.createdAt);
                        // Check if the date is valid
                        if (isNaN(date.getTime())) {
                          return 'توقيت غير صالح';
                        }
                        return format(date, 'hh:mm a', { locale: ar });
                      } catch (error) {
                        console.error('Error formatting date:', error);
                        return 'توقيت غير صالح';
                      }
                    })() 
                    : 'توقيت غير متوفر'}
                </time>
              </div>
            </div>

            {/* زر التفاصيل */}
            {log.details && (
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center text-xs font-medium text-gray-500 hover:text-tiba-primary-600 p-2 rounded-md hover:bg-gray-50 transition-colors duration-200 ml-4"
              >
                <span>{isOpen ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}</span>
                <ChevronDownIcon
                  className={`w-4 h-4 mr-1 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
            )}
          </div>

          {/* التفاصيل القابلة للطي */}
          {isOpen && log.details && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <AuditLogDetails details={log.details} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 