'use client';

export default function ExtractQuestionsPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-2xl w-full mx-4">
        <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
          {/* أيقونة الصيانة */}
          <div className="relative mb-8">
            <div className="w-32 h-32 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <div className="absolute -top-2 -right-2 w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
              <span className="text-2xl">🔧</span>
            </div>
          </div>

          {/* العنوان */}
          <h1 className="text-4xl font-black text-gray-900 mb-4">
            قيد الصيانة
          </h1>
          
          {/* الرسالة */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
            <p className="text-lg text-blue-900 font-semibold mb-3">
              🚧 هذه الميزة قيد التطوير حالياً
            </p>
            <p className="text-blue-700 leading-relaxed">
              ميزة استخراج أسئلة من PDF غير متاحة مؤقتاً للصيانة والتحسين.<br/>
              نعمل على تطويرها لتقديم أفضل تجربة لك.
            </p>
          </div>

          {/* معلومات إضافية */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <h3 className="font-bold text-gray-900 mb-3">💡 الميزات المتاحة حالياً:</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-2xl mb-2">💬</div>
                <div className="font-semibold text-gray-900">محادثة Vision AI</div>
                <div className="text-gray-600 text-xs mt-1">متاح</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-2xl mb-2">📝</div>
                <div className="font-semibold text-gray-900">تصحيح ورقي</div>
                <div className="text-gray-600 text-xs mt-1">متاح</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-2xl mb-2">📊</div>
                <div className="font-semibold text-gray-900">رفع أسئلة Excel</div>
                <div className="text-gray-600 text-xs mt-1">متاح</div>
              </div>
            </div>
          </div>

          {/* زر العودة */}
          <button
            onClick={() => window.history.back()}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg transition-all hover:scale-105"
          >
            ← العودة للمساعد الذكي
          </button>

          {/* ملاحظة */}
          <p className="mt-8 text-sm text-gray-500">
            شكراً لتفهمك 🙏
          </p>
        </div>
      </div>
    </div>
  );
}