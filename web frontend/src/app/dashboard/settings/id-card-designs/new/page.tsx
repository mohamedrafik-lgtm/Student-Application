"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { idCardDesignsAPI } from "@/lib/id-card-designs-api";
import { trainingProgramsAPI, TrainingProgram } from "@/lib/training-programs-api";
import { DEFAULT_ELEMENTS, IdCardElement, STANDARD_ID_CARD_DIMENSIONS } from "@/types/id-card-design";
import {
  ArrowLeftIcon,
  PlusIcon,
  DocumentTextIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";

export default function NewIdCardDesignPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    width: STANDARD_ID_CARD_DIMENSIONS.width_96dpi,  // 323px - حجم الكريديت كارد الدقيق
    height: STANDARD_ID_CARD_DIMENSIONS.height_96dpi, // 204px - حجم الكريديت كارد الدقيق
    isDefault: false,
    programId: null as number | null,
    isProgramDefault: false,
  });
  const [creating, setCreating] = useState(false);
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);

  // جلب البرامج التدريبية
  useEffect(() => {
    const loadPrograms = async () => {
      try {
        const data = await trainingProgramsAPI.getAll();
        setPrograms(data);
      } catch (error) {
        console.error("Error loading programs:", error);
        toast.error("حدث خطأ أثناء تحميل البرامج التدريبية");
      } finally {
        setLoadingPrograms(false);
      }
    };

    loadPrograms();
  }, []);

  // إنشاء التصميم
  const createDesign = async () => {
    if (!formData.name.trim()) {
      toast.error("يرجى إدخال اسم التصميم");
      return;
    }

    // التحقق من صحة الأبعاد
    if (formData.width < 100 || formData.width > 2500 || 
        formData.height < 60 || formData.height > 1500) {
      toast.error("الأبعاد غير صحيحة. العرض: 100-2500 بكسل، الارتفاع: 60-1500 بكسل");
      return;
    }

    setCreating(true);
    try {
      // إنشاء العناصر الافتراضية
      const elements: IdCardElement[] = DEFAULT_ELEMENTS.map((element, index) => ({
        ...element,
        id: element.id || `element_${index}`,
        type: element.type as any,
        position: element.position || { x: 50, y: 50 },
        size: element.size || { width: 100, height: 100 },
        visible: element.visible !== false,
        zIndex: element.zIndex || index + 1,
        locked: element.locked || false,
      })) as IdCardElement[];

      const design = await idCardDesignsAPI.create({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        width: formData.width,
        height: formData.height,
        isDefault: formData.isDefault,
        programId: formData.programId,
        isProgramDefault: formData.isProgramDefault,
        elements,
        version: "1.0",
      });

      toast.success("تم إنشاء التصميم بنجاح");
      router.push(`/dashboard/settings/id-card-designs/${design.id}/edit`);
    } catch (error) {
      console.error("Error creating design:", error);
      toast.error("حدث خطأ أثناء إنشاء التصميم");
    } finally {
      setCreating(false);
    }
  };

  // العودة إلى قائمة التصاميم
  const goBack = () => {
    router.push('/dashboard/settings/id-card-designs');
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      {/* العودة */}
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={goBack}
          size="sm"
        >
          <ArrowLeftIcon className="w-4 h-4 ml-2" />
          العودة إلى قائمة التصاميم
        </Button>
      </div>

      {/* نموذج إنشاء التصميم */}
      <Card className="p-6">
        <div className="text-center mb-6">
          <DocumentTextIcon className="w-16 h-16 text-tiba-primary-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            إنشاء تصميم كارنيه جديد
          </h1>
          <p className="text-gray-600">
            أنشئ تصميمًا جديدًا لكارنيهات الطلاب مع إعدادات مخصصة
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
              placeholder="مثال: تصميم كارنيه تكنولوجيا المعلومات"
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
              placeholder="وصف مختصر للتصميم ومناسبة استخدامه"
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

          {/* أبعاد الكارنيه - قابلة للتعديل */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <DocumentTextIcon className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-medium text-blue-900">أبعاد الكارنيه</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  العرض (بكسل)
                </label>
                <Input
                  type="number"
                  min="100"
                  max="2500"
                  value={formData.width}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    width: parseInt(e.target.value) || STANDARD_ID_CARD_DIMENSIONS.width_96dpi 
                  }))}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {(formData.width * 0.264583).toFixed(1)} مم
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  الارتفاع (بكسل)
                </label>
                <Input
                  type="number"
                  min="60"
                  max="1500"
                  value={formData.height}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    height: parseInt(e.target.value) || STANDARD_ID_CARD_DIMENSIONS.height_96dpi 
                  }))}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {(formData.height * 0.264583).toFixed(1)} مم
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  width: STANDARD_ID_CARD_DIMENSIONS.width_96dpi,
                  height: STANDARD_ID_CARD_DIMENSIONS.height_96dpi
                }))}
                className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                كريديت كارد قياسي (323×204)
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  width: 340,
                  height: 207
                }))}
                className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
              >
                مقاس مخصص (9×5.5 سم)
              </button>
            </div>
            <p className="text-xs text-blue-600 mt-2">
              💡 الافتراضي: كريديت كارد قياسي، يمكنك تعديل الأبعاد حسب الحاجة
            </p>
          </div>


          {/* معاينة الأبعاد */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-3">معاينة الأبعاد</h3>
            <div className="flex justify-center">
              <div 
                className="bg-white border-2 border-gray-300 rounded shadow-sm flex items-center justify-center text-xs text-gray-500"
                style={{
                  width: `${Math.min(formData.width * 0.5, 200)}px`,
                  height: `${Math.min(formData.height * 0.5, 120)}px`,
                  minWidth: '100px',
                  minHeight: '60px',
                }}
              >
                {formData.width} × {formData.height}
              </div>
            </div>
          </div>

          {/* أزرار الإجراء */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={goBack}
              variant="outline"
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              disabled={creating}
            >
              إلغاء
            </Button>
            
            <Button
              onClick={createDesign}
              disabled={creating || !formData.name.trim()}
              className="flex-1 bg-tiba-primary-600 hover:bg-tiba-primary-700"
            >
              {creating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent ml-2"></div>
                  جاري الإنشاء...
                </>
              ) : (
                <>
                  <PlusIcon className="w-4 h-4 ml-2" />
                  إنشاء التصميم
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* معلومات إضافية */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">ملاحظات مهمة:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• سيتم إنشاء التصميم مع العناصر الأساسية (الشعار، الاسم، الصورة، إلخ)</li>
          <li>• يمكنك تخصيص جميع العناصر بعد الإنشاء</li>
          <li>• التصميم الافتراضي سيتم استخدامه لجميع الكارنيهات الجديدة</li>
          <li>• يمكن تغيير أي إعدادات لاحقًا من خلال صفحة التحرير</li>
        </ul>
      </div>
    </div>
  );
}
