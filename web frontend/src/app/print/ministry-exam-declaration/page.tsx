'use client';

import { useEffect } from 'react';

export default function PrintMinistryExamDeclarationPage() {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 350);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[210mm] min-h-[297mm] px-10 py-12 text-slate-900 leading-8" dir="rtl">
        <h1 className="text-center text-2xl font-bold mb-8">إقرار دخول اختبار وزارة العمل</h1>

        <p className="mb-4">
          أقر أنا المتدرب/المتدربة: ....................................................
        </p>
        <p className="mb-4">
          الرقم القومي: ....................................................
        </p>
        <p className="mb-4">
          البرنامج التدريبي: ....................................................
        </p>

        <p className="mt-8 mb-4">
          بأنني على علم كامل بموعد وضوابط دخول اختبار وزارة العمل، وأتعهد بالالتزام
          بكافة التعليمات المنظمة للاختبار، كما أقر بأن جميع البيانات المقدمة مني
          صحيحة وأتحمل المسؤولية الكاملة عن صحتها.
        </p>

        <p className="mb-4">
          كما أتعهد بإحضار المستندات المطلوبة عند الطلب والالتزام بالحضور في المواعيد
          المحددة.
        </p>

        <div className="mt-16 grid grid-cols-2 gap-8 text-base">
          <div>
            <p className="mb-8">التاريخ: ..... / ..... / ..........</p>
            <p>التوقيع: ....................................................</p>
          </div>
          <div>
            <p className="mb-8">اسم المتدرب/المتدربة:</p>
            <p>....................................................</p>
          </div>
        </div>
      </div>
    </div>
  );
}
