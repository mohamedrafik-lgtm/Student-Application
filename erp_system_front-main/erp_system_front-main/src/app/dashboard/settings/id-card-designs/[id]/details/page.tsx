"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { idCardDesignsAPI } from "@/lib/id-card-designs-api";
import { trainingProgramsAPI, TrainingProgram } from "@/lib/training-programs-api";
import { IdCardDesign } from "@/types/id-card-design";
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

export default function EditIdCardDesignDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const designId = params.id as string;

  const [design, setDesign] = useState<IdCardDesign | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    programId: null as number | null,
    isProgramDefault: false,
    isDefault: false,
  });

  // تحميل التصميم والبرامج
  useEffect(() => {
    const loadData = async () => {
      try {
        const [designData, programsData] = await Promise.all([
          idCardDesignsAPI.getById(designId),
          trainingProgramsAPI.getAll(),
        ]);

        setDesign(designData);
        setPrograms(programsData);
        
        // تعبئة النموذج
        setFormData({
          name: designData.name,
          description: designData.description || "",
          programId: designData.programId || null,
          isProgramDefault: designData.isProgramDefault || false,
          isDefault: designData.isDefault || false,
        });
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("حدث خطأ أثناء تحميل البيانات");
      } finally {
        setLoading(false);
        setLoadingPrograms(false);
      }
    };

    if (designId) {
      loadData();
    }
  }, [designId]);

  // حفظ التغييرات
  const saveChanges = async () => {
    if (!formData.name.trim()) {
      toast.error("يرجى إدخال اسم التصميم");
      return;
    }

    setSaving(true);
    try {
      await idCardDesignsAPI.update(designId, {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        programId: formData.programId,
        isProgramDefault: formData.isProgramDefault,
        isDefault: formData.isDefault,
      });

      toast.success("تم حفظ التغييرات بنجاح");
      router.push("/dashboard/settings/id-card-designs");
    } catch (error) {
      console.error("Error saving changes:", error);
      toast.error("حدث خطأ أثناء حفظ التغييرات");
    } finally {
      setSaving(false);
    }
  };

  // العودة
  const goBack = () => {
    router.push("/dashboard/settings/id-card-designs");
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">جاري تحميل بيانات التصميم...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!design) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="text-center py-12">
          <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">التصميم غير موجود</h2>
          <p className="text-gray-600 mb-6">لم يتم العثور على التصميم المطلوب</p>
          <Button onClick={goBack}>
            <ArrowLeftIcon className="w-4 h-4 ml-2" />
            العودة إلى قائمة التصاميم
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      {/* العودة */}
      <div className="mb-6">
        <Button variant="outline" onClick={goBack} size="sm">
          <ArrowLeftIcon className="w-4 h-4 ml-2" />
          العودة إلى قائمة التصاميم
        </Button>
      </div>

      {/* نموذج تعديل التفاصيل */}
      <Card className="p-6">
        <div className="text-center mb-6">
          <Cog6ToothIcon className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            تعديل تفاصيل التصميم
          </h1>
          <p className="text-gray-600">
            تعديل الاسم والوصف والبرنامج المرتبط بالتصميم
          </p>
        </div>

        <div className="space-y-6">
          {/* اسم التصميم */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اسم التصميم *
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="اسم التصميم"
              className="w-full"
            />
          </div>

          {/* وصف التصميم */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              وصف التصميم
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="وصف مختصر للتصميم"
              className="w-full p-3 border border-gray-300 rounded-md resize-none h-20 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* البرنامج التدريبي */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <AcademicCapIcon className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-medium text-emerald-900">البرنامج التدريبي</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-emerald-700 mb-2">
                  اختيار البرنامج
                </label>
                {loadingPrograms ? (
                  <div className="flex items-center space-x-2 p-3 border border-gray-300 rounded-md">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent"></div>
                    <span className="text-sm text-gray-600">جاري تحميل البرامج...</span>
                  </div>
                ) : (
                  <select
                    value={formData.programId || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData(prev => ({ 
                        ...prev, 
                        programId: value ? parseInt(value) : null,
                        isProgramDefault: false // إعادة تعيين عند تغيير البرنامج
                      }));
                    }}
                    className="w-full p-3 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="">تصميم عام (متاح لكل البرامج)</option>
                    {programs.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.nameAr}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* خيار التصميم الافتراضي */}
              {formData.programId && (
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="isProgramDefault"
                    checked={formData.isProgramDefault}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      isProgramDefault: e.target.checked,
                      isDefault: false // لا يمكن أن يكون افتراضي عام وبرنامج معاً
                    }))}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-400 rounded bg-white"
                  />
                  <label htmlFor="isProgramDefault" className="text-sm text-emerald-700">
                    جعل هذا التصميم افتراضي لهذا البرنامج
                  </label>
                </div>
              )}

              {!formData.programId && (
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      isDefault: e.target.checked,
                      isProgramDefault: false // لا يمكن أن يكون افتراضي عام وبرنامج معاً
                    }))}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-400 rounded bg-white"
                  />
                  <label htmlFor="isDefault" className="text-sm text-emerald-700">
                    جعل هذا التصميم الافتراضي العام للنظام
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* معلومات التصميم (للقراءة فقط) */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <DocumentTextIcon className="w-5 h-5 text-gray-600" />
              <h3 className="text-sm font-medium text-gray-900">معلومات التصميم</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">الأبعاد:</span>
                <span className="font-medium text-gray-900 mr-2">
                  {design.width} × {design.height} بكسل
                </span>
              </div>
              <div>
                <span className="text-gray-500">العناصر:</span>
                <span className="font-medium text-gray-900 mr-2">
                  {design.designData.elements.length} عنصر
                </span>
              </div>
              <div>
                <span className="text-gray-500">الإصدار:</span>
                <span className="font-medium text-gray-900 mr-2">
                  v{design.version}
                </span>
              </div>
              <div>
                <span className="text-gray-500">تاريخ الإنشاء:</span>
                <span className="font-medium text-gray-900 mr-2">
                  {new Date(design.createdAt).toLocaleDateString('ar-EG')}
                </span>
              </div>
            </div>
          </div>

          {/* أزرار الحفظ */}
          <div className="flex space-x-3 pt-4 rtl:space-x-reverse">
            <Button
              onClick={goBack}
              variant="outline"
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              disabled={saving}
            >
              إلغاء
            </Button>
            <Button
              onClick={saveChanges}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={saving}
            >
              {saving ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent ml-2"></div>
                  جاري الحفظ...
                </div>
              ) : (
                <>
                  <DocumentTextIcon className="w-5 h-5 ml-2" />
                  حفظ التغييرات
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
