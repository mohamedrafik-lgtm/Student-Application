'use client';

import { useState } from 'react';
import PageHeader from '@/app/components/PageHeader';
import { Card } from '@/app/components/ui/Card';
import { 
  FiCheckCircle, 
  FiTool, 
  FiZap, 
  FiShield,
  FiActivity,
  FiServer,
  FiCamera,
  FiDatabase,
  FiLock
} from 'react-icons/fi';
import { updates, type Update, type UpdateItem } from '@/lib/updates-data';

const getIcon = (iconName?: string) => {
  switch (iconName) {
    case 'camera': return <FiCamera className="text-blue-500" />;
    case 'zap': return <FiZap className="text-yellow-500" />;
    case 'database': return <FiDatabase className="text-green-500" />;
    case 'tool': return <FiTool className="text-orange-500" />;
    case 'shield': return <FiShield className="text-purple-500" />;
    case 'server': return <FiServer className="text-indigo-500" />;
    case 'activity': return <FiActivity className="text-pink-500" />;
    case 'lock': return <FiLock className="text-red-500" />;
    default: return <FiCheckCircle className="text-green-500" />;
  }
};

export default function UpdatesPage() {
  const [expandedVersion, setExpandedVersion] = useState<string>('2.4');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <PageHeader
            title="📋 تتبع التحديثات"
            description="جميع التحديثات والإصلاحات والميزات الجديدة في النظام"
          />

          {/* Timeline */}
          <div className="relative mt-8">
            {/* الخط العمودي */}
            <div className="absolute right-4 sm:right-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500"></div>

            {updates.map((update, index) => (
              <div key={update.version} className="relative mb-8 sm:mb-12">
                {/* دائرة الإصدار */}
                <div className="absolute right-0 sm:-right-2 w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-xl z-10 border-4 border-white">
                  <span className="text-white font-bold text-xs sm:text-sm">v{update.version}</span>
                </div>

                {/* بطاقة التحديث */}
                <div className="mr-12 sm:mr-20">
                  <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 border-2 border-blue-200">
                    <div 
                      className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 sm:p-6 cursor-pointer"
                      onClick={() => setExpandedVersion(expandedVersion === update.version ? '' : update.version)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
                            الإصدار {update.version}
                          </h2>
                          <p className="text-blue-100 text-sm sm:text-base">
                            📅 {new Date(update.date).toLocaleDateString('ar-EG', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="text-center">
                            <div className="text-2xl sm:text-3xl font-bold text-white">
                              {update.features.length + update.fixes.length + update.improvements.length + update.security.length}
                            </div>
                            <div className="text-xs sm:text-sm text-blue-100">تحديث</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {expandedVersion === update.version && (
                      <div className="p-4 sm:p-6 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                        {/* الميزات الجديدة */}
                        {update.features.length > 0 && (
                          <div>
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                              <FiZap className="text-yellow-500 text-xl sm:text-2xl" />
                              ✨ ميزات جديدة
                            </h3>
                            <div className="space-y-2 sm:space-y-3">
                              {update.features.map((item, idx) => (
                                <div 
                                  key={idx} 
                                  className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-colors"
                                >
                                  <div className="mt-0.5 text-lg sm:text-xl">{getIcon(item.icon)}</div>
                                  <p className="text-gray-700 text-sm sm:text-base flex-1">{item.text}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* الإصلاحات */}
                        {update.fixes.length > 0 && (
                          <div>
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                              <FiTool className="text-orange-500 text-xl sm:text-2xl" />
                              🔧 إصلاحات
                            </h3>
                            <div className="space-y-2 sm:space-y-3">
                              {update.fixes.map((item, idx) => (
                                <div 
                                  key={idx} 
                                  className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-gradient-to-r from-orange-50 to-red-50 hover:from-orange-100 hover:to-red-100 transition-colors"
                                >
                                  <FiCheckCircle className="text-green-500 mt-0.5 flex-shrink-0 text-base sm:text-lg" />
                                  <p className="text-gray-700 text-sm sm:text-base flex-1">{item.text}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* التحسينات */}
                        {update.improvements.length > 0 && (
                          <div>
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                              <FiActivity className="text-green-500 text-xl sm:text-2xl" />
                              ⚡ تحسينات وأداء
                            </h3>
                            <div className="space-y-2 sm:space-y-3">
                              {update.improvements.map((item, idx) => (
                                <div 
                                  key={idx} 
                                  className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition-colors"
                                >
                                  <FiCheckCircle className="text-green-500 mt-0.5 flex-shrink-0 text-base sm:text-lg" />
                                  <p className="text-gray-700 text-sm sm:text-base flex-1">{item.text}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* الأمان */}
                        {update.security.length > 0 && (
                          <div>
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                              <FiShield className="text-red-500 text-xl sm:text-2xl" />
                              🔒 الأمان والحماية
                            </h3>
                            <div className="space-y-2 sm:space-y-3">
                              {update.security.map((item, idx) => (
                                <div 
                                  key={idx} 
                                  className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-gradient-to-r from-red-50 to-pink-50 hover:from-red-100 hover:to-pink-100 transition-colors border border-red-200"
                                >
                                  <div className="mt-0.5 text-lg sm:text-xl">{getIcon(item.icon)}</div>
                                  <p className="text-gray-700 text-sm sm:text-base flex-1 font-medium">{item.text}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <Card className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
            <div className="text-center">
              <p className="text-gray-700 text-sm sm:text-base mb-2">
                💡 نعمل باستمرار على تطوير وتحسين النظام
              </p>
              <p className="text-gray-600 text-xs sm:text-sm">
                آخر تحديث: {new Date(updates[0].date).toLocaleDateString('ar-EG')}
              </p>
            </div>
          </Card>
        </div>
      </div>
  );
}

