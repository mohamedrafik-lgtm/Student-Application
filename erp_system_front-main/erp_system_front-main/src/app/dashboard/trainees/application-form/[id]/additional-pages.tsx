import Image from "next/image";

// دالة لتنسيق تاريخ الانضمام
const formatJoinDate = (createdAt: string): string => {
  try {
    const date = new Date(createdAt);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    return '....../....../................';
  }
};

interface AdditionalPagesProps {
  trainee: {
    id: number;
    nameAr: string;
    nationalId: string;
    createdAt: string;
    program?: {
      nameAr: string;
      price?: number;
    };
  };
  settings: {
    centerName: string;
    centerManagerName: string;
    centerAddress: string;
    centerLogo?: string;
  } | null;
}

export function AdditionalPages({ trainee, settings }: AdditionalPagesProps) {
  return (
    <>
      {/* الصفحة الثالثة - حالات الفصل وإعادة القيد */}
      <div className="bg-white min-h-[297mm] p-8 mb-6 print:mb-0 print:shadow-none shadow-lg print:page-break-after-always">
        {/* رأس النموذج */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-center flex-1">
            <h1 className="text-2xl font-bold mb-2">ملف تقديم البرنامج المهني</h1>
          </div>
          <div className="w-20 h-20 relative">
            <Image
              src="/images/wzara.png"
              alt="وزارة العمل"
              fill
              className="object-contain"
            />
          </div>
        </div>

        {/* حالات الفصل وإعادة القيد */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4 border-b-2 border-gray-300 pb-2">
            حالات الفصل وإعادة القيد
          </h2>

          <div className="space-y-3 text-sm">
            <p>.3 في حالة تجاوز المتدرب نسبة الغياب وهي <span className="font-bold">20%</span> بفصل ولا يسترد المتدرب أي مبالغ مالية.</p>
            <p>.4 في حالة الفصل التأديبي لا يسترد المتدرب أي مبالغ مالية.</p>
            <p>.5 في حالة إعادة القيد يسدد المتدرب رسوم إعادة القيد ويستكمل البرنامج التدريبي، طبقاً للشروط والأحكام الخاصة بالبرنامج التدريبي.</p>
          </div>

          <h3 className="text-md font-bold mt-6 mb-4">حالات التحويل</h3>
          <p className="text-sm">.6 في حالة التحويل من برنامج تدريبي إلى آخر يتم تسديد رسوم التحويل شرط الا يتجاوز حضور المتدرب نسبة <span className="font-bold">20%</span> من البرنامج التدريبي، مع سداد فارق رسوم البرنامج التدريبي أن وجد، ولا يسترد المتدرب أي مبالغ مالية.</p>

          <div className="text-center mt-6">
            <span className="text-sm">توقيع المتدرب : .......................................</span>
          </div>
        </div>

        {/* الاشتراطات السلوكية */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4 border-b-2 border-gray-300 pb-2">
            الاشتراطات السلوكية:
          </h2>

          <div className="space-y-2 text-sm">
            <p>-8 سوء السلوك يعرض المتدرب للفصل. وعدم استرداد مصروفاته التدريبية.</p>
            <p>-9 على المتدرب المحافظة على محتويات المكان من أجهزة خاصة والمدرجات المخصصة للتدريب وخلافه وأن يلتزم بدفع كافة تكاليف الإصلاح لما تسبب في إتلافه من أجهزة أو معدات التدريب أو أي من محتويات المركز ويحمل تكليف البراء (أي شيء لا يمكن إصلاحه). داخل المكان.</p>
            <p>-10 يلتزم المتدرب بعدم التدخين نهائياً إلا في الأماكن المخصصة لذلك.</p>
            <p>-11 في حالة المشاجرات يتم فصل المتدرب نهائياً دون استرداد مصروفاته.</p>
            <p>-12 في حالة الكتابة على الحوائط أو إطفاء الإضاءة يتم إلزام المتدرب بدفع تكاليف إصلاح ما تم إتلافه.</p>
            <p>-13 في حالة التعدي اللفظي على المدرب أو على الموظفين أو على زملائه من المتدربين يتم الفصل نهائياً من البرنامج التدريبي وعدم استرداد مصروفاته التدريبية.</p>
            <p>-14 الغش بجميع أنواعه يعرض المتدرب للفصل نهائياً وعدم استرداد مصروفاته التدريبية.</p>
          </div>

          <div className="text-center mt-6">
            <span className="text-sm">توقيع المتدرب : .......................................</span>
          </div>
        </div>

        {/* رقم الصفحة */}
        <div className="text-center text-sm text-gray-500 mt-auto print:hidden">
          Page 4 of 6
        </div>
      </div>

      {/* الصفحة الرابعة - تعهد سداد المصروفات */}
      <div className="bg-white min-h-[297mm] p-8 print:shadow-none shadow-lg print:page-break-after-always">
        {/* رأس النموذج */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-center flex-1">
            <h1 className="text-2xl font-bold mb-2">ملف تقديم البرنامج المهني</h1>
          </div>
          <div className="w-20 h-20 relative">
            <Image
              src="/images/wzara.png"
              alt="وزارة العمل"
              fill
              className="object-contain"
            />
          </div>
        </div>

        {/* تعهد سداد المصروفات */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4 border-b-2 border-gray-300 pb-2">
            تعهد سداد المصروفات
          </h2>

          <div className="space-y-4 text-sm">
            <p>أتعهد أنا الموقع أدناه المتدرب <span className="font-bold">{trainee.nameAr}</span></p>
            <p>الراغب في الالتحاق بمجال التدريب المهني <span className="font-bold">{trainee.program?.nameAr || 'غير محدد'}</span> أولاً: بسداد المصروفات المقررة للالتحاق بالبرنامج وقدرها <span className="font-bold">{trainee.program?.price ? `${trainee.program.price}` : 'غير محدد'}</span> جنيه مصري</p>
          </div>

          {/* جدول مدة البرنامج التدريبي */}
          <div className="my-8">
            <table className="w-full border-collapse border border-gray-400">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-400 p-2 text-center">م</th>
                  <th className="border border-gray-400 p-2 text-center">مدة البرنامج التدريبي طويل المدى</th>
                  <th className="border border-gray-400 p-2 text-center">تكلفة البرنامج التدريبي</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-400 p-2 text-center">1</td>
                  <td className="border border-gray-400 p-2 text-center">6 - 3 شهور بحد أقصى 480 ساعة تدريبية</td>
                  <td className="border border-gray-400 p-2 text-center">10000 ج</td>
                </tr>
                <tr>
                  <td className="border border-gray-400 p-2 text-center">2</td>
                  <td className="border border-gray-400 p-2 text-center">12 - 6 شهر بحد أقصى 960 ساعة تدريبية</td>
                  <td className="border border-gray-400 p-2 text-center">12000 ج</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* جدول المصروفات الإضافية */}
          <div className="my-8">
            <table className="w-full border-collapse border border-gray-400 text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-400 p-1 text-center">م</th>
                  <th className="border border-gray-400 p-1 text-center">الفئة</th>
                  <th className="border border-gray-400 p-1 text-center">المبلغ</th>
                  <th className="border border-gray-400 p-1 text-center">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-400 p-1 text-center">1</td>
                  <td className="border border-gray-400 p-1 text-center">استمارة الالتحاق</td>
                  <td className="border border-gray-400 p-1 text-center">مجاناً</td>
                  <td className="border border-gray-400 p-1 text-center"></td>
                </tr>
                <tr>
                  <td className="border border-gray-400 p-1 text-center">2</td>
                  <td className="border border-gray-400 p-1 text-center">استمارة دخول الاختبارات</td>
                  <td className="border border-gray-400 p-1 text-center">مجاناً</td>
                  <td className="border border-gray-400 p-1 text-center"></td>
                </tr>
                <tr>
                  <td className="border border-gray-400 p-1 text-center">3</td>
                  <td className="border border-gray-400 p-1 text-center">رسوم إعادة الاختبار</td>
                  <td className="border border-gray-400 p-1 text-center">100</td>
                  <td className="border border-gray-400 p-1 text-center">الإعادة الأولى/الثانية</td>
                </tr>
                <tr>
                  <td className="border border-gray-400 p-1 text-center">4</td>
                  <td className="border border-gray-400 p-1 text-center">شهادة إثبات قيد</td>
                  <td className="border border-gray-400 p-1 text-center">100</td>
                  <td className="border border-gray-400 p-1 text-center"></td>
                </tr>
                <tr>
                  <td className="border border-gray-400 p-1 text-center">5</td>
                  <td className="border border-gray-400 p-1 text-center">إفادة للمؤمنات والمعاشات</td>
                  <td className="border border-gray-400 p-1 text-center">100</td>
                  <td className="border border-gray-400 p-1 text-center"></td>
                </tr>
                <tr>
                  <td className="border border-gray-400 p-1 text-center">6</td>
                  <td className="border border-gray-400 p-1 text-center">إفادة للقوات المسلحة</td>
                  <td className="border border-gray-400 p-1 text-center">100</td>
                  <td className="border border-gray-400 p-1 text-center"></td>
                </tr>
                <tr>
                  <td className="border border-gray-400 p-1 text-center">7</td>
                  <td className="border border-gray-400 p-1 text-center">شهادات التخرج</td>
                  <td className="border border-gray-400 p-1 text-center">مجاناً</td>
                  <td className="border border-gray-400 p-1 text-center"></td>
                </tr>
                <tr>
                  <td className="border border-gray-400 p-1 text-center">8</td>
                  <td className="border border-gray-400 p-1 text-center">استخراج بدل فاقد من شهادات التخرج</td>
                  <td className="border border-gray-400 p-1 text-center">200</td>
                  <td className="border border-gray-400 p-1 text-center"></td>
                </tr>
                <tr>
                  <td className="border border-gray-400 p-1 text-center">9</td>
                  <td className="border border-gray-400 p-1 text-center">تحويل من برنامج تدريبي إلى آخر</td>
                  <td className="border border-gray-400 p-1 text-center">400</td>
                  <td className="border border-gray-400 p-1 text-center">قبل بدء التدريب</td>
                </tr>
                <tr>
                  <td className="border border-gray-400 p-1 text-center">10</td>
                  <td className="border border-gray-400 p-1 text-center">في حالة لا يتجاوز 20% من إجمالي مدة التدريب</td>
                  <td className="border border-gray-400 p-1 text-center">400</td>
                  <td className="border border-gray-400 p-1 text-center"></td>
                </tr>
                <tr>
                  <td className="border border-gray-400 p-1 text-center">11</td>
                  <td className="border border-gray-400 p-1 text-center">إعادة قيد</td>
                  <td className="border border-gray-400 p-1 text-center">1000</td>
                  <td className="border border-gray-400 p-1 text-center">إلا إذا تم التحقيق والاستثناء</td>
                </tr>
                <tr>
                  <td className="border border-gray-400 p-1 text-center">12</td>
                  <td className="border border-gray-400 p-1 text-center">طلبات التنظيم للقيادات والاختبارات</td>
                  <td className="border border-gray-400 p-1 text-center">500</td>
                  <td className="border border-gray-400 p-1 text-center"></td>
                </tr>
                <tr>
                  <td className="border border-gray-400 p-1 text-center">13</td>
                  <td className="border border-gray-400 p-1 text-center">برنامج تحسين مستوى</td>
                  <td className="border border-gray-400 p-1 text-center">250 للجدارة</td>
                  <td className="border border-gray-400 p-1 text-center">طبقاً للبرنامج التدريبي</td>
                </tr>
                <tr>
                  <td className="border border-gray-400 p-1 text-center">14</td>
                  <td className="border border-gray-400 p-1 text-center">بدل فاقد من الكارنيه</td>
                  <td className="border border-gray-400 p-1 text-center">100</td>
                  <td className="border border-gray-400 p-1 text-center"></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* المقبولين فيه */}
          <div className="grid grid-cols-4 gap-4 mb-2 mt-2">
            <div>
              <label className="block text-xs font-medium mb-1">الاسم:</label>
              <div className="border-b border-dotted border-gray-400 pb-1 min-h-[1.5rem] flex items-end justify-center">
                <span className="text-gray-800 text-sm">{trainee.nameAr}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">تاريخ التقديم:</label>
              <div className="border-b border-dotted border-gray-400 pb-1 min-h-[1.5rem] flex items-end justify-center">
                <span className="text-gray-800 text-sm">{formatJoinDate(trainee.createdAt)}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">التوقيع:</label>
              <div className="border-b border-dotted border-gray-400 pb-1 min-h-[1.5rem]"></div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">شئون المدربين:</label>
              <div className="border-b border-dotted border-gray-400 pb-1 min-h-[1.5rem]"></div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-2">
            <div>
              <label className="block text-xs font-medium mb-1">الرقم القومي:</label>
              <div className="border-b border-dotted border-gray-400 pb-1 min-h-[1.5rem] flex items-end justify-center" dir="ltr">
                <span className="text-gray-800 text-sm">{trainee.nationalId}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">التوقيع:</label>
              <div className="border-b border-dotted border-gray-400 pb-1 min-h-[1.5rem]"></div>
            </div>
          </div>
        </div>

        {/* رقم الصفحة */}
        <div className="text-center text-sm text-gray-500 mt-auto print:hidden">
          Page 5 of 6
        </div>
      </div>
    </>
  );
}
