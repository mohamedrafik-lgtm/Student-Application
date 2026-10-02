'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Database, Trash2, RotateCcw, Plus, Settings,
  CheckCircle2, XCircle, Clock, Loader2, Upload, AlertTriangle,
  HardDrive, Calendar, RefreshCw, Shield
} from 'lucide-react';
import { fetchAPI } from '@/lib/api';
import { toast } from 'sonner';
import ProtectedPage from '@/components/permissions/ProtectedPage';

interface BackupLog {
  id: number;
  filename: string;
  size: number;
  sizeFormatted: string;
  status: string;
  type: string;
  createdBy: string;
  user: { id: string; name: string; email: string };
  notes: string | null;
  error: string | null;
  fileExists: boolean;
  elapsedSeconds: number | null;
  createdAt: string;
}

interface BackupSettings {
  id: number;
  autoBackup: boolean;
  frequency: string;
  maxBackups: number;
  lastBackupAt: string | null;
  nextBackupAt: string | null;
}

export default function BackupPage() {
  const [backups, setBackups] = useState<BackupLog[]>([]);
  const [settings, setSettings] = useState<BackupSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [showUploadRestore, setShowUploadRestore] = useState(false);
  const [uploadingRestore, setUploadingRestore] = useState(false);
  const [restoreOverlay, setRestoreOverlay] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [restoreError, setRestoreError] = useState('');

  const [tempSettings, setTempSettings] = useState({
    autoBackup: false,
    frequency: 'daily',
    maxBackups: 7,
  });

  const fetchBackups = useCallback(async () => {
    try {
      const res = await fetchAPI('/backup');
      if (res.success) {
        setBackups(res.data);
      }
    } catch (error) {
      console.error('Error fetching backups:', error);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetchAPI('/backup/settings');
      if (res.success) {
        setSettings(res.data);
        setTempSettings({
          autoBackup: res.data.autoBackup,
          frequency: res.data.frequency,
          maxBackups: res.data.maxBackups,
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchBackups(), fetchSettings()]);
      setLoading(false);
    };
    loadData();
  }, [fetchBackups, fetchSettings]);

  // تحديث تلقائي كل 5 ثوانٍ إذا كان هناك نسخ قيد الإنشاء
  useEffect(() => {
    const hasInProgress = backups.some(b => b.status === 'in_progress');
    if (!hasInProgress) return;
    const interval = setInterval(() => {
      fetchBackups();
    }, 5000);
    return () => clearInterval(interval);
  }, [backups, fetchBackups]);

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      const res = await fetchAPI('/backup', {
        method: 'POST',
        body: JSON.stringify({ type: 'full' }),
      });
      if (res.success) {
        toast.success('تم إنشاء النسخة الاحتياطية بنجاح');
        await fetchBackups();
        await fetchSettings();
      }
    } catch (error: any) {
      toast.error(error.message || 'فشل إنشاء النسخة الاحتياطية');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (backupId: number) => {
    setShowDeleteConfirm(null);
    try {
      const res = await fetchAPI(`/backup/${backupId}`, { method: 'DELETE' });
      if (res.success) {
        toast.success('تم حذف النسخة الاحتياطية');
        await fetchBackups();
      }
    } catch (error: any) {
      toast.error(error.message || 'فشل الحذف');
    }
  };

  const handleRestore = async (backupId: number) => {
    setRestoring(backupId);
    setShowRestoreConfirm(null);
    setRestoreOverlay('loading');
    setRestoreError('');
    try {
      const res = await fetchAPI(`/backup/${backupId}/restore`, { method: 'POST' });
      if (res.success) {
        setRestoreOverlay('success');
        fetchBackups();
        fetchSettings();
      }
    } catch (error: any) {
      setRestoreOverlay('error');
      setRestoreError(error.message || 'فشل الاستعادة');
    } finally {
      setRestoring(null);
    }
  };

  const handleUploadRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.sql')) {
      toast.error('يجب أن يكون الملف بامتداد .sql');
      return;
    }
    if (!confirm('⚠️ تحذير: استعادة نسخة احتياطية ستستبدل جميع البيانات الحالية. هل أنت متأكد؟')) return;

    setUploadingRestore(true);
    setRestoreOverlay('loading');
    setRestoreError('');
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${API_URL}/backup/restore/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const result = await response.json();
      if (result.success) {
        setRestoreOverlay('success');
        fetchBackups();
        fetchSettings();
      } else {
        setRestoreOverlay('error');
        setRestoreError(result.message || 'فشل الاستعادة');
      }
    } catch (error: any) {
      setRestoreOverlay('error');
      setRestoreError(error.message || 'فشل الاستعادة');
    } finally {
      setUploadingRestore(false);
      setShowUploadRestore(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetchAPI('/backup/settings', {
        method: 'POST',
        body: JSON.stringify(tempSettings),
      });
      if (res.success) {
        toast.success('تم حفظ إعدادات النسخ الاحتياطي');
        await fetchSettings();
        setShowSettings(false);
      }
    } catch (error: any) {
      toast.error(error.message || 'فشل حفظ الإعدادات');
    } finally {
      setSavingSettings(false);
    }
  };

  const formatElapsed = (seconds: number) => {
    if (seconds < 60) return `${seconds} ثانية`;
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    if (min < 60) return `${min}د ${sec}ث`;
    const hr = Math.floor(min / 60);
    return `${hr}س ${min % 60}د`;
  };

  const getStatusBadge = (status: string, elapsedSeconds?: number | null) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-700 border border-green-200 hover:bg-green-100">
            <CheckCircle2 className="w-3 h-3 ml-1" />
            مكتمل
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-100 text-red-700 border border-red-200 hover:bg-red-100">
            <XCircle className="w-3 h-3 ml-1" />
            فشل
          </Badge>
        );
      case 'in_progress':
        return (
          <div className="flex items-center gap-1.5">
            <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-200 hover:bg-yellow-100">
              <Loader2 className="w-3 h-3 ml-1 animate-spin" />
              جاري الإنشاء
            </Badge>
            {elapsedSeconds != null && (
              <span className="text-xs text-yellow-600 font-medium bg-yellow-50 px-1.5 py-0.5 rounded">
                ⏱ {formatElapsed(elapsedSeconds)}
              </span>
            )}
          </div>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'full':
        return <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">كاملة</Badge>;
      case 'schema_only':
        return <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-700">هيكل فقط</Badge>;
      case 'data_only':
        return <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">بيانات فقط</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getFrequencyLabel = (freq: string) => {
    switch (freq) {
      case 'daily': return 'يومي';
      case 'weekly': return 'أسبوعي';
      case 'monthly': return 'شهري';
      default: return freq;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <ProtectedPage requiredPermission={{ resource: 'dashboard.backup', action: 'view' }}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">جاري تحميل النسخ الاحتياطية...</p>
          </div>
        </div>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage requiredPermission={{ resource: 'dashboard.backup', action: 'view' }}>
      <div className="space-y-6 p-4 md:p-6" dir="rtl">
        {/* Header */}
        <div className="bg-gradient-to-l from-primary/10 via-primary/5 to-transparent rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Database className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">النسخ الاحتياطي</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  إدارة النسخ الاحتياطية لقاعدة البيانات واستعادتها
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                variant="outline"
                onClick={() => setShowSettings(!showSettings)}
                className={`px-5 py-2.5 ${showSettings ? 'bg-primary/10 border-primary/30 text-primary' : 'hover:bg-gray-50'}`}
              >
                <Settings className="w-4 h-4 ml-2" />
                الإعدادات
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowUploadRestore(!showUploadRestore)}
                className={`px-5 py-2.5 ${showUploadRestore ? 'bg-orange-50 border-orange-300 text-orange-700' : 'hover:bg-gray-50'}`}
              >
                <Upload className="w-4 h-4 ml-2" />
                استعادة من ملف
              </Button>
              <Button
                onClick={handleCreateBackup}
                disabled={creating}
                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 ml-1.5 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 ml-1.5" />
                )}
                {creating ? 'جاري الإنشاء...' : 'نسخة احتياطية جديدة'}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Card className="border-0 shadow-sm bg-gradient-to-bl from-blue-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Database className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{backups.length}</p>
              <p className="text-xs text-muted-foreground mt-1">إجمالي النسخ</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-bl from-green-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {backups.filter(b => b.status === 'completed').length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">نسخ مكتملة</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-bl from-purple-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <HardDrive className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatSize(backups.filter(b => b.status === 'completed').reduce((sum, b) => sum + b.size, 0))}
              </p>
              <p className="text-xs text-muted-foreground mt-1">الحجم الإجمالي</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-bl from-amber-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {settings?.lastBackupAt ? formatDate(settings.lastBackupAt) : 'لا يوجد'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">آخر نسخة</p>
            </CardContent>
          </Card>
        </div>

        {/* Upload Restore Panel */}
        {showUploadRestore && (
          <Card className="border-orange-200 bg-gradient-to-l from-orange-50/80 to-white overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-800">استعادة من ملف خارجي</h3>
                  <p className="text-sm text-orange-600 mt-1">
                    تحذير: استعادة نسخة احتياطية ستستبدل جميع البيانات الحالية في قاعدة البيانات
                  </p>
                  <div className="flex items-center gap-3 mt-3">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".sql"
                        className="hidden"
                        onChange={handleUploadRestore}
                        disabled={uploadingRestore}
                      />
                      <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-100 border border-orange-200 rounded-lg hover:bg-orange-200 transition-colors text-orange-800">
                        {uploadingRestore ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        <span className="text-sm font-medium">
                          {uploadingRestore ? 'جاري الاستعادة...' : 'اختر ملف .sql'}
                        </span>
                      </div>
                    </label>
                    <Button variant="ghost" size="sm" onClick={() => setShowUploadRestore(false)}>
                      إلغاء
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <Card className="border-primary/20 overflow-hidden">
            <div className="h-1 bg-gradient-to-l from-primary to-primary/50" />
            <CardContent className="p-5 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">إعدادات النسخ الاحتياطي التلقائي</h3>
                  <p className="text-sm text-muted-foreground">تكوين النسخ الاحتياطي التلقائي وسياسة الاحتفاظ</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* التفعيل */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <label className="text-sm font-medium text-gray-700">النسخ الاحتياطي التلقائي</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setTempSettings(s => ({ ...s, autoBackup: !s.autoBackup }))}
                      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                        tempSettings.autoBackup ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                      role="switch"
                      aria-checked={tempSettings.autoBackup}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out ${
                          tempSettings.autoBackup ? '-translate-x-5' : '-translate-x-0.5'
                        }`}
                        style={{ marginTop: '1px' }}
                      />
                    </button>
                    <span className={`text-sm font-medium ${tempSettings.autoBackup ? 'text-green-600' : 'text-gray-500'}`}>
                      {tempSettings.autoBackup ? 'مفعّل' : 'معطّل'}
                    </span>
                  </div>
                </div>

                {/* التكرار */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <label className="text-sm font-medium text-gray-700">تكرار النسخ</label>
                  <select
                    value={tempSettings.frequency}
                    onChange={(e) => setTempSettings(s => ({ ...s, frequency: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    disabled={!tempSettings.autoBackup}
                  >
                    <option value="daily">يومي</option>
                    <option value="weekly">أسبوعي</option>
                    <option value="monthly">شهري</option>
                  </select>
                </div>

                {/* الحد الأقصى */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <label className="text-sm font-medium text-gray-700">الحد الأقصى للنسخ</label>
                  <select
                    value={tempSettings.maxBackups}
                    onChange={(e) => setTempSettings(s => ({ ...s, maxBackups: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  >
                    {[3, 5, 7, 10, 14, 30].map(n => (
                      <option key={n} value={n}>{n} نسخ</option>
                    ))}
                  </select>
                </div>
              </div>

              {settings && (
                <div className="flex items-center gap-4 text-sm text-muted-foreground bg-gray-50 rounded-xl p-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>آخر نسخة: {formatDate(settings.lastBackupAt)}</span>
                  </div>
                  {settings.autoBackup && settings.nextBackupAt && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>النسخة القادمة: {formatDate(settings.nextBackupAt)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <Button onClick={handleSaveSettings} disabled={savingSettings} className="bg-green-600 hover:bg-green-700 text-white px-6">
                  {savingSettings ? (
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 ml-2" />
                  )}
                  {savingSettings ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                </Button>
                <Button variant="outline" onClick={() => setShowSettings(false)} className="px-6">
                  إلغاء
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Backup List */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">سجل النسخ الاحتياطية</CardTitle>
                <CardDescription className="mt-1">
                  {settings?.autoBackup
                    ? `النسخ التلقائي مفعّل (${getFrequencyLabel(settings.frequency)}) • الحد الأقصى: ${settings.maxBackups} نسخ`
                    : 'النسخ التلقائي معطّل'}
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={fetchBackups} className="h-8 w-8">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {backups.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <Database className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-base font-medium text-gray-500">لا توجد نسخ احتياطية</p>
                <p className="text-sm text-gray-400 mt-1">قم بإنشاء أول نسخة احتياطية لقاعدة البيانات</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {backups.map((backup) => (
                  <div
                    key={backup.id}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 hover:bg-gray-50/50 transition-colors gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        backup.status === 'completed' ? 'bg-green-100' :
                        backup.status === 'failed' ? 'bg-red-100' : 'bg-yellow-100'
                      }`}>
                        <Database className={`w-5 h-5 ${
                          backup.status === 'completed' ? 'text-green-600' :
                          backup.status === 'failed' ? 'text-red-600' : 'text-yellow-600'
                        }`} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{backup.filename}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {getStatusBadge(backup.status, backup.elapsedSeconds)}
                          {getTypeBadge(backup.type)}
                          {backup.status === 'completed' && (
                            <span className="text-xs text-gray-500">{backup.sizeFormatted}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                          <span>{backup.user?.name || 'نظام'}</span>
                          <span>•</span>
                          <span>{formatDate(backup.createdAt)}</span>
                        </div>
                        {backup.notes && (
                          <p className="text-xs text-gray-500 mt-1.5 bg-gray-50 rounded px-2 py-1 inline-block">
                            📝 {backup.notes}
                          </p>
                        )}
                        {backup.error && (
                          <p className="text-xs text-red-500 mt-1.5 bg-red-50 rounded px-2 py-1 inline-block">
                            ❌ {backup.error}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mr-auto md:mr-0 flex-shrink-0">
                      {backup.status === 'completed' && backup.fileExists && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs text-orange-600 border-orange-200 hover:bg-orange-50 hover:border-orange-300 gap-1.5"
                          onClick={() => setShowRestoreConfirm(backup.id)}
                          disabled={restoring === backup.id}
                        >
                          {restoring === backup.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3.5 h-3.5" />
                          )}
                          {restoring === backup.id ? 'جاري...' : 'استعادة'}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs text-red-500 border-red-200 hover:bg-red-50 hover:border-red-300 gap-1.5"
                        onClick={() => setShowDeleteConfirm(backup.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        حذف
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Note */}
        <Card className="border-blue-100 bg-gradient-to-l from-blue-50/50 to-white overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-sm">
                <p className="font-semibold text-blue-900">ملاحظات أمنية</p>
                <ul className="mt-2 space-y-1.5 text-blue-700">
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                    يتم تخزين النسخ الاحتياطية محلياً على الخادم
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                    استعادة نسخة احتياطية ستستبدل جميع البيانات الحالية
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                    يُنصح بتحميل نسخة احتياطية قبل إجراء أي استعادة
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                    الحد الأقصى للنسخ المحفوظة: {settings?.maxBackups || 7} نسخ (يتم حذف الأقدم تلقائياً)
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Confirmation Modal */}
        {(showDeleteConfirm !== null || showRestoreConfirm !== null) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => {
                setShowDeleteConfirm(null);
                setShowRestoreConfirm(null);
              }}
            />
            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-in fade-in zoom-in-95 duration-200" dir="rtl">
              {showDeleteConfirm !== null && (() => {
                const backup = backups.find(b => b.id === showDeleteConfirm);
                return (
                  <>
                    <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-100 mx-auto mb-4">
                      <Trash2 className="w-7 h-7 text-red-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 text-center">تأكيد حذف النسخة الاحتياطية</h3>
                    <p className="text-sm text-gray-500 text-center mt-2">
                      هل أنت متأكد من حذف هذه النسخة الاحتياطية؟ لا يمكن التراجع عن هذا الإجراء.
                    </p>
                    {backup && (
                      <div className="bg-red-50 border border-red-100 rounded-xl p-3 mt-4">
                        <p className="text-xs font-medium text-red-800 truncate">{backup.filename}</p>
                        <p className="text-xs text-red-600 mt-1">
                          الحجم: {backup.sizeFormatted} • {formatDate(backup.createdAt)}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-6">
                      <Button
                        variant="destructive"
                        className="flex-1 gap-2"
                        onClick={() => handleDelete(showDeleteConfirm)}
                      >
                        <Trash2 className="w-4 h-4" />
                        نعم، احذف النسخة
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setShowDeleteConfirm(null)}
                      >
                        إلغاء
                      </Button>
                    </div>
                  </>
                );
              })()}
              {showRestoreConfirm !== null && (() => {
                const backup = backups.find(b => b.id === showRestoreConfirm);
                return (
                  <>
                    <div className="flex items-center justify-center w-14 h-14 rounded-full bg-orange-100 mx-auto mb-4">
                      <AlertTriangle className="w-7 h-7 text-orange-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 text-center">تأكيد استعادة النسخة الاحتياطية</h3>
                    <p className="text-sm text-gray-500 text-center mt-2">
                      ⚠️ تحذير: استعادة هذه النسخة ستستبدل <span className="font-bold text-red-600">جميع البيانات الحالية</span> في قاعدة البيانات.
                    </p>
                    {backup && (
                      <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 mt-4">
                        <p className="text-xs font-medium text-orange-800 truncate">{backup.filename}</p>
                        <p className="text-xs text-orange-600 mt-1">
                          الحجم: {backup.sizeFormatted} • {formatDate(backup.createdAt)}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-6">
                      <Button
                        className="flex-1 gap-2 bg-orange-600 hover:bg-orange-700 text-white"
                        onClick={() => handleRestore(showRestoreConfirm)}
                        disabled={restoring === showRestoreConfirm}
                      >
                        {restoring === showRestoreConfirm ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RotateCcw className="w-4 h-4" />
                        )}
                        {restoring === showRestoreConfirm ? 'جاري الاستعادة...' : 'نعم، استعد النسخة'}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setShowRestoreConfirm(null)}
                      >
                        إلغاء
                      </Button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Fullscreen Restore Overlay */}
        {restoreOverlay !== 'idle' && createPortal(
          <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 99999, background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }} dir="rtl">
            {/* Decorative background */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
              <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
            </div>

            <div className="relative text-center px-6">
              {restoreOverlay === 'loading' && (
                <div>
                  <div className="relative mx-auto mb-10 w-36 h-36">
                    {/* Outer ring */}
                    <div className="absolute inset-0 rounded-full border-[3px] border-slate-700" />
                    {/* Spinning ring */}
                    <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-emerald-400 border-r-emerald-400/50 animate-spin" />
                    {/* Inner glow */}
                    <div className="absolute inset-4 rounded-full bg-slate-800/80 flex items-center justify-center">
                      <Database className="w-12 h-12 text-emerald-400 animate-pulse" />
                    </div>
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-4">جاري استعادة قاعدة البيانات</h2>
                  <p className="text-lg text-slate-300 mb-2">يرجى الانتظار وعدم إغلاق الصفحة...</p>
                  <p className="text-sm text-slate-500">هذه العملية قد تستغرق بضع دقائق حسب حجم النسخة</p>
                  <div className="mt-10 flex items-center justify-center gap-3">
                    <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:200ms]" />
                    <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:400ms]" />
                  </div>
                </div>
              )}

              {restoreOverlay === 'success' && (
                <div>
                  <div className="mx-auto mb-10 w-36 h-36 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center">
                    <CheckCircle2 className="w-20 h-20 text-emerald-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-4">تمت الاستعادة بنجاح!</h2>
                  <p className="text-lg text-emerald-300 mb-8">تم استعادة قاعدة البيانات من النسخة الاحتياطية بنجاح</p>
                  <Button
                    onClick={() => setRestoreOverlay('idle')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-3 text-base rounded-xl"
                  >
                    <CheckCircle2 className="w-5 h-5 ml-2" />
                    حسناً
                  </Button>
                </div>
              )}

              {restoreOverlay === 'error' && (
                <div>
                  <div className="mx-auto mb-10 w-36 h-36 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center">
                    <XCircle className="w-20 h-20 text-red-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-4">فشلت عملية الاستعادة</h2>
                  <p className="text-lg text-red-300 mb-8">{restoreError}</p>
                  <Button
                    onClick={() => setRestoreOverlay('idle')}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-10 py-3 text-base rounded-xl border border-slate-600"
                  >
                    إغلاق
                  </Button>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
      </div>
    </ProtectedPage>
  );
}
