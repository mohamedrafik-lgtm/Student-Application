"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import AdvancedIdCardDesigner from "@/components/id-card-designer/AdvancedIdCardDesigner";
import { idCardDesignsAPI } from "@/lib/id-card-designs-api";
import { IdCardDesign } from "@/types/id-card-design";
import {
  ArrowLeftIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

export default function EditIdCardDesignPage() {
  const router = useRouter();
  const params = useParams();
  const designId = params.id as string;

  const [design, setDesign] = useState<IdCardDesign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // تحميل التصميم
  useEffect(() => {
    const loadDesign = async () => {
      if (!designId || designId === 'new') {
        // إنشاء تصميم جديد
        router.push('/dashboard/settings/id-card-designs/new');
        return;
      }

      setLoading(true);
      try {
        const designData = await idCardDesignsAPI.getById(designId);
        setDesign(designData);
        setError(null);
      } catch (error) {
        console.error("Error loading design:", error);
        setError("حدث خطأ أثناء تحميل التصميم");
        toast.error("حدث خطأ أثناء تحميل التصميم");
      } finally {
        setLoading(false);
      }
    };

    loadDesign();
  }, [designId, router]);

  // تحديث التصميم
  const handleDesignChange = (updatedDesign: IdCardDesign) => {
    setDesign(updatedDesign);
  };

  // العودة إلى قائمة التصاميم
  const goBack = () => {
    router.push('/dashboard/settings/id-card-designs');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-tiba-primary-600 mx-auto mb-4"></div>
          <div className="text-lg font-medium text-gray-700">جاري تحميل التصميم...</div>
        </div>
      </div>
    );
  }

  if (error || !design) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center max-w-md">
          <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            لم يتم العثور على التصميم
          </h2>
          <p className="text-gray-600 mb-6">
            {error || "التصميم المطلوب غير موجود أو تم حذفه"}
          </p>
          <Button onClick={goBack} className="bg-tiba-primary-600 hover:bg-tiba-primary-700">
            <ArrowLeftIcon className="w-5 h-5 ml-2" />
            العودة إلى قائمة التصاميم
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* شريط التنقل */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 space-x-reverse">
            <Button
              variant="outline"
              onClick={goBack}
              size="sm"
            >
              <ArrowLeftIcon className="w-4 h-4 ml-2" />
              العودة
            </Button>
            
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                تحرير التصميم: {design.name}
              </h1>
              <p className="text-sm text-gray-600">
                آخر تحديث: {new Date(design.updatedAt).toLocaleDateString('ar-SA')}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 space-x-reverse">
            {design.isDefault && (
              <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                التصميم الافتراضي
              </span>
            )}
            
            <span className="text-sm text-gray-500">
              إصدار {design.version}
            </span>
          </div>
        </div>
      </div>

      {/* محرر التصميم */}
      <div className="flex-1 overflow-hidden">
        <AdvancedIdCardDesigner
          design={design}
          onDesignChange={handleDesignChange}
          readOnly={false}
        />
      </div>
    </div>
  );
}
