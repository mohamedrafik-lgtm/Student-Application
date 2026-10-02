'use client';

import { useState } from 'react';
import { 
  FunnelIcon, 
  UserIcon, 
  AcademicCapIcon, 
  BuildingOfficeIcon,
  UsersIcon,
  ShieldCheckIcon,
  BookOpenIcon,
  ComputerDesktopIcon,
  HeartIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';
import { TibaSelect, SimpleSelect, SearchableSelect, MultiSelect, IconSelect } from './Select';
import { Card } from './Card';

export default function SelectDemo() {
  const [singleValue, setSingleValue] = useState('');
  const [multiValue, setMultiValue] = useState('');
  const [roleValue, setRoleValue] = useState('');
  const [branchValue, setBranchValue] = useState('');
  const [programValue, setProgramValue] = useState('');

  // خيارات بسيطة
  const simpleOptions = [
    { value: 'option1', label: 'الخيار الأول' },
    { value: 'option2', label: 'الخيار الثاني' },
    { value: 'option3', label: 'الخيار الثالث' },
    { value: 'option4', label: 'الخيار الرابع' }
  ];

  // خيارات الأدوار مع أيقونات
  const roleOptions = [
    { value: 'user', label: 'مستخدم', icon: <UserIcon className="h-4 w-4" /> },
    { value: 'admin', label: 'مشرف', icon: <ShieldCheckIcon className="h-4 w-4" /> },
    { value: 'accountant', label: 'محاسب', icon: <BookOpenIcon className="h-4 w-4" /> },
    { value: 'marketer', label: 'مسوق', icon: <UsersIcon className="h-4 w-4" /> }
  ];

  // خيارات الفروع
  const branchOptions = [
    { value: '', label: 'جميع الفروع' },
    { value: 'mansoura', label: 'المنصورة' },
    { value: 'zagazig', label: 'الزقازيق' }
  ];

  // خيارات البرامج مع أيقونات
  const programOptions = [
    { value: 'health', label: 'مساعد خدمات صحية', icon: <HeartIcon className="h-4 w-4" /> },
    { value: 'construction', label: 'المساحة والانشاءات', icon: <WrenchScrewdriverIcon className="h-4 w-4" /> },
    { value: 'it', label: 'تكنولوجيا المعلومات', icon: <ComputerDesktopIcon className="h-4 w-4" /> }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-tiba-gray-800 mb-2">
          عرض مكونات Select المتطورة
        </h1>
        <p className="text-tiba-gray-600">
          مجموعة من مكونات Select الجميلة والمتطورة المبنية على react-select
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SimpleSelect */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-tiba-gray-800 mb-4">
              SimpleSelect - اختيار بسيط
            </h3>
            <p className="text-sm text-tiba-gray-600 mb-4">
              مكون Select بسيط بدون بحث أو مسح، مناسب للاختيارات البسيطة.
            </p>
            <SimpleSelect
              options={simpleOptions}
              value={singleValue}
              onChange={setSingleValue}
              placeholder="اختر خياراً بسيطاً..."
              icon={<FunnelIcon className="h-5 w-5" />}
            />
            <div className="mt-2 text-sm text-tiba-gray-500">
              القيمة المحددة: {singleValue || 'لا يوجد'}
            </div>
          </div>
        </Card>

        {/* SearchableSelect */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-tiba-gray-800 mb-4">
              SearchableSelect - اختيار مع بحث
            </h3>
            <p className="text-sm text-tiba-gray-600 mb-4">
              مكون Select مع إمكانية البحث والمسح، الأكثر استخداماً.
            </p>
            <SearchableSelect
              options={simpleOptions}
              value={singleValue}
              onChange={setSingleValue}
              placeholder="ابحث واختر..."
              icon={<FunnelIcon className="h-5 w-5" />}
            />
            <div className="mt-2 text-sm text-tiba-gray-500">
              القيمة المحددة: {singleValue || 'لا يوجد'}
            </div>
          </div>
        </Card>

        {/* MultiSelect */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-tiba-gray-800 mb-4">
              MultiSelect - اختيار متعدد
            </h3>
            <p className="text-sm text-tiba-gray-600 mb-4">
              مكون Select للتحديد المتعدد مع إمكانية البحث والمسح.
            </p>
            <MultiSelect
              options={simpleOptions}
              value={multiValue}
              onChange={setMultiValue}
              placeholder="اختر عدة خيارات..."
              icon={<FunnelIcon className="h-5 w-5" />}
            />
            <div className="mt-2 text-sm text-tiba-gray-500">
              القيم المحددة: {multiValue || 'لا يوجد'}
            </div>
          </div>
        </Card>

        {/* IconSelect */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-tiba-gray-800 mb-4">
              IconSelect - اختيار مع أيقونات
            </h3>
            <p className="text-sm text-tiba-gray-600 mb-4">
              مكون Select مع أيقونات في الخيارات لتحسين الوضوح.
            </p>
            <IconSelect
              options={roleOptions}
              value={roleValue}
              onChange={setRoleValue}
              placeholder="اختر الدور..."
              icon={<UsersIcon className="h-5 w-5" />}
            />
            <div className="mt-2 text-sm text-tiba-gray-500">
              الدور المحدد: {roleValue || 'لا يوجد'}
            </div>
          </div>
        </Card>

        {/* Branch Filter */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-tiba-gray-800 mb-4">
              فلتر الفروع
            </h3>
            <p className="text-sm text-tiba-gray-600 mb-4">
              مثال على استخدام Select كفلتر في الجداول.
            </p>
            <SearchableSelect
              options={branchOptions}
              value={branchValue}
              onChange={setBranchValue}
              placeholder="اختر الفرع..."
              icon={<BuildingOfficeIcon className="h-5 w-5" />}
            />
            <div className="mt-2 text-sm text-tiba-gray-500">
              الفرع المحدد: {branchValue || 'جميع الفروع'}
            </div>
          </div>
        </Card>

        {/* Program Selection */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-tiba-gray-800 mb-4">
              اختيار البرنامج
            </h3>
            <p className="text-sm text-tiba-gray-600 mb-4">
              مثال على اختيار البرامج مع أيقونات مميزة.
            </p>
            <IconSelect
              options={programOptions}
              value={programValue}
              onChange={setProgramValue}
              placeholder="اختر البرنامج..."
              icon={<AcademicCapIcon className="h-5 w-5" />}
            />
            <div className="mt-2 text-sm text-tiba-gray-500">
              البرنامج المحدد: {programValue || 'لا يوجد'}
            </div>
          </div>
        </Card>
      </div>

      {/* TibaSelect Advanced */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-tiba-gray-800 mb-4">
            TibaSelect - المكون المتقدم
          </h3>
          <p className="text-sm text-tiba-gray-600 mb-4">
            المكون الأساسي مع جميع الميزات المتقدمة والتحكم الكامل.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TibaSelect
              options={simpleOptions}
              value={singleValue}
              onChange={setSingleValue}
              placeholder="اختر خياراً..."
              icon={<FunnelIcon className="h-5 w-5" />}
              isMulti={false}
              isSearchable={true}
              isClearable={true}
            />
            <TibaSelect
              options={simpleOptions}
              value={multiValue}
              onChange={setMultiValue}
              placeholder="اختر عدة خيارات..."
              icon={<FunnelIcon className="h-5 w-5" />}
              isMulti={true}
              isSearchable={true}
              isClearable={true}
            />
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-tiba-gray-500">
            <div>قيمة واحدة: {singleValue || 'لا يوجد'}</div>
            <div>قيم متعددة: {multiValue || 'لا يوجد'}</div>
          </div>
        </div>
      </Card>

      {/* Features Showcase */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-tiba-gray-800 mb-4">
            الميزات المتقدمة
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-tiba-primary-50 p-4 rounded-lg">
              <h4 className="font-medium text-tiba-primary-800 mb-2">البحث المباشر</h4>
              <p className="text-sm text-tiba-primary-600">
                ابحث في الخيارات بكتابة النص مباشرة
              </p>
            </div>
            <div className="bg-tiba-secondary-50 p-4 rounded-lg">
              <h4 className="font-medium text-tiba-secondary-800 mb-2">التحديد المتعدد</h4>
              <p className="text-sm text-tiba-secondary-600">
                اختر عدة خيارات في نفس الوقت
              </p>
            </div>
            <div className="bg-tiba-warning-50 p-4 rounded-lg">
              <h4 className="font-medium text-tiba-warning-800 mb-2">الأيقونات</h4>
              <p className="text-sm text-tiba-warning-600">
                دعم الأيقونات في الخيارات والمكون
              </p>
            </div>
            <div className="bg-tiba-danger-50 p-4 rounded-lg">
              <h4 className="font-medium text-tiba-danger-800 mb-2">رسائل الخطأ</h4>
              <p className="text-sm text-tiba-danger-600">
                رسائل خطأ جميلة ومخصصة
              </p>
            </div>
            <div className="bg-tiba-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-tiba-gray-800 mb-2">دعم RTL</h4>
              <p className="text-sm text-tiba-gray-600">
                دعم كامل للغة العربية والاتجاه من اليمين لليسار
              </p>
            </div>
            <div className="bg-tiba-primary-50 p-4 rounded-lg">
              <h4 className="font-medium text-tiba-primary-800 mb-2">التصميم الموحد</h4>
              <p className="text-sm text-tiba-primary-600">
                تصميم موحد مع هوية Tiba
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
} 