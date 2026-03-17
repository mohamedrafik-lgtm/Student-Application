"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import PageHeader from "@/app/components/PageHeader";
import { idCardDesignsAPI } from "@/lib/id-card-designs-api";
import { trainingProgramsAPI, TrainingProgram } from "@/lib/training-programs-api";
import { IdCardDesign } from "@/types/id-card-design";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  StarIcon,
  EyeIcon,
  Cog6ToothIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";

export default function IdCardDesignsPage() {
  const router = useRouter();
  const [designs, setDesigns] = useState<IdCardDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);

  // تحميل التصاميم
  const loadDesigns = async () => {
    setLoading(true);
    try {
      const data = await idCardDesignsAPI.getAll(false); // فقط التصاميم النشطة
      setDesigns(data);
    } catch (error) {
      console.error("Error loading designs:", error);
      toast.error("حدث خطأ أثناء تحميل التصاميم");
    } finally {
      setLoading(false);
    }
  };

  // تحميل البرامج التدريبية
  const loadPrograms = async () => {
    try {
      const data = await trainingProgramsAPI.getAll();
      setPrograms(data);
    } catch (error) {
      console.error("Error loading programs:", error);
    }
  };

  useEffect(() => {
    loadDesigns();
    loadPrograms();
  }, []);

  // تصفية التصاميم حسب البحث والبرنامج
  const filteredDesigns = designs.filter(design => {
    // تصفية النص
    const matchesSearch = design.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (design.description && design.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // تصفية البرنامج
    const matchesProgram = selectedProgramId === null || 
      (selectedProgramId === 0 ? !design.programId : design.programId === selectedProgramId);
    
    return matchesSearch && matchesProgram;
  });

  // إنشاء تصميم جديد
  const createNewDesign = () => {
    router.push("/dashboard/settings/id-card-designs/new");
  };

  // تعديل تصميم (التصميم نفسه)
  const editDesign = (id: string) => {
    router.push(`/dashboard/settings/id-card-designs/${id}/edit`);
  };

  // تعديل تفاصيل التصميم (الاسم، الوصف، البرنامج، إلخ)
  const editDesignDetails = (id: string) => {
    router.push(`/dashboard/settings/id-card-designs/${id}/details`);
  };

  // تعيين كافتراضي
  const setAsDefault = async (id: string) => {
    try {
      await idCardDesignsAPI.setAsDefault(id);
      toast.success("تم تعيين التصميم كافتراضي بنجاح");
      loadDesigns();
    } catch (error) {
      console.error("Error setting as default:", error);
      toast.error("حدث خطأ أثناء تعيين التصميم كافتراضي");
    }
  };

  // نسخ تصميم
  const duplicateDesign = async (id: string, name: string) => {
    try {
      const newName = prompt("اسم التصميم الجديد:", `${name} (نسخة)`);
      if (!newName) return;

      await idCardDesignsAPI.duplicate(id, newName);
      toast.success("تم نسخ التصميم بنجاح");
      loadDesigns();
    } catch (error) {
      console.error("Error duplicating design:", error);
      toast.error("حدث خطأ أثناء نسخ التصميم");
    }
  };

  // حذف تصميم نهائياً
  const deleteDesign = async (id: string, name: string) => {
    const confirmMessage = `هل أنت متأكد من الحذف النهائي للتصميم "${name}"؟\n\nتحذير: هذا الإجراء لا يمكن التراجع عنه!`;
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      await idCardDesignsAPI.delete(id);
      toast.success("تم حذف التصميم نهائياً");
      loadDesigns();
    } catch (error: any) {
      console.error("Error deleting design:", error);
      if (error.message.includes('مُستخدم في')) {
        toast.error(error.message);
      } else {
        toast.error("حدث خطأ أثناء حذف التصميم");
      }
    }
  };

  // إلغاء تفعيل التصميم (حذف مؤقت)
  const deactivateDesign = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من إلغاء تفعيل التصميم "${name}"؟`)) {
      return;
    }

    try {
      await idCardDesignsAPI.deactivate(id);
      toast.success("تم إلغاء تفعيل التصميم بنجاح");
      loadDesigns();
    } catch (error) {
      console.error("Error deactivating design:", error);
      toast.error("حدث خطأ أثناء إلغاء تفعيل التصميم");
    }
  };

  // تصدير التصميم
  const exportDesign = async (id: string, name: string) => {
    try {
      const blob = await idCardDesignsAPI.exportDesign(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // إنشاء اسم ملف آمن
      const safeName = name
        .replace(/[^\w\s-]/g, '') // إزالة الأحرف الخاصة
        .replace(/\s+/g, '_') // استبدال المسافات
        .substring(0, 50); // تحديد الطول
      
      a.download = `design-${safeName || 'unnamed'}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("تم تحميل ملف التصميم بنجاح");
    } catch (error: any) {
      console.error("Error exporting design:", error);
      toast.error(error.message || "حدث خطأ أثناء تصدير التصميم");
    }
  };

  // فتح modal الاستيراد
  const openImportModal = () => {
    setImportModalOpen(true);
    setSelectedFile(null);
  };

  // إغلاق modal الاستيراد
  const closeImportModal = () => {
    setImportModalOpen(false);
    setSelectedFile(null);
  };

  // معالجة اختيار الملف
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        setSelectedFile(file);
      } else {
        toast.error("يرجى اختيار ملف JSON صالح");
        e.target.value = '';
      }
    }
  };

  // استيراد التصميم
  const importDesign = async () => {
    if (!selectedFile) {
      toast.error("يرجى اختيار ملف للاستيراد");
      return;
    }

    setImporting(true);
    try {
      await idCardDesignsAPI.importDesign(selectedFile);
      toast.success("تم استيراد التصميم بنجاح");
      closeImportModal();
      loadDesigns();
    } catch (error: any) {
      console.error("Error importing design:", error);
      toast.error(error.message || "حدث خطأ أثناء استيراد التصميم");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="إدارة تصاميم الكارنيهات"
        description="إنشاء وإدارة تصاميم مختلفة لكارنيهات الطلاب"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'إعدادات النظام', href: '/dashboard/settings' },
          { label: 'تصاميم الكارنيهات' }
        ]}
      />

      {/* شريط الأدوات */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="p-6 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">إدارة تصاميم الكارنيهات</h2>
              <p className="text-sm text-gray-500">إنشاء وتخصيص تصاميم مختلفة لكارنيهات الطلاب</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="البحث في التصاميم..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-80 pr-11 h-11 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                />
                <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                {/* تصفية البرامج */}
                <select
                  value={selectedProgramId || ""}
                  onChange={(e) => setSelectedProgramId(e.target.value ? parseInt(e.target.value) : null)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">كل التصاميم</option>
                  <option value="0">التصاميم العامة</option>
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.nameAr}
                    </option>
                  ))}
                </select>


                <Button
                  variant="outline"
                  onClick={openImportModal}
                  className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                >
                  <ArrowUpTrayIcon className="w-5 h-5 ml-2" />
                  استيراد تصميم
                </Button>
                
                <Button 
                  onClick={createNewDesign} 
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all"
                >
                  <PlusIcon className="w-5 h-5 ml-2" />
                  تصميم جديد
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* قائمة التصاميم */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mb-4"></div>
            <p className="text-gray-600 font-medium">جاري تحميل التصاميم...</p>
          </div>
        </div>
      ) : filteredDesigns.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Cog6ToothIcon className="w-10 h-10 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {searchTerm ? "لا توجد نتائج" : "لا توجد تصاميم"}
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            {searchTerm 
              ? "لم يتم العثور على تصاميم تطابق البحث. جرب كلمات مختلفة أو تحقق من الإملاء" 
              : "ابدأ بإنشاء تصميم جديد لكارنيهات الطلاب وقم بتخصيصه حسب احتياجاتك"
            }
          </p>
          {!searchTerm && (
            <Button 
              onClick={createNewDesign} 
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all"
            >
              <PlusIcon className="w-5 h-5 ml-2" />
              إنشاء أول تصميم
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDesigns.map((design) => (
            <div key={design.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200 group">
              {/* معاينة التصميم */}
              <div className="relative h-48 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div
                  className="bg-white shadow-lg rounded-lg border-2 border-gray-200"
                  style={{
                    width: `${design.width * 0.4}px`,
                    height: `${design.height * 0.4}px`,
                    maxWidth: '200px',
                    maxHeight: '120px',
                    backgroundImage: design.backgroundImage 
                      ? `url(${design.backgroundImage})` 
                      : undefined,
                    backgroundColor: design.backgroundColor || '#ffffff',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  {/* عرض بعض العناصر كمعاينة */}
                  {design.designData.elements
                    .filter(el => el.visible)
                    .slice(0, 3)
                    .map((element, index) => (
                      <div
                        key={element.id}
                        className="absolute bg-blue-50 border border-blue-200 rounded opacity-80"
                        style={{
                          left: `${(element.position.x / design.width) * 100}%`,
                          top: `${(element.position.y / design.height) * 100}%`,
                          width: `${(element.size.width / design.width) * 100}%`,
                          height: `${(element.size.height / design.height) * 100}%`,
                          fontSize: '8px',
                          zIndex: element.zIndex || 1,
                        }}
                      />
                    ))}
                </div>

                {/* شارات */}
                <div className="absolute top-3 left-3 flex flex-col gap-1">
                  {design.isDefault && (
                    <span className="bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs px-2 py-1 rounded-full flex items-center shadow-sm">
                      <StarSolidIcon className="w-3 h-3 ml-1" />
                      افتراضي
                    </span>
                  )}
                  {!design.isActive && (
                    <span className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs px-2 py-1 rounded-full shadow-sm">
                      محذوف
                    </span>
                  )}
                </div>

              </div>

              {/* معلومات التصميم */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-lg text-gray-900 truncate flex-1">
                    {design.name}
                  </h3>
                  {design.isDefault && (
                    <StarSolidIcon className="w-5 h-5 text-amber-500 flex-shrink-0 ml-2" />
                  )}
                </div>

                {design.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
                    {design.description}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-4">
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <div className="font-medium text-gray-700">{design.width} × {design.height}</div>
                    <div>الأبعاد</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <div className="font-medium text-gray-700">{design.designData.elements.length}</div>
                    <div>عنصر</div>
                  </div>
                </div>

                {/* معلومات البرنامج */}
                <div className="mb-4">
                  {design.program ? (
                    <div className="flex items-center space-x-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0"></span>
                      <span className="text-sm font-medium text-emerald-800">{design.program.nameAr}</span>
                      {design.isProgramDefault && (
                        <span className="bg-emerald-600 text-white text-xs px-2 py-0.5 rounded-full">افتراضي</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                      <span className="text-sm font-medium text-blue-800">تصميم عام (كل البرامج)</span>
                    </div>
                  )}
                </div>

                {/* أزرار الإجراءات */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => editDesign(design.id)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all"
                  >
                    <PencilIcon className="w-4 h-4 ml-2" />
                    تعديل التصميم
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => editDesignDetails(design.id)}
                    className="border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400"
                    title="تعديل التفاصيل"
                  >
                    <Cog6ToothIcon className="w-4 h-4" />
                  </Button>

                  {!design.isDefault && design.isActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAsDefault(design.id)}
                      className="border-amber-300 text-amber-600 hover:bg-amber-50 hover:border-amber-400"
                      title="تعيين كافتراضي"
                    >
                      <StarIcon className="w-4 h-4" />
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => duplicateDesign(design.id, design.name)}
                    className="border-emerald-300 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-400"
                    title="نسخ"
                  >
                    <DocumentDuplicateIcon className="w-4 h-4" />
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportDesign(design.id, design.name)}
                    className="border-purple-300 text-purple-600 hover:bg-purple-50 hover:border-purple-400"
                    title="تحميل التصميم"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                  </Button>

                  {design.isActive ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deactivateDesign(design.id, design.name)}
                        className="border-orange-300 text-orange-600 hover:bg-orange-50 hover:border-orange-400"
                        title="إلغاء تفعيل"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteDesign(design.id, design.name)}
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                        title="حذف نهائي"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteDesign(design.id, design.name)}
                      className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                      title="حذف نهائي"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal استيراد التصميم */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">استيراد تصميم</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={closeImportModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اختر ملف التصميم (JSON)
                </label>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-300 rounded-lg cursor-pointer"
                />
              </div>

              {selectedFile && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 rtl:text-right">
                      <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="mr-3">
                    <p className="text-sm text-blue-800">
                      <strong>ملاحظة:</strong> سيتم استيراد جميع إعدادات التصميم بما في ذلك صورة الخلفية إن وجدت.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-6 rtl:space-x-reverse">
              <Button
                onClick={closeImportModal}
                variant="outline"
                className="flex-1"
                disabled={importing}
              >
                إلغاء
              </Button>
              <Button
                onClick={importDesign}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={!selectedFile || importing}
              >
                {importing ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent ml-2"></div>
                    جاري الاستيراد...
                  </div>
                ) : (
                  <>
                    <ArrowUpTrayIcon className="w-5 h-5 ml-2" />
                    استيراد
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
