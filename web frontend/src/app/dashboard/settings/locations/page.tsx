'use client';

import { useState, useEffect } from 'react';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import PageHeader from '@/app/components/PageHeader';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/components/ui/input';
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import PageGuard from '@/components/permissions/PageGuard';

export default function LocationsManagementPage() {
  return (
    <PageGuard requiredPermission="settings.locations.manage">
      <LocationsManagementContent />
    </PageGuard>
  );
}

function LocationsManagementContent() {
  const [countries, setCountries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<any>(null);
  const [selectedGovernorate, setSelectedGovernorate] = useState<any>(null);
  
  // Modals
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showGovernorateModal, setShowGovernorateModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  
  // Form data
  const [countryForm, setCountryForm] = useState({ id: '', code: '', nameAr: '', nameEn: '', order: 0 });
  const [governorateForm, setGovernorateForm] = useState({ id: '', countryId: '', code: '', nameAr: '', nameEn: '', order: 0 });
  const [cityForm, setCityForm] = useState({ id: '', governorateId: '', code: '', nameAr: '', nameEn: '', order: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchAPI('/locations/countries');
      setCountries(data || []);
    } catch (error) {
      console.error('Error loading locations:', error);
      toast.error('حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCountry = async () => {
    try {
      if (countryForm.id) {
        await fetchAPI(`/locations/countries/${countryForm.id}`, {
          method: 'PATCH',
          body: JSON.stringify(countryForm),
        });
        toast.success('تم تحديث الدولة');
      } else {
        await fetchAPI('/locations/countries', {
          method: 'POST',
          body: JSON.stringify(countryForm),
        });
        toast.success('تم إضافة الدولة');
      }
      setShowCountryModal(false);
      setCountryForm({ id: '', code: '', nameAr: '', nameEn: '', order: 0 });
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ');
    }
  };

  const handleSaveGovernorate = async () => {
    try {
      if (governorateForm.id) {
        await fetchAPI(`/locations/governorates/${governorateForm.id}`, {
          method: 'PATCH',
          body: JSON.stringify(governorateForm),
        });
        toast.success('تم تحديث المحافظة');
      } else {
        await fetchAPI('/locations/governorates', {
          method: 'POST',
          body: JSON.stringify(governorateForm),
        });
        toast.success('تم إضافة المحافظة');
      }
      setShowGovernorateModal(false);
      setGovernorateForm({ id: '', countryId: '', code: '', nameAr: '', nameEn: '', order: 0 });
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ');
    }
  };

  const handleSaveCity = async () => {
    try {
      if (cityForm.id) {
        await fetchAPI(`/locations/cities/${cityForm.id}`, {
          method: 'PATCH',
          body: JSON.stringify(cityForm),
        });
        toast.success('تم تحديث المدينة');
      } else {
        await fetchAPI('/locations/cities', {
          method: 'POST',
          body: JSON.stringify(cityForm),
        });
        toast.success('تم إضافة المدينة');
      }
      setShowCityModal(false);
      setCityForm({ id: '', governorateId: '', code: '', nameAr: '', nameEn: '', order: 0 });
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ');
    }
  };

  const handleDeleteCountry = async (id: string) => {
    if (!confirm('هل أنت متأكد؟ سيتم حذف جميع المحافظات والمدن المرتبطة')) return;
    try {
      await fetchAPI(`/locations/countries/${id}`, { method: 'DELETE' });
      toast.success('تم الحذف');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ');
    }
  };

  return (
    <div>
      <PageHeader
        title="إدارة المواقع الجغرافية"
        description="إدارة الدول والمحافظات والمدن"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'الإعدادات', href: '/dashboard/settings' },
          { label: 'المواقع الجغرافية' }
        ]}
        actions={
          <Button
            onClick={() => {
              setCountryForm({ id: '', code: '', nameAr: '', nameEn: '', order: 0 });
              setShowCountryModal(true);
            }}
            leftIcon={<PlusIcon className="w-4 h-4" />}
          >
            إضافة دولة
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Countries */}
          <Card className="shadow-lg">
            <div className="p-4 border-b bg-gradient-to-r from-emerald-50 to-teal-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                الدول ({countries.length})
              </h3>
              <button
                onClick={() => {
                  setCountryForm({ id: '', code: '', nameAr: '', nameEn: '', order: 0 });
                  setShowCountryModal(true);
                }}
                className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto">
              {countries.map((country) => (
                <div
                  key={country.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                    selectedCountry?.id === country.id
                      ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-400 shadow-md'
                      : 'hover:bg-gray-50 hover:border-gray-300'
                  }`}
                  onClick={() => {
                    setSelectedCountry(country);
                    setSelectedGovernorate(null);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{country.nameAr}</div>
                      <div className="text-xs text-gray-500 mt-0.5">كود: {country.code}</div>
                      <div className="text-xs text-emerald-600 mt-0.5">{country.governorates?.length || 0} محافظة</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCountryForm(country);
                          setShowCountryModal(true);
                        }}
                        className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                        title="تعديل"
                      >
                        <PencilIcon className="w-4 h-4 text-blue-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Governorates */}
          <Card className="shadow-lg">
            <div className="p-4 border-b bg-gradient-to-r from-teal-50 to-cyan-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                المحافظات {selectedCountry && `(${selectedCountry.governorates?.length || 0})`}
              </h3>
              {selectedCountry && (
                <button
                  onClick={() => {
                    setGovernorateForm({ id: '', countryId: selectedCountry.id, code: '', nameAr: '', nameEn: '', order: 0 });
                    setShowGovernorateModal(true);
                  }}
                  className="p-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto">
              {selectedCountry ? (
                selectedCountry.governorates?.map((gov: any) => (
                  <div
                    key={gov.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      selectedGovernorate?.id === gov.id
                        ? 'bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-400 shadow-md'
                        : 'hover:bg-gray-50 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedGovernorate(gov)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{gov.nameAr}</div>
                        <div className="text-xs text-teal-600 mt-0.5">{gov.cities?.length || 0} مدينة</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setGovernorateForm({ ...gov, countryId: selectedCountry.id });
                          setShowGovernorateModal(true);
                        }}
                        className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                        title="تعديل"
                      >
                        <PencilIcon className="w-4 h-4 text-blue-600" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  اختر دولة لعرض المحافظات
                </div>
              )}
            </div>
          </Card>

          {/* Cities */}
          <Card className="shadow-lg">
            <div className="p-4 border-b bg-gradient-to-r from-cyan-50 to-blue-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
                المدن {selectedGovernorate && `(${selectedGovernorate.cities?.length || 0})`}
              </h3>
              {selectedGovernorate && (
                <button
                  onClick={() => {
                    setCityForm({ id: '', governorateId: selectedGovernorate.id, code: '', nameAr: '', nameEn: '', order: 0 });
                    setShowCityModal(true);
                  }}
                  className="p-1.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto">
              {selectedGovernorate ? (
                selectedGovernorate.cities?.map((city: any) => (
                  <div
                    key={city.id}
                    className="p-3 border rounded-lg hover:bg-gray-50 transition-all hover:shadow-md hover:border-gray-300"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 font-semibold text-gray-900">{city.nameAr}</div>
                      <button
                        onClick={() => {
                          setCityForm({ ...city, governorateId: selectedGovernorate.id });
                          setShowCityModal(true);
                        }}
                        className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                        title="تعديل"
                      >
                        <PencilIcon className="w-4 h-4 text-blue-600" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  اختر محافظة لعرض المدن
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Country Modal */}
      {showCountryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b">
              <h3 className="text-lg font-bold">{countryForm.id ? 'تعديل دولة' : 'إضافة دولة'}</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">الكود *</label>
                <Input
                  value={countryForm.code}
                  onChange={(e) => setCountryForm({ ...countryForm, code: e.target.value.toUpperCase() })}
                  placeholder="EG"
                  maxLength={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">الاسم بالعربية *</label>
                <Input
                  value={countryForm.nameAr}
                  onChange={(e) => setCountryForm({ ...countryForm, nameAr: e.target.value })}
                  placeholder="مصر"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">الاسم بالإنجليزية</label>
                <Input
                  value={countryForm.nameEn || ''}
                  onChange={(e) => setCountryForm({ ...countryForm, nameEn: e.target.value })}
                  placeholder="Egypt"
                />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCountryModal(false)}>إلغاء</Button>
              <Button onClick={handleSaveCountry} className="bg-emerald-600 hover:bg-emerald-700">حفظ</Button>
            </div>
          </div>
        </div>
      )}

      {/* Governorate Modal */}
      {showGovernorateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b">
              <h3 className="text-lg font-bold">{governorateForm.id ? 'تعديل محافظة' : 'إضافة محافظة'}</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">الكود *</label>
                <Input
                  value={governorateForm.code}
                  onChange={(e) => setGovernorateForm({ ...governorateForm, code: e.target.value.toLowerCase() })}
                  placeholder="cairo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">الاسم بالعربية *</label>
                <Input
                  value={governorateForm.nameAr}
                  onChange={(e) => setGovernorateForm({ ...governorateForm, nameAr: e.target.value })}
                  placeholder="القاهرة"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">الاسم بالإنجليزية</label>
                <Input
                  value={governorateForm.nameEn || ''}
                  onChange={(e) => setGovernorateForm({ ...governorateForm, nameEn: e.target.value })}
                  placeholder="Cairo"
                />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowGovernorateModal(false)}>إلغاء</Button>
              <Button onClick={handleSaveGovernorate} className="bg-teal-600 hover:bg-teal-700">حفظ</Button>
            </div>
          </div>
        </div>
      )}

      {/* City Modal */}
      {showCityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b">
              <h3 className="text-lg font-bold">{cityForm.id ? 'تعديل مدينة' : 'إضافة مدينة'}</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">الكود *</label>
                <Input
                  value={cityForm.code}
                  onChange={(e) => setCityForm({ ...cityForm, code: e.target.value.toLowerCase() })}
                  placeholder="mansoura"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">الاسم بالعربية *</label>
                <Input
                  value={cityForm.nameAr}
                  onChange={(e) => setCityForm({ ...cityForm, nameAr: e.target.value })}
                  placeholder="المنصورة"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">الاسم بالإنجليزية</label>
                <Input
                  value={cityForm.nameEn || ''}
                  onChange={(e) => setCityForm({ ...cityForm, nameEn: e.target.value })}
                  placeholder="Mansoura"
                />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCityModal(false)}>إلغاء</Button>
              <Button onClick={handleSaveCity} className="bg-cyan-600 hover:bg-cyan-700">حفظ</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}