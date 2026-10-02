'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { fetchAPI } from '@/lib/api';
import PageGuard from '@/components/permissions/PageGuard';
import { PermissionGate } from '@/components/permissions/PermissionGate';
import PageHeader from '@/app/components/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { 
  CloudArrowUpIcon, 
  TrashIcon, 
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

// Types
interface ExamCommittee {
  id: number;
  nationalId?: string;
  traineeName: string;
  seatNumber: string;
  committeeNumber: string;
  examDate: string;
  attendanceTime: string;
  createdAt: string;
}

interface MappedData {
  nationalId: string;
  traineeName: string;
  seatNumber: string;
  committeeNumber: string;
  examDate: string;
  attendanceTime: string;
}

/** تحويل القيم الرقمية التي يخزنها Excel للتواريخ إلى نص مقروء */
function formatExcelDate(value: unknown): string {
  if (value == null || value === '') return '';

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';
    const asNumber = Number(trimmed);
    if (!Number.isNaN(asNumber) && /^\d+(\.\d+)?$/.test(trimmed) && asNumber > 1000) {
      return formatExcelDate(asNumber);
    }
    return trimmed;
  }

  if (typeof value === 'number' && !Number.isNaN(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const day = String(parsed.d).padStart(2, '0');
      const month = String(parsed.m).padStart(2, '0');
      return `${day}/${month}/${parsed.y}`;
    }
  }

  return String(value).trim();
}

/** تحويل القيم الرقمية التي يخزنها Excel للأوقات (كسر من اليوم) إلى HH:MM */
function formatExcelTime(value: unknown): string {
  if (value == null || value === '') return '';

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (/^\d{1,2}:\d{2}/.test(trimmed)) return trimmed.slice(0, 5);
    const asNumber = Number(trimmed);
    if (!Number.isNaN(asNumber) && asNumber >= 0 && asNumber < 1) {
      return formatExcelTime(asNumber);
    }
    return trimmed;
  }

  if (typeof value === 'number' && !Number.isNaN(value)) {
    if (value >= 0 && value < 1) {
      const totalMinutes = Math.round(value * 24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return `${String(parsed.H).padStart(2, '0')}:${String(parsed.M).padStart(2, '0')}`;
    }
  }

  return String(value).trim();
}

export default function ExamCommitteesPage() {
  return (
    <PageGuard requiredPermission={{ resource: 'dashboard.exam-committees', action: 'view' }}>
      <ExamCommitteesContent />
    </PageGuard>
  );
}

