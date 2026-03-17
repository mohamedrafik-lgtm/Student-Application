'use client';

import { useState } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  CalendarIcon,
  UserIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/app/components/ui/Button';
import type { AuditLog } from '@/app/dashboard/audit-logs/page';
import React from 'react';

export interface FilterOptions {
  search: string;
  actions: string[];
  entities: string[];
  users: string[];
  dateRange: {
    start: string;
    end: string;
  };
  quickDate: string;
}

interface AuditLogFiltersProps {
  logs: AuditLog[];
  onFiltersChange: (filters: FilterOptions) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const actionOptions = [
  { value: 'CREATE', label: 'إنشاء', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'UPDATE', label: 'تحديث', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'DELETE', label: 'حذف', color: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'LOGIN_SUCCESS', label: 'تسجيل دخول ناجح', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'LOGIN_FAILURE', label: 'فشل تسجيل دخول', color: 'bg-orange-100 text-orange-800 border-orange-200' },
];

const entityOptions = [
  { value: 'Trainee', label: 'متدرب', icon: '👨‍🎓' },
  { value: 'Program', label: 'برنامج', icon: '📚' },
  { value: 'TrainingProgram', label: 'برنامج تدريبي', icon: '🎯' },
  { value: 'Job', label: 'وظيفة', icon: '💼' },
  { value: 'News', label: 'خبر', icon: '📰' },
  { value: 'User', label: 'مستخدم', icon: '👤' },
  { value: 'Admin', label: 'مدير', icon: '👨‍💼' },
];

const quickDateOptions = [
  { value: '', label: 'جميع التواريخ' },
  { value: 'today', label: 'اليوم' },
  { value: 'yesterday', label: 'الأمس' },
  { value: 'week', label: 'آخر أسبوع' },
  { value: 'month', label: 'آخر شهر' },
];

export default function AuditLogFilters({ logs, onFiltersChange, isOpen, onToggle }: AuditLogFiltersProps) {
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    actions: [],
    entities: [],
    users: [],
    dateRange: { start: '', end: '' },
    quickDate: '',
  });

  // Ensure logs is an array before processing
  const logsArray = Array.isArray(logs) ? logs : [];

  // استخراج قائمة المستخدمين الفريدة من السجلات
  const uniqueUsers = Array.from(new Set(logsArray.map(log => log.user?.name).filter(Boolean)));

  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleActionToggle = (action: string) => {
    const newActions = filters.actions.includes(action)
      ? filters.actions.filter(a => a !== action)
      : [...filters.actions, action];
    handleFilterChange('actions', newActions);
  };

  const handleEntityToggle = (entity: string) => {
    const newEntities = filters.entities.includes(entity)
      ? filters.entities.filter(e => e !== entity)
      : [...filters.entities, entity];
    handleFilterChange('entities', newEntities);
  };

  const handleUserToggle = (user: string) => {
    const newUsers = filters.users.includes(user)
      ? filters.users.filter(u => u !== user)
      : [...filters.users, user];
    handleFilterChange('users', newUsers);
  };

  const clearAllFilters = () => {
    const clearedFilters: FilterOptions = {
      search: '',
      actions: [],
      entities: [],
      users: [],
      dateRange: { start: '', end: '' },
      quickDate: '',
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const activeFiltersCount = [
    filters.search,
    filters.actions.length,
    filters.entities.length,
    filters.users.length,
    filters.dateRange.start,
    filters.dateRange.end,
    filters.quickDate,
  ].filter(Boolean).length;

  // دالة لإنشاء شارات الفلاتر النشطة
  const renderActiveFilters = () => {
    const chips = [];
    
    if (filters.search) {
      chips.push(
        <span key="search" className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
          البحث: {filters.search}
          <button
            onClick={() => handleFilterChange('search', '')}
            className="ml-2 text-blue-600 hover:text-blue-800"
          >
            <XMarkIcon className="w-3 h-3" />
          </button>
        </span>
      );
    }

    filters.actions.forEach(action => {
      const actionOption = actionOptions.find(a => a.value === action);
      if (actionOption) {
        chips.push(
          <span key={`action-${action}`} className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${actionOption.color}`}>
            {actionOption.label}
            <button
              onClick={() => handleActionToggle(action)}
              className="ml-2 hover:opacity-70"
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          </span>
        );
      }
    });

    filters.entities.forEach(entity => {
      const entityOption = entityOptions.find(e => e.value === entity);
      if (entityOption) {
        chips.push(
          <span key={`entity-${entity}`} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
            {entityOption.icon} {entityOption.label}
            <button
              onClick={() => handleEntityToggle(entity)}
              className="ml-2 text-purple-600 hover:text-purple-800"
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          </span>
        );
      }
    });

    filters.users.forEach(user => {
      chips.push(
        <span key={`user-${user}`} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
          👤 {user}
          <button
            onClick={() => handleUserToggle(user)}
            className="ml-2 text-gray-600 hover:text-gray-800"
          >
            <XMarkIcon className="w-3 h-3" />
          </button>
        </span>
      );
    });

    if (filters.quickDate) {
      const dateOption = quickDateOptions.find(d => d.value === filters.quickDate);
      if (dateOption) {
        chips.push(
          <span key="quickDate" className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
            📅 {dateOption.label}
            <button
              onClick={() => handleFilterChange('quickDate', '')}
              className="ml-2 text-yellow-600 hover:text-yellow-800"
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          </span>
        );
      }
    }

    return chips;
  };

  return (
    <div className="mb-6">
      {/* شريط البحث الأساسي */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="البحث في السجلات..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tiba-primary-500 focus:border-transparent"
          />
        </div>
        
        <Button
          variant="outline"
          onClick={onToggle}
          className="flex items-center gap-2"
        >
          {isOpen ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
          فلاتر متقدمة
          {activeFiltersCount > 0 && (
            <span className="bg-tiba-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </Button>

        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            onClick={clearAllFilters}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-4 w-4 mr-1" />
            مسح الكل
          </Button>
        )}
      </div>

      {/* شارات الفلاتر النشطة */}
      {activeFiltersCount > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {renderActiveFilters().map((chip, index) => (
              <React.Fragment key={`filter-chip-${index}`}>{chip}</React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* الفلاتر المتقدمة */}
      {isOpen && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          {/* رأس الفلاتر */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">الفلاتر المتقدمة</h3>
            <p className="text-sm text-gray-600 mt-1">اختر معايير البحث المطلوبة</p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* العمود الأول */}
              <div className="space-y-6">
                
                {/* فلتر نوع الإجراء */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <DocumentTextIcon className="h-4 w-4 mr-2" />
                    نوع الإجراء
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {actionOptions.map((action) => (
                      <button
                        key={action.value}
                        onClick={() => handleActionToggle(action.value)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          filters.actions.includes(action.value)
                            ? `${action.color} border-current`
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <div className="text-sm font-medium">{action.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* فلتر نوع الكيان */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <DocumentTextIcon className="h-4 w-4 mr-2" />
                    نوع الكيان
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {entityOptions.map((entity) => (
                      <button
                        key={entity.value}
                        onClick={() => handleEntityToggle(entity.value)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          filters.entities.includes(entity.value)
                            ? 'bg-purple-100 text-purple-800 border-purple-200'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <div className="text-sm font-medium">{entity.icon} {entity.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* العمود الثاني */}
              <div className="space-y-6">
                
                {/* فلتر المستخدم */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <UserIcon className="h-4 w-4 mr-2" />
                    المستخدم
                  </h4>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <div className="grid grid-cols-1 gap-2">
                      {uniqueUsers.map((user) => (
                        <button
                          key={user}
                          onClick={() => handleUserToggle(user)}
                          className={`p-2 rounded text-left transition-all ${
                            filters.users.includes(user)
                              ? 'bg-gray-200 text-gray-800'
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          <div className="text-sm">👤 {user}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* فلتر التاريخ */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    التاريخ
                  </h4>
                  
                  {/* خيارات سريعة للتاريخ */}
                  <div className="mb-4">
                    <label className="block text-xs text-gray-600 mb-2">خيارات سريعة</label>
                    <select
                      value={filters.quickDate}
                      onChange={(e) => handleFilterChange('quickDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tiba-primary-500 focus:border-transparent text-sm"
                    >
                      {quickDateOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* نطاق تاريخ مخصص */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-2">نطاق مخصص</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <input
                          type="date"
                          value={filters.dateRange.start || ''}
                          onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, start: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tiba-primary-500 focus:border-transparent text-sm"
                          placeholder="من تاريخ"
                        />
                      </div>
                      <div>
                        <input
                          type="date"
                          value={filters.dateRange.end || ''}
                          onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, end: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tiba-primary-500 focus:border-transparent text-sm"
                          placeholder="إلى تاريخ"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 