'use client';

import { useEffect, useState } from 'react';
import { UserCircleIcon, EnvelopeIcon, PhoneIcon } from '@heroicons/react/24/outline';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  accountType: string;
  createdAt: string;
}

export default function InstructorProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = document.cookie
          .split('; ')
          .find(row => row.startsWith('auth_token='))
          ?.split('=')[1];

        if (!token) return;

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/profile`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setUser(data);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8 bg-white rounded-xl shadow-sm border">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserCircleIcon className="w-10 h-10 text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">خطأ في تحميل البيانات</h3>
          <p className="text-gray-600">عذراً، لم نتمكن من تحميل بيانات الملف الشخصي.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white">
        <h1 className="text-2xl font-bold">الملف الشخصي</h1>
        <p className="text-blue-100 text-sm mt-1">معلوماتك الشخصية وبيانات حسابك</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {/* Header with Avatar */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 border-b">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-4xl">{user.name?.charAt(0)}</span>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">{user.name}</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-3 py-1 bg-blue-500 text-white text-sm rounded-full font-medium">
                  محاضر
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Information Grid */}
        <div className="p-8">
          <h3 className="text-lg font-bold text-gray-900 mb-6">معلومات الحساب</h3>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Email */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <EnvelopeIcon className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm font-semibold text-gray-600">البريد الإلكتروني</span>
              </div>
              <p className="text-gray-900 font-medium text-lg">{user.email}</p>
            </div>

            {/* Phone */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <PhoneIcon className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-sm font-semibold text-gray-600">رقم الهاتف</span>
              </div>
              <p className="text-gray-900 font-medium text-lg" dir="ltr">
                {user.phone || 'غير محدد'}
              </p>
            </div>

            {/* Account Type */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <UserCircleIcon className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-sm font-semibold text-gray-600">نوع الحساب</span>
              </div>
              <p className="text-gray-900 font-medium text-lg">محاضر - Instructor</p>
            </div>

            {/* Created Date */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-gray-600">تاريخ الإنشاء</span>
              </div>
              <p className="text-gray-900 font-medium text-lg">
                {new Date(user.createdAt).toLocaleDateString('ar-EG', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