function ExamCommitteesContent() {
  const [data, setData] = useState<ExamCommittee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Upload State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadedData, setUploadedData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
    const [mappings, setMappings] = useState<Record<string, string>>({
      nationalId: '',
      traineeName: '',
      seatNumber: '',
      committeeNumber: '',
      examDate: '',
      attendanceTime: ''
    });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCommittees = async () => {
    try {
      setLoading(true);
      const res = await fetchAPI(`/exam-committees?page=${page}&limit=10&search=${search}`);
      setData(res.data || []);
      setTotalPages(res.meta?.totalPages || 1);
    } catch (error) {
      toast.error('حدث خطأ أثناء تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommittees();
  }, [page, search]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        if (rawData.length > 0) {
          const cols = rawData[0] as string[];
          setColumns(cols);
          
          const formattedData = XLSX.utils.sheet_to_json(ws, { raw: false, defval: '' });
          setUploadedData(formattedData);
          setIsUploadModalOpen(true);
          
          // Auto-map if names match approximately
          const newMap = { ...mappings };
          cols.forEach(col => {
            const normalized = String(col).trim();
            if (normalized.includes('قومي') || (normalized.includes('رقم') && normalized.includes('وطني'))) newMap.nationalId = col;
            else if (normalized.includes('اسم') && normalized.includes('متدرب')) newMap.traineeName = col;
            else if (normalized.includes('جلوس')) newMap.seatNumber = col;
            else if (normalized.includes('لجنة')) newMap.committeeNumber = col;
            else if (normalized.includes('تاريخ')) newMap.examDate = col;
            else if (normalized.includes('ميعاد') || normalized.includes('حضور')) newMap.attendanceTime = col;
          });
          setMappings(newMap);
        }
      } catch (error) {
        toast.error('ملف غير صالح');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleBulkUpload = async () => {
    // Validate mappings
    if (!mappings.traineeName || !mappings.seatNumber || !mappings.committeeNumber || !mappings.examDate || !mappings.attendanceTime) {
      return toast.error('يرجى ربط جميع الأعمدة المطلوبة');
    }

    const payload = uploadedData.map(row => ({
      nationalId: String(row[mappings.nationalId] || '').trim(),
      traineeName: String(row[mappings.traineeName] || '').trim(),
      seatNumber: String(row[mappings.seatNumber] || '').trim(),
      committeeNumber: String(row[mappings.committeeNumber] || '').trim(),
      examDate: formatExcelDate(row[mappings.examDate]),
      attendanceTime: formatExcelTime(row[mappings.attendanceTime]),
    })).filter(row => row.traineeName && row.seatNumber);

    try {
      await fetchAPI('/exam-committees/bulk', {
        method: 'POST',
        body: JSON.stringify({ items: payload }),
      });
      toast.success('تم رفع البيانات بنجاح');
      setIsUploadModalOpen(false);
      setPage(1);
      fetchCommittees();
    } catch (error) {
      toast.error('حدث خطأ أثناء الرفع');
    }
  };

  const handleDownloadTemplate = () => {
    const headers = ['الرقم القومي', 'اسم المتدرب', 'رقم الجلوس', 'رقم اللجنة', 'تاريخ الاختبار', 'ميعاد الحضور'];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    ws['!cols'] = [
      { wch: 16 },
      { wch: 30 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'لجان الاختبارات');
    XLSX.writeFile(wb, 'نموذج_لجان_الاختبارات.xlsx');
    toast.success('تم تحميل النموذج');
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    try {
      await fetchAPI(`/exam-committees/${id}`, { method: 'DELETE' });
      toast.success('تم الحذف');
      fetchCommittees();
    } catch {
      toast.error('حدث خطأ');
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('هل أنت متأكد من حذف جميع بيانات اللجان؟ هذا الإجراء لا يمكن التراجع عنه.')) return;
    try {
      await fetchAPI('/exam-committees/bulk', { method: 'DELETE' });
      toast.success('تم حذف جميع البيانات');
      fetchCommittees();
    } catch {
      toast.error('حدث خطأ');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="لجان الاختبارات"
        description="إدارة ورفع كشوف لجان الاختبارات للمتدربين"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'إدارة المستخدمين', href: '#' },
          { label: 'لجان الاختبارات' }
        ]}
        actions={
          <div className="flex gap-2">
            <PermissionGate resource="dashboard.exam-committees" action="manage">
              <Button variant="outline" onClick={handleDownloadTemplate} leftIcon={<ArrowDownTrayIcon className="w-5 h-5" />}>
                تحميل نموذج Excel
              </Button>
              <Button variant="danger" onClick={handleDeleteAll} leftIcon={<TrashIcon className="w-5 h-5" />}>
                حذف الكل
              </Button>
              <Button onClick={() => fileInputRef.current?.click()} leftIcon={<CloudArrowUpIcon className="w-5 h-5" />}>
                رفع ملف Excel
              </Button>
              <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
            </PermissionGate>
          </div>
        }
      />

      <Card>
        <div className="p-4 flex items-center gap-4 border-b">
          <div className="relative w-72">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="بحث بالرقم القومي، اسم المتدرب، رقم الجلوس، رقم اللجنة..."
              className="w-full pl-3 pr-10 py-2 border rounded-lg"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 font-semibold text-gray-700">الرقم القومي</th>
                  <th className="px-6 py-3 font-semibold text-gray-700">اسم المتدرب</th>
                  <th className="px-6 py-3 font-semibold text-gray-700">رقم الجلوس</th>
                  <th className="px-6 py-3 font-semibold text-gray-700">رقم اللجنة</th>
                  <th className="px-6 py-3 font-semibold text-gray-700">تاريخ الاختبار</th>
                  <th className="px-6 py-3 font-semibold text-gray-700">ميعاد الحضور</th>
                  <th className="px-6 py-3 font-semibold text-gray-700 w-24">إجراءات</th>
                </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8">جاري التحميل...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">لا توجد بيانات</td></tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3">{item.nationalId || '-'}</td>
                    <td className="px-6 py-3">{item.traineeName}</td>
                    <td className="px-6 py-3">{item.seatNumber}</td>
                    <td className="px-6 py-3">{item.committeeNumber}</td>
                    <td className="px-6 py-3">{formatExcelDate(item.examDate)}</td>
                    <td className="px-6 py-3">{formatExcelTime(item.attendanceTime)}</td>
                    <td className="px-6 py-3">
                      <PermissionGate resource="dashboard.exam-committees" action="manage">
                        <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 p-1">
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </PermissionGate>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t flex justify-center gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`px-3 py-1 rounded-md ${page === i + 1 ? 'bg-primary-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
              <h2 className="text-lg font-bold">ربط أعمدة الإكسيل</h2>
              <button onClick={() => setIsUploadModalOpen(false)}><XMarkIcon className="w-6 h-6 text-gray-500" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
                {[
                  { key: 'nationalId', label: 'الرقم القومي' },
                  { key: 'traineeName', label: 'اسم المتدرب' },
                  { key: 'seatNumber', label: 'رقم الجلوس' },
                  { key: 'committeeNumber', label: 'رقم اللجنة' },
                  { key: 'examDate', label: 'تاريخ الاختبار' },
                  { key: 'attendanceTime', label: 'ميعاد الحضور' },
                ].map(field => (
                  <div key={field.key} className="flex items-center justify-between bg-white p-2 rounded shadow-sm">
                    <label className="font-semibold text-sm w-1/3">{field.label}</label>
                    <select
                      className="border rounded p-1 w-2/3 text-sm"
                      value={mappings[field.key as keyof MappedData] || ''}
                      onChange={(e) => setMappings({ ...mappings, [field.key]: e.target.value })}
                    >
                      <option value="">-- اختر العمود --</option>
                      {columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              <h3 className="font-bold mb-2">معاينة أول 3 صفوف</h3>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-right text-sm">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="p-2">الرقم القومي</th>
                        <th className="p-2">اسم المتدرب</th>
                        <th className="p-2">رقم الجلوس</th>
                        <th className="p-2">رقم اللجنة</th>
                        <th className="p-2">تاريخ الاختبار</th>
                        <th className="p-2">ميعاد الحضور</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {uploadedData.slice(0, 3).map((row, idx) => (
                        <tr key={idx}>
                          <td className="p-2">{row[mappings.nationalId] || '-'}</td>
                          <td className="p-2">{row[mappings.traineeName] || '-'}</td>
                          <td className="p-2">{row[mappings.seatNumber] || '-'}</td>
                          <td className="p-2">{row[mappings.committeeNumber] || '-'}</td>
                          <td className="p-2">{formatExcelDate(row[mappings.examDate]) || '-'}</td>
                          <td className="p-2">{formatExcelTime(row[mappings.attendanceTime]) || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                </table>
              </div>
            </div>
            
            <div className="p-4 border-t flex justify-end gap-2 bg-gray-50 rounded-b-xl">
              <Button variant="outline" onClick={() => setIsUploadModalOpen(false)}>إلغاء</Button>
              <Button onClick={handleBulkUpload} leftIcon={<CheckCircleIcon className="w-5 h-5" />}>
                تأكيد الرفع
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
