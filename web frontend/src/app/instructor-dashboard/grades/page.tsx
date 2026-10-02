'use client';

import { ChartBarIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function InstructorGradesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">إدارة الدرجات</h1>
        <p className="text-gray-600 mt-2">إدخال ومتابعة درجات الطلاب</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-100">
        <ChartBarIcon className="w-20 h-20 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          قريباً
        </h2>
        <p className="text-gray-600 max-w-md mx-auto mb-6">
          سيتم إتاحة إدارة الدرجات من خلال موادك التدريبية
        </p>
        <Link
          href="/instructor-dashboard/my-courses"
          className="inline-block bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors"
        >
          انتقل إلى موادي التدريبية
        </Link>
      </div>
    </div>
  );
}

