'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePermissions } from '../../../hooks/usePermissions';
import { useRouter } from 'next/navigation';
import { FiLink, FiToggleRight, FiExternalLink, FiShield, FiPlus, FiTrash2, FiRefreshCw, FiX, FiSmartphone, FiHash } from 'react-icons/fi';
import { FaWhatsapp, FaFacebookMessenger } from 'react-icons/fa';
import {
  getCrmWhatsAppChannels,
  createCrmWhatsAppChannel,
  connectCrmChannelWithQR,
  connectCrmChannelWithPairCode,
  disconnectCrmChannel,
  deleteCrmChannel,
  regenerateCrmQR,
  getCrmChannelStatus,
  type CrmWhatsAppChannel,
} from '../../lib/api/crm-whatsapp';

export default function CrmChannelsPage() {
  const { userPermissions, loading: permLoading } = usePermissions();
  const router = useRouter();

  const [whatsappChannels, setWhatsappChannels] = useState<CrmWhatsAppChannel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // حالة إنشاء قناة جديدة
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');

  // حالة الاتصال
  const [connectModal, setConnectModal] = useState<{ channelId: string; channelName: string } | null>(null);
  const [connectMethod, setConnectMethod] = useState<'qr' | 'pair' | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [pairPhoneNumber, setPairPhoneNumber] = useState('');
  const [connectingStatus, setConnectingStatus] = useState<string>('');

  const hasAccess = userPermissions?.hasPermission('crm.channels', 'view') || false;
  const canManage = userPermissions?.hasPermission('crm.channels', 'manage') || false;

  const loadChannels = useCallback(async () => {
    try {
      const channels = await getCrmWhatsAppChannels();
      setWhatsappChannels(channels);
    } catch (error) {
      console.error('Failed to load channels:', error);
    } finally {
      setLoadingChannels(false);
    }
  }, []);

  useEffect(() => {
    if (!permLoading && !hasAccess) {
      router.push('/crm');
    }
  }, [permLoading, hasAccess, router]);

  useEffect(() => {
    if (hasAccess) {
      loadChannels();
    }
  }, [hasAccess, loadChannels]);

  // تحديث الحالة دورياً
  useEffect(() => {
    if (!hasAccess) return;
    const interval = setInterval(() => {
      loadChannels();
    }, 15000);
    return () => clearInterval(interval);
  }, [hasAccess, loadChannels]);

  // Polling للحالة أثناء الاتصال
  useEffect(() => {
    if (!connectModal) return;
    const interval = setInterval(async () => {
      try {
        const status = await getCrmChannelStatus(connectModal.channelId);
        if (status.isConnected) {
          setConnectingStatus('تم الاتصال بنجاح!');
          await loadChannels();
          setTimeout(() => {
            setConnectModal(null);
            setConnectMethod(null);
            setQrCode(null);
            setPairCode(null);
            setConnectingStatus('');
          }, 2000);
        } else if (status.qrCode && connectMethod === 'qr') {
          setQrCode(status.qrCode);
        }
      } catch {
        // تجاهل
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [connectModal, connectMethod, loadChannels]);

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;
    setActionLoading('create');
    try {
      await createCrmWhatsAppChannel(newChannelName.trim());
      setNewChannelName('');
      setShowCreateModal(false);
      await loadChannels();
    } catch (error) {
      console.error('Failed to create channel:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConnectQR = async (channelId: string) => {
    setActionLoading(channelId);
    setConnectingStatus('جاري توليد QR Code...');
    setQrCode(null);
    try {
      const result = await connectCrmChannelWithQR(channelId);
      if (result.success) {
        if (result.connected) {
          setConnectingStatus('تم الاتصال بنجاح!');
          await loadChannels();
          setTimeout(() => {
            setConnectModal(null);
            setConnectMethod(null);
            setConnectingStatus('');
          }, 2000);
        } else if (result.qrCode) {
          setQrCode(result.qrCode);
          setConnectingStatus('امسح رمز QR من تطبيق واتساب على هاتفك');
        }
      } else {
        setConnectingStatus(result.message || 'فشل في توليد QR Code');
      }
    } catch {
      setConnectingStatus('حدث خطأ أثناء الاتصال');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConnectPair = async (channelId: string) => {
    if (!pairPhoneNumber.trim()) return;
    setActionLoading(channelId);
    setConnectingStatus('جاري توليد كود الإقران...');
    setPairCode(null);
    try {
      const result = await connectCrmChannelWithPairCode(channelId, pairPhoneNumber.trim());
      if (result.success) {
        if (result.connected) {
          setConnectingStatus('تم الاتصال بنجاح!');
          await loadChannels();
          setTimeout(() => {
            setConnectModal(null);
            setConnectMethod(null);
            setConnectingStatus('');
            setPairPhoneNumber('');
          }, 2000);
        } else if (result.pairCode) {
          setPairCode(result.pairCode);
          setConnectingStatus('أدخل هذا الكود في تطبيق واتساب > الأجهزة المرتبطة > ربط جهاز');
        }
      } else {
        setConnectingStatus(result.message || 'فشل في توليد كود الإقران');
      }
    } catch {
      setConnectingStatus('حدث خطأ أثناء الاتصال');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisconnect = async (channelId: string) => {
    if (!confirm('هل أنت متأكد من قطع اتصال هذه القناة؟')) return;
    setActionLoading(channelId);
    try {
      await disconnectCrmChannel(channelId);
      await loadChannels();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (channelId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه القناة؟ سيتم حذف جميع البيانات المرتبطة بها.')) return;
    setActionLoading(channelId);
    try {
      await deleteCrmChannel(channelId);
      await loadChannels();
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRegenerateQR = async (channelId: string) => {
    setActionLoading(channelId);
    setConnectingStatus('جاري إعادة توليد QR Code...');
    setQrCode(null);
    try {
      const result = await regenerateCrmQR(channelId);
      if (result.success && result.qrCode) {
        setQrCode(result.qrCode);
        setConnectingStatus('امسح رمز QR من تطبيق واتساب على هاتفك');
      } else {
        setConnectingStatus(result.message || 'فشل في إعادة التوليد');
      }
    } catch {
      setConnectingStatus('حدث خطأ');
    } finally {
      setActionLoading(null);
    }
  };

  if (permLoading || loadingChannels) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!hasAccess) return null;

  const getStatusBadge = (channel: CrmWhatsAppChannel) => {
    if (channel.isConnected || channel.status === 'connected') {
      return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>متصل</span>;
    }
    if (channel.status === 'connecting') {
      return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>قيد الاتصال</span>;
    }
    return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>غير متصل</span>;
  };

  return (
    <div className="h-full overflow-y-auto px-4 lg:px-8 pb-8">
    <div className="py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <FiLink className="w-5 h-5 text-blue-600" />
            </div>
            القنوات المتصلة
          </h1>
          <p className="text-slate-500 mt-1">إدارة قنوات التواصل المتصلة بنظام CRM</p>
        </div>

        <div className="flex items-center gap-3">
          {canManage && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <FiPlus className="w-4 h-4" />
              إضافة قناة واتساب
            </button>
          )}
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-200">
            <FiShield className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">متاح لمديري النظام فقط</span>
          </div>
        </div>
      </div>

      {/* WhatsApp Channels */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
          <FaWhatsapp className="w-5 h-5 text-emerald-600" />
          قنوات واتساب
        </h2>

        {whatsappChannels.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <FaWhatsapp className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">لا توجد قنوات واتساب</h3>
            <p className="text-slate-500 text-sm mb-4">أضف قناة واتساب جديدة لبدء التواصل مع عملائك</p>
            {canManage && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
              >
                <FiPlus className="w-4 h-4" />
                إضافة قناة واتساب
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {whatsappChannels.map((channel) => (
              <div
                key={channel.id}
                className={`bg-white rounded-2xl border ${channel.isConnected ? 'border-emerald-200' : 'border-slate-200'} shadow-sm overflow-hidden transition-all hover:shadow-md`}
              >
                {/* Channel Header */}
                <div className={`px-6 py-5 ${channel.isConnected ? 'bg-emerald-50/50' : 'bg-slate-50/50'} border-b ${channel.isConnected ? 'border-emerald-100' : 'border-slate-100'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm">
                        <FaWhatsapp className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">{channel.name}</h3>
                        <p className="text-sm text-slate-500">
                          {channel.livePhoneNumber || channel.phoneNumber || 'غير متصل'}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(channel)}
                  </div>
                </div>

                {/* Channel Body */}
                <div className="px-6 py-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 rounded-xl bg-slate-50">
                      <p className="text-sm font-bold text-slate-800">
                        {channel.isConnected ? 'متصل' : 'غير متصل'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">الحالة</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-slate-50">
                      <p className="text-sm font-bold text-slate-800" dir="ltr">
                        {channel.connectedAt ? new Date(channel.connectedAt).toLocaleDateString('ar-EG') : '---'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">آخر اتصال</p>
                    </div>
                  </div>

                  {/* Actions */}
                  {canManage && (
                    <div className="flex items-center gap-2 pt-2">
                      {channel.isConnected || channel.status === 'connected' ? (
                        <>
                          <button
                            onClick={() => handleDisconnect(channel.id)}
                            disabled={actionLoading === channel.id}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors disabled:opacity-50"
                          >
                            <FiToggleRight className="w-4 h-4" />
                            قطع الاتصال
                          </button>
                          <button
                            onClick={() => handleDelete(channel.id)}
                            disabled={actionLoading === channel.id}
                            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setConnectModal({ channelId: channel.id, channelName: channel.name });
                              setConnectMethod(null);
                              setQrCode(null);
                              setPairCode(null);
                              setConnectingStatus('');
                            }}
                            disabled={actionLoading === channel.id}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
                          >
                            <FiExternalLink className="w-4 h-4" />
                            ربط واتساب
                          </button>
                          <button
                            onClick={() => handleDelete(channel.id)}
                            disabled={actionLoading === channel.id}
                            className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Facebook Messenger - Static */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
          <FaFacebookMessenger className="w-5 h-5 text-blue-600" />
          فيسبوك ماسنجر
        </h2>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 bg-slate-50/50 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm">
                  <FaFacebookMessenger className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">فيسبوك ماسنجر</h3>
                  <p className="text-sm text-slate-500">Facebook Messenger</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                قريباً
              </span>
            </div>
          </div>
          <div className="px-6 py-5">
            <p className="text-sm text-slate-600 leading-relaxed">
              ربط صفحة فيسبوك لاستقبال رسائل ماسنجر والرد عليها من داخل نظام CRM.
              هذه الميزة قيد التطوير وستكون متاحة قريباً.
            </p>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-gradient-to-l from-blue-500 to-blue-700 rounded-2xl p-6 text-white">
        <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
          <FiLink className="w-5 h-5" />
          حول القنوات المتصلة
        </h3>
        <p className="text-white/80 text-sm leading-relaxed">
          قم بربط قنوات التواصل الخاصة بمؤسستك لإرسال واستقبال الرسائل مع العملاء مباشرة من نظام CRM.
          يمكنك إضافة عدة قنوات واتساب مختلفة وإدارتها بشكل مستقل تماماً. كل قناة لها جلسة منفصلة وبيانات مستقلة.
        </p>
      </div>

      {/* Create Channel Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FaWhatsapp className="w-5 h-5 text-emerald-600" />
                إضافة قناة واتساب
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">اسم القناة</label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="مثال: واتساب المبيعات"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-slate-800 text-sm transition-all outline-none"
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleCreateChannel}
                  disabled={!newChannelName.trim() || actionLoading === 'create'}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {actionLoading === 'create' ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <FiPlus className="w-4 h-4" />
                  )}
                  إنشاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connect Channel Modal */}
      {connectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => { setConnectModal(null); setConnectMethod(null); setQrCode(null); setPairCode(null); setConnectingStatus(''); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FaWhatsapp className="w-5 h-5 text-emerald-600" />
                ربط {connectModal.channelName}
              </h3>
              <button 
                onClick={() => { setConnectModal(null); setConnectMethod(null); setQrCode(null); setPairCode(null); setConnectingStatus(''); }}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {!connectMethod ? (
              /* اختيار طريقة الاتصال */
              <div className="space-y-3">
                <p className="text-sm text-slate-600 mb-4">اختر طريقة ربط حساب واتساب:</p>
                
                <button
                  onClick={() => {
                    setConnectMethod('qr');
                    handleConnectQR(connectModal.channelId);
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-right"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <FiSmartphone className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">مسح رمز QR</p>
                    <p className="text-sm text-slate-500">امسح رمز QR من تطبيق واتساب على هاتفك</p>
                  </div>
                </button>

                <button
                  onClick={() => setConnectMethod('pair')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-right"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <FiHash className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">كود الإقران</p>
                    <p className="text-sm text-slate-500">أدخل رقم هاتفك واحصل على كود لإدخاله في واتساب</p>
                  </div>
                </button>
              </div>
            ) : connectMethod === 'qr' ? (
              /* اتصال عبر QR Code */
              <div className="space-y-4 text-center">
                {qrCode ? (
                  <>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 inline-block mx-auto">
                      <img src={qrCode} alt="QR Code" className="w-64 h-64 mx-auto" />
                    </div>
                    <p className="text-sm text-slate-600">{connectingStatus}</p>
                    <div className="text-xs text-slate-400 space-y-1">
                      <p>1. افتح واتساب على هاتفك</p>
                      <p>2. اذهب إلى الإعدادات &gt; الأجهزة المرتبطة</p>
                      <p>3. اضغط على &quot;ربط جهاز&quot; ثم امسح الرمز</p>
                    </div>
                    <button
                      onClick={() => handleRegenerateQR(connectModal.channelId)}
                      disabled={!!actionLoading}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                    >
                      <FiRefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
                      إعادة التوليد
                    </button>
                  </>
                ) : (
                  <div className="py-8">
                    <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-sm text-slate-600">{connectingStatus || 'جاري التحضير...'}</p>
                  </div>
                )}

                <button
                  onClick={() => { setConnectMethod(null); setQrCode(null); setConnectingStatus(''); }}
                  className="text-sm text-slate-500 hover:text-slate-700 underline"
                >
                  رجوع لاختيار الطريقة
                </button>
              </div>
            ) : (
              /* اتصال عبر Pair Code */
              <div className="space-y-4">
                {!pairCode ? (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">رقم الهاتف (مع كود الدولة)</label>
                      <input
                        type="text"
                        value={pairPhoneNumber}
                        onChange={(e) => setPairPhoneNumber(e.target.value)}
                        placeholder="مثال: 201012345678"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-slate-800 text-sm transition-all outline-none"
                        dir="ltr"
                        autoFocus
                      />
                      <p className="text-xs text-slate-400 mt-1">أدخل رقم الهاتف المراد ربطه مع كود الدولة (بدون +)</p>
                    </div>
                    
                    <button
                      onClick={() => handleConnectPair(connectModal.channelId)}
                      disabled={!pairPhoneNumber.trim() || !!actionLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <FiHash className="w-4 h-4" />
                      )}
                      الحصول على كود الإقران
                    </button>
                    
                    {connectingStatus && (
                      <p className="text-sm text-slate-600 text-center">{connectingStatus}</p>
                    )}
                  </>
                ) : (
                  <div className="text-center space-y-4">
                    <p className="text-sm text-slate-600">كود الإقران الخاص بك:</p>
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                      <p className="text-4xl font-mono font-bold text-slate-800 tracking-[0.3em]" dir="ltr">
                        {pairCode}
                      </p>
                    </div>
                    <p className="text-sm text-slate-600">{connectingStatus}</p>
                    <div className="text-xs text-slate-400 space-y-1">
                      <p>1. افتح واتساب على هاتفك</p>
                      <p>2. اذهب إلى الإعدادات &gt; الأجهزة المرتبطة</p>
                      <p>3. اضغط على &quot;ربط جهاز&quot; ثم اختر &quot;الربط بالرقم&quot;</p>
                      <p>4. أدخل الكود أعلاه</p>
                    </div>
                    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs text-slate-400">في انتظار إتمام الربط...</p>
                  </div>
                )}

                <button
                  onClick={() => { setConnectMethod(null); setPairCode(null); setPairPhoneNumber(''); setConnectingStatus(''); }}
                  className="text-sm text-slate-500 hover:text-slate-700 underline w-full text-center"
                >
                  رجوع لاختيار الطريقة
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
