'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { fetchAPI } from '@/lib/api';
import PageHeader from '@/app/components/PageHeader';
import PageGuard from '@/components/permissions/PageGuard';
import { Button } from '@/app/components/ui/Button';
import { ConfirmDialog } from '@/app/components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import {
  ClockIcon, MapPinIcon, ShieldCheckIcon, GlobeAltIcon,
  PlusIcon, TrashIcon, PencilSquareIcon, CheckIcon, XMarkIcon,
  InformationCircleIcon, MapIcon, MagnifyingGlassIcon, EyeIcon,
  CursorArrowRaysIcon, UserGroupIcon, UsersIcon,
} from '@heroicons/react/24/outline';

const TIMEZONE_OPTIONS = [
  { value: 'Africa/Cairo', label: 'مصر (القاهرة) UTC+2' },
  { value: 'Asia/Riyadh', label: 'السعودية (الرياض) UTC+3' },
  { value: 'Asia/Dubai', label: 'الإمارات (دبي) UTC+4' },
  { value: 'Asia/Kuwait', label: 'الكويت UTC+3' },
  { value: 'Asia/Bahrain', label: 'البحرين UTC+3' },
  { value: 'Asia/Qatar', label: 'قطر UTC+3' },
  { value: 'Asia/Muscat', label: 'عمان (مسقط) UTC+4' },
  { value: 'Asia/Amman', label: 'الأردن (عمّان) UTC+3' },
  { value: 'Asia/Baghdad', label: 'العراق (بغداد) UTC+3' },
  { value: 'Africa/Tripoli', label: 'ليبيا (طرابلس) UTC+2' },
  { value: 'Africa/Tunis', label: 'تونس UTC+1' },
  { value: 'Africa/Casablanca', label: 'المغرب UTC+1' },
  { value: 'Asia/Beirut', label: 'لبنان (بيروت) UTC+2' },
];

const ZONE_COLORS = [
  '#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#EC4899', '#14B8A6',
];

interface ZoneEnrollmentUser {
  enrollment: { id: string; allowGlobalZones: boolean; user: { id: string; name: string; photoUrl?: string | null } };
}

interface Zone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  color: string;
  isActive: boolean;
  isGlobal: boolean;
  enrollments?: ZoneEnrollmentUser[];
}

interface EnrolledEmployee {
  id: string;
  userId: string;
  allowGlobalZones: boolean;
  user: { id: string; name: string; photoUrl?: string | null };
}

const DAY_OPTIONS = [
  { value: 0, label: 'الأحد' },
  { value: 1, label: 'الإثنين' },
  { value: 2, label: 'الثلاثاء' },
  { value: 3, label: 'الأربعاء' },
  { value: 4, label: 'الخميس' },
  { value: 5, label: 'الجمعة' },
  { value: 6, label: 'السبت' },
];

// ===== Interactive Map Component (dynamic, no SSR) =====

interface PreviewZone {
  latitude: number;
  longitude: number;
  radius: number;
  color: string;
}

// Helper: format radius in km/m
function formatRadius(meters: number): string {
  if (meters >= 1000) {
    const km = meters / 1000;
    return km % 1 === 0 ? `${km} كم` : `${km.toFixed(1)} كم`;
  }
  return `${meters} متر`;
}

interface MapProps {
  zones: Zone[];
  onMapClick: (lat: number, lng: number) => void;
  center: [number, number];
  previewZone?: PreviewZone | null;
  onRadiusChange?: (radius: number) => void;
  flyToTarget?: [number, number] | null;
}

// Search control inside the map
function SearchControl({ onSelect }: { onSelect: (lat: number, lng: number, name: string) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);

  const doSearch = async () => {
    if (!query.trim()) return;
    try {
      setSearching(true);
      setOpen(true);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=ar`,
        { headers: { 'User-Agent': 'TibaERP/1.0' } }
      );
      const data = await res.json();
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div
      className="absolute top-3 left-3 right-3 z-[1000]"
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
    >
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } }}
            placeholder="ابحث عن مدينة أو مكان..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-tiba-gray-200 rounded-xl shadow-lg focus:ring-2 focus:ring-tiba-primary-500/30 focus:border-tiba-primary-500 outline-none placeholder:text-tiba-gray-400"
          />
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tiba-gray-400" />
        </div>
        <button
          onClick={doSearch}
          disabled={searching}
          className="px-4 py-2.5 text-sm font-medium text-white bg-tiba-primary-600 hover:bg-tiba-primary-700 rounded-xl shadow-lg transition-colors disabled:opacity-60"
        >
          {searching ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
          ) : (
            'بحث'
          )}
        </button>
      </div>
      {open && results.length > 0 && (
        <div className="mt-1.5 bg-white rounded-xl shadow-xl border border-tiba-gray-200 overflow-hidden max-h-52 overflow-y-auto">
          {results.map((r: any, i: number) => (
            <button
              key={i}
              onClick={() => {
                onSelect(parseFloat(r.lat), parseFloat(r.lon), r.display_name);
                setOpen(false);
                setQuery(r.display_name?.split(',')[0] || '');
              }}
              className="w-full text-right px-4 py-2.5 text-sm hover:bg-tiba-primary-50 transition-colors border-b border-tiba-gray-100 last:border-0 flex items-start gap-2"
            >
              <MapPinIcon className="w-4 h-4 text-tiba-primary-500 flex-shrink-0 mt-0.5" />
              <span className="text-tiba-gray-700 line-clamp-2">{r.display_name}</span>
            </button>
          ))}
        </div>
      )}
      {open && results.length === 0 && !searching && query.trim() && (
        <div className="mt-1.5 bg-white rounded-xl shadow-xl border border-tiba-gray-200 p-4 text-center text-sm text-tiba-gray-400">
          لا توجد نتائج
        </div>
      )}
    </div>
  );
}

// Interactive Radius Slider Control overlaid on the map
function RadiusControl({ radius, color, onChange }: { radius: number; color: string; onChange: (r: number) => void }) {
  const PRESETS = [
    { label: '100م', value: 100 },
    { label: '0.2 كم', value: 200 },
    { label: '0.5 كم', value: 500 },
    { label: '1 كم', value: 1000 },
    { label: '2 كم', value: 2000 },
    { label: '3 كم', value: 3000 },
  ];

  // Map slider value (0-100) to radius (50-5000) using exponential scale
  const radiusToSlider = (r: number) => {
    const minR = Math.log(50);
    const maxR = Math.log(5000);
    return ((Math.log(Math.max(50, Math.min(5000, r))) - minR) / (maxR - minR)) * 100;
  };
  const sliderToRadius = (s: number) => {
    const minR = Math.log(50);
    const maxR = Math.log(5000);
    return Math.round(Math.exp(minR + (s / 100) * (maxR - minR)));
  };

  const sliderVal = radiusToSlider(radius);
  // Generate gradient for the track fill
  const trackStyle = {
    background: `linear-gradient(to right, ${color} 0%, ${color} ${sliderVal}%, #e2e8f0 ${sliderVal}%, #e2e8f0 100%)`,
  };

  return (
    <div
      className="absolute bottom-3 left-3 right-3 z-[1000]"
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
    >
      <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-tiba-gray-200 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs font-semibold text-tiba-gray-700">نصف القطر</span>
          </div>
          <div className="flex items-center gap-1.5 bg-tiba-gray-50 rounded-lg px-2.5 py-1 border border-tiba-gray-200">
            <input
              type="number"
              value={radius}
              onChange={e => onChange(Math.max(50, Math.min(3000, Number(e.target.value))))}
              min={50}
              max={3000}
              className="w-14 text-center text-sm font-bold text-tiba-gray-900 bg-transparent outline-none tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-[10px] text-tiba-gray-400 font-medium">متر</span>
          </div>
        </div>
        {/* Range Slider */}
        <div className="relative px-0.5">
          <style>{`
            .tiba-radius-slider::-webkit-slider-thumb { border-color: ${color} !important; }
            .tiba-radius-slider::-moz-range-thumb { border-color: ${color} !important; }
          `}</style>
          <input
            type="range"
            min={0}
            max={100}
            step={0.5}
            value={sliderVal}
            onChange={e => onChange(sliderToRadius(Number(e.target.value)))}
            style={trackStyle}
            className="tiba-radius-slider w-full h-2 rounded-full appearance-none cursor-pointer outline-none
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2
              [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing
              [&::-webkit-slider-thumb]:transition-shadow [&::-webkit-slider-thumb]:hover:shadow-lg
              [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:shadow-md
              [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:active:cursor-grabbing
              [&::-moz-range-track]:bg-transparent"
          />
        </div>
        {/* Presets */}
        <div className="flex items-center gap-1.5 mt-2">
          {PRESETS.map(p => (
            <button
              key={p.value}
              onClick={() => onChange(p.value)}
              className={`flex-1 py-1 text-[10px] font-semibold rounded-lg transition-all ${
                radius === p.value
                  ? 'text-white shadow-sm'
                  : 'bg-tiba-gray-50 text-tiba-gray-500 hover:bg-tiba-gray-100 border border-tiba-gray-200'
              }`}
              style={radius === p.value ? { backgroundColor: color } : {}}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// MapController: handles flyTo on search, click events, and external flyTo
function MapController({ onMapClick, flyTo, externalFlyTo }: { onMapClick: (lat: number, lng: number) => void; flyTo: [number, number] | null; externalFlyTo?: [number, number] | null }) {
  const { useMapEvents, useMap } = require('react-leaflet');
  const map = useMap();

  useEffect(() => {
    if (flyTo) {
      map.flyTo(flyTo, 16, { duration: 1.5 });
    }
  }, [flyTo, map]);

  useEffect(() => {
    if (externalFlyTo) {
      map.flyTo(externalFlyTo, 16, { duration: 1.5 });
    }
  }, [externalFlyTo, map]);

  useMapEvents({
    click(e: any) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
}

// Custom Zoom Control component positioned bottom-right (avoids overlap with search)
function CustomZoomControl() {
  const { useMap } = require('react-leaflet');
  const map = useMap();
  return (
    <div
      className="absolute bottom-3 right-3 z-[1000] flex flex-col gap-1"
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
    >
      <button
        onClick={() => map.zoomIn()}
        className="w-9 h-9 bg-white rounded-lg shadow-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-tiba-primary-600 transition-colors text-lg font-bold"
        title="تكبير"
      >
        +
      </button>
      <button
        onClick={() => map.zoomOut()}
        className="w-9 h-9 bg-white rounded-lg shadow-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-tiba-primary-600 transition-colors text-lg font-bold"
        title="تصغير"
      >
        −
      </button>
    </div>
  );
}

function MapInner({ zones, onMapClick, center, previewZone, onRadiusChange, flyToTarget }: MapProps) {
  const { MapContainer, TileLayer, Circle, Popup, Marker } = require('react-leaflet');
  const L = require('leaflet');
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);

  // Fix Leaflet default marker icons
  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });
  }, [L]);

  const [locatingMe, setLocatingMe] = useState(false);

  const handleSearchSelect = (lat: number, lng: number, _name: string) => {
    setFlyTo([lat, lng]);
  };

  const handleGoToMyLocation = () => {
    if (!navigator.geolocation) {
      alert('الموقع الجغرافي غير مدعوم في هذا المتصفح');
      return;
    }
    setLocatingMe(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFlyTo([pos.coords.latitude, pos.coords.longitude]);
        setLocatingMe(false);
      },
      () => {
        alert('تعذر الوصول إلى موقعك الحالي. تأكد من تفعيل خدمات الموقع.');
        setLocatingMe(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="relative h-full w-full">
      <SearchControl onSelect={handleSearchSelect} />
      {/* Go to my location button */}
      <div
        className="absolute top-[60px] left-3 z-[1000]"
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
      >
        <button
          onClick={handleGoToMyLocation}
          disabled={locatingMe}
          className="w-10 h-10 bg-white rounded-xl shadow-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-tiba-primary-50 hover:text-tiba-primary-600 hover:border-tiba-primary-300 transition-all disabled:opacity-60"
          title="الذهاب لموقعي الحالي"
        >
          {locatingMe ? (
            <span className="w-5 h-5 border-2 border-tiba-primary-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
              <circle cx="12" cy="12" r="8" strokeDasharray="2 2" />
            </svg>
          )}
        </button>
      </div>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%', borderRadius: '0.75rem' }}
        scrollWheelZoom
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController onMapClick={onMapClick} flyTo={flyTo} externalFlyTo={flyToTarget} />
        <CustomZoomControl />
        {/* Existing saved zones */}
        {zones.filter(z => z.isActive).map(zone => (
          <Circle
            key={zone.id}
            center={[zone.latitude, zone.longitude]}
            radius={zone.radius}
            pathOptions={{
              color: zone.color,
              fillColor: zone.color,
              fillOpacity: 0.2,
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-center">
                <strong>{zone.name}</strong>
                <br />
                <span className="text-xs text-slate-500">نصف القطر: {formatRadius(zone.radius)}</span>
              </div>
            </Popup>
          </Circle>
        ))}
        {/* Preview zone - shows immediately on click */}
        {previewZone && previewZone.latitude !== 0 && (
          <>
            <Circle
              center={[previewZone.latitude, previewZone.longitude]}
              radius={previewZone.radius}
              pathOptions={{
                color: previewZone.color,
                fillColor: previewZone.color,
                fillOpacity: 0.15,
                weight: 2,
                dashArray: '8 4',
              }}
            />
            <Marker position={[previewZone.latitude, previewZone.longitude]} />
          </>
        )}
      </MapContainer>
      {/* Radius slider control - shown when there's a preview zone */}
      {previewZone && previewZone.latitude !== 0 && onRadiusChange && (
        <RadiusControl
          radius={previewZone.radius}
          color={previewZone.color}
          onChange={onRadiusChange}
        />
      )}
    </div>
  );
}

const DynamicMap = dynamic(
  () => Promise.resolve(MapInner),
  { ssr: false, loading: () => <div className="h-full flex items-center justify-center bg-slate-50 rounded-xl"><span className="text-sm text-tiba-gray-400">جاري تحميل الخريطة...</span></div> }
);

// ===== Settings Page =====

function SettingsPageContent() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [form, setForm] = useState({
    workStartTime: '08:00',
    workEndTime: '16:00',
    lateThresholdMinutes: 15,
    earlyLeaveThreshold: 15,
    requireLocation: false,
    requireCheckInLocation: false,
    requireCheckOutLocation: false,
    weeklyOffDays: [5, 6] as number[],
    timezone: 'Africa/Cairo',
  });

  // Zone creation modal
  const [addingZone, setAddingZone] = useState(false);
  const [newZone, setNewZone] = useState({ name: '', latitude: 0, longitude: 0, radius: 200, color: ZONE_COLORS[0], isGlobal: true, employeeIds: [] as string[] });
  const [editingZone, setEditingZone] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', radius: 200, isGlobal: true, employeeIds: [] as string[] });
  const [zoneSaving, setZoneSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [flyToZone, setFlyToZone] = useState<[number, number] | null>(null);

  // Enrolled employees for zone assignment
  const [enrolledEmployees, setEnrolledEmployees] = useState<EnrolledEmployee[]>([]);
  const [empSearch, setEmpSearch] = useState('');

  // Leaflet CSS
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const id = 'leaflet-css';
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchAPI('/staff-attendance/settings');
      if (data) {
        setForm({
          workStartTime: data.workStartTime || '08:00',
          workEndTime: data.workEndTime || '16:00',
          lateThresholdMinutes: data.lateThresholdMinutes ?? 15,
          earlyLeaveThreshold: data.earlyLeaveThreshold ?? 15,
          requireLocation: data.requireLocation ?? false,
          requireCheckInLocation: data.requireCheckInLocation ?? false,
          requireCheckOutLocation: data.requireCheckOutLocation ?? false,
          weeklyOffDays: data.weeklyOffDays ?? [5, 6],
          timezone: data.timezone || 'Africa/Cairo',
        });
      }
    } catch (err) {
      console.error(err);
      toast.error('خطأ في تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadZones = useCallback(async () => {
    try {
      const data = await fetchAPI('/staff-attendance/zones');
      if (Array.isArray(data)) setZones(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadEnrolledEmployees = useCallback(async () => {
    try {
      const data = await fetchAPI('/staff-attendance/enrollments');
      if (Array.isArray(data)) setEnrolledEmployees(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { loadSettings(); loadZones(); loadEnrolledEmployees(); }, [loadSettings, loadZones, loadEnrolledEmployees]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await fetchAPI('/staff-attendance/settings', {
        method: 'PUT',
        body: JSON.stringify({
          workStartTime: form.workStartTime,
          workEndTime: form.workEndTime,
          lateThresholdMinutes: Number(form.lateThresholdMinutes),
          earlyLeaveThreshold: Number(form.earlyLeaveThreshold),
          requireLocation: form.requireLocation,
          requireCheckInLocation: form.requireCheckInLocation,
          requireCheckOutLocation: form.requireCheckOutLocation,
          weeklyOffDays: form.weeklyOffDays,
          timezone: form.timezone,
        }),
      });
      toast.success('تم حفظ الإعدادات بنجاح');
      loadSettings();
    } catch (err: any) {
      toast.error(err?.message || 'خطأ في حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: number) => {
    setForm(f => ({
      ...f,
      weeklyOffDays: f.weeklyOffDays.includes(day)
        ? f.weeklyOffDays.filter(d => d !== day)
        : [...f.weeklyOffDays, day],
    }));
  };

  // ===== Zone handlers =====

  const handleMapClick = (lat: number, lng: number) => {
    if (!form.requireLocation) return;
    setNewZone(z => ({ ...z, latitude: lat, longitude: lng, color: ZONE_COLORS[zones.length % ZONE_COLORS.length], employeeIds: [] }));
    setAddingZone(true);
    setEmpSearch('');
  };

  const saveNewZone = async () => {
    if (!newZone.name.trim()) { toast.error('أدخل اسم المنطقة'); return; }
    if (!newZone.isGlobal && newZone.employeeIds.length === 0) { toast.error('اختر موظف واحد على الأقل للمنطقة المخصصة'); return; }
    try {
      setZoneSaving(true);
      await fetchAPI('/staff-attendance/zones', {
        method: 'POST',
        body: JSON.stringify({
          name: newZone.name,
          latitude: newZone.latitude,
          longitude: newZone.longitude,
          radius: newZone.radius,
          color: newZone.color,
          isGlobal: newZone.isGlobal,
          employeeIds: newZone.isGlobal ? [] : newZone.employeeIds,
        }),
      });
      toast.success('تمت إضافة المنطقة بنجاح');
      setAddingZone(false);
      setNewZone({ name: '', latitude: 0, longitude: 0, radius: 200, color: ZONE_COLORS[0], isGlobal: true, employeeIds: [] });
      setEmpSearch('');
      loadZones();
    } catch (err: any) {
      toast.error(err?.message || 'خطأ');
    } finally {
      setZoneSaving(false);
    }
  };

  const deleteZone = async (id: string) => {
    setDeleteTarget(id);
  };

  const confirmDeleteZone = async () => {
    if (!deleteTarget) return;
    try {
      await fetchAPI(`/staff-attendance/zones/${deleteTarget}`, { method: 'DELETE' });
      toast.success('تم حذف المنطقة');
      loadZones();
    } catch (err: any) {
      toast.error(err?.message || 'خطأ');
    } finally {
      setDeleteTarget(null);
    }
  };

  const toggleZoneActive = async (z: Zone) => {
    try {
      await fetchAPI(`/staff-attendance/zones/${z.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !z.isActive }),
      });
      loadZones();
    } catch (err: any) {
      toast.error(err?.message || 'خطأ');
    }
  };

  const startEditZone = (z: Zone) => {
    setEditingZone(z.id);
    const linkedEmployeeIds = z.enrollments?.map(e => e.enrollment.user.id) || [];
    setEditForm({ name: z.name, radius: z.radius, isGlobal: z.isGlobal ?? true, employeeIds: linkedEmployeeIds });
    setEmpSearch('');
  };

  const saveEditZone = async (id: string) => {
    if (!editForm.isGlobal && editForm.employeeIds.length === 0) { toast.error('اختر موظف واحد على الأقل للمنطقة المخصصة'); return; }
    try {
      setZoneSaving(true);
      await fetchAPI(`/staff-attendance/zones/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...editForm,
          employeeIds: editForm.isGlobal ? [] : editForm.employeeIds,
        }),
      });
      toast.success('تم تحديث المنطقة');
      setEditingZone(null);
      loadZones();
    } catch (err: any) {
      toast.error(err?.message || 'خطأ');
    } finally {
      setZoneSaving(false);
    }
  };

  // Map center: first active zone, or Egypt default
  const mapCenter = useMemo<[number, number]>(() => {
    const active = zones.find(z => z.isActive);
    if (active) return [active.latitude, active.longitude];
    return [30.0444, 31.2357]; // Cairo default
  }, [zones]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-10 h-10 border-4 border-tiba-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <PageHeader
        title="إعدادات نظام الحضور"
        description="تخصيص إعدادات ساعات العمل والموقع الجغرافي وأيام الإجازة"
        breadcrumbs={[
          { label: 'الرئيسية', href: '/dashboard' },
          { label: 'حضور الموظفين', href: '/dashboard/staff-attendance' },
          { label: 'الإعدادات' },
        ]}
      />

      <div className="max-w-4xl space-y-6">
        {/* Timezone */}
        <div className="bg-white rounded-xl border border-tiba-gray-200 shadow-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-tiba-secondary-50 flex items-center justify-center">
              <GlobeAltIcon className="w-5 h-5 text-tiba-secondary-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-tiba-gray-900">المنطقة الزمنية</h3>
              <p className="text-xs text-tiba-gray-400">يتم استخدامها لحساب التأخير وتحديد اليوم بشكل صحيح بغض النظر عن مكان السيرفر</p>
            </div>
          </div>
          <select
            value={form.timezone}
            onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
            className="w-full px-3 py-2.5 text-sm border border-tiba-gray-200 rounded-xl focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500 outline-none bg-white"
          >
            {TIMEZONE_OPTIONS.map(tz => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
          <p className="text-[11px] text-tiba-gray-400 mt-2 flex items-center gap-1">
            <InformationCircleIcon className="w-3.5 h-3.5" /> السيرفر في فرنسا — هذا الإعداد يضمن احتساب الأوقات بالمنطقة الزمنية الصحيحة للموظفين
          </p>
        </div>

        {/* Work Hours */}
        <div className="bg-white rounded-xl border border-tiba-gray-200 shadow-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-tiba-primary-50 flex items-center justify-center">
              <ClockIcon className="w-5 h-5 text-tiba-primary-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-tiba-gray-900">ساعات العمل</h3>
              <p className="text-xs text-tiba-gray-400">تحديد أوقات الدوام الرسمية</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-tiba-gray-500 block mb-1">بداية الدوام</label>
              <input type="time" value={form.workStartTime} onChange={e => setForm(f => ({ ...f, workStartTime: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-tiba-gray-200 rounded-xl focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500 outline-none" />
            </div>
            <div>
              <label className="text-xs text-tiba-gray-500 block mb-1">نهاية الدوام</label>
              <input type="time" value={form.workEndTime} onChange={e => setForm(f => ({ ...f, workEndTime: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-tiba-gray-200 rounded-xl focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500 outline-none" />
            </div>
            <div>
              <label className="text-xs text-tiba-gray-500 block mb-1">حد التأخير (دقيقة)</label>
              <input type="number" value={form.lateThresholdMinutes} onChange={e => setForm(f => ({ ...f, lateThresholdMinutes: Number(e.target.value) }))} min="0"
                className="w-full px-3 py-2 text-sm border border-tiba-gray-200 rounded-xl focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500 outline-none" />
            </div>
            <div>
              <label className="text-xs text-tiba-gray-500 block mb-1">حد الانصراف المبكر (دقيقة)</label>
              <input type="number" value={form.earlyLeaveThreshold} onChange={e => setForm(f => ({ ...f, earlyLeaveThreshold: Number(e.target.value) }))} min="0"
                className="w-full px-3 py-2 text-sm border border-tiba-gray-200 rounded-xl focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500 outline-none" />
            </div>
          </div>
        </div>

        {/* ===== Location Zones - Interactive Map ===== */}
        <div className="bg-white rounded-xl border border-tiba-gray-200 shadow-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-tiba-primary-50 flex items-center justify-center">
                <MapPinIcon className="w-5 h-5 text-tiba-primary-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-tiba-gray-900">مناطق الحضور المسموحة</h3>
                <p className="text-xs text-tiba-gray-400">حدد المناطق الجغرافية التي يُسمح بتسجيل الحضور منها</p>
              </div>
            </div>
          </div>

          {/* Toggle: Require location (main) */}
          <div className="flex items-start gap-3 mb-4 p-4 rounded-xl bg-tiba-gray-50 border border-tiba-gray-200">
            <label className="relative inline-flex items-center cursor-pointer mt-0.5">
              <input
                type="checkbox"
                checked={form.requireLocation}
                onChange={e => {
                  const val = e.target.checked;
                  setForm(f => ({
                    ...f,
                    requireLocation: val,
                    requireCheckInLocation: val ? f.requireCheckInLocation : false,
                    requireCheckOutLocation: val ? f.requireCheckOutLocation : false,
                  }));
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-tiba-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-tiba-primary-500/30 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-tiba-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tiba-primary-600" />
            </label>
            <div>
              <p className="text-sm font-medium text-tiba-gray-800">
                {form.requireLocation ? 'نظام الموقع الجغرافي مفعّل' : 'نظام الموقع الجغرافي معطّل'}
              </p>
              <p className="text-xs text-tiba-gray-500 mt-0.5">
                {form.requireLocation
                  ? 'حدد المناطق المسموحة وفعّل الإلزام للحضور والانصراف بشكل منفصل'
                  : 'يمكن للموظفين تسجيل الحضور والانصراف من أي مكان بدون قيود جغرافية'
                }
              </p>
            </div>
          </div>

          {/* Sub-toggles: Check-in and Check-out location enforcement */}
          {form.requireLocation && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              {/* Check-in location enforcement */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-tiba-secondary-50/50 border border-tiba-secondary-200/60">
                <label className="relative inline-flex items-center cursor-pointer mt-0.5">
                  <input
                    type="checkbox"
                    checked={form.requireCheckInLocation}
                    onChange={e => setForm(f => ({ ...f, requireCheckInLocation: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-[22px] bg-tiba-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-tiba-secondary-500/30 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-tiba-gray-300 after:border after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:bg-tiba-secondary-600" />
                </label>
                <div>
                  <p className="text-xs font-semibold text-tiba-gray-800">
                    إلزام الموقع عند الحضور
                  </p>
                  <p className="text-[11px] text-tiba-gray-500 mt-0.5">
                    {form.requireCheckInLocation
                      ? 'يجب التواجد في منطقة مسموحة لتسجيل الحضور'
                      : 'يسمح بتسجيل الحضور من أي مكان'
                    }
                  </p>
                </div>
              </div>

              {/* Check-out location enforcement */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50/50 border border-rose-200/60">
                <label className="relative inline-flex items-center cursor-pointer mt-0.5">
                  <input
                    type="checkbox"
                    checked={form.requireCheckOutLocation}
                    onChange={e => setForm(f => ({ ...f, requireCheckOutLocation: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-[22px] bg-tiba-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-rose-500/30 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-tiba-gray-300 after:border after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:bg-rose-600" />
                </label>
                <div>
                  <p className="text-xs font-semibold text-tiba-gray-800">
                    إلزام الموقع عند الانصراف
                  </p>
                  <p className="text-[11px] text-tiba-gray-500 mt-0.5">
                    {form.requireCheckOutLocation
                      ? 'يجب التواجد في منطقة مسموحة لتسجيل الانصراف'
                      : 'يسمح بتسجيل الانصراف من أي مكان'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Info when location is disabled */}
          {!form.requireLocation && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-tiba-primary-50 border border-tiba-primary-200 mb-4">
              <InformationCircleIcon className="w-5 h-5 text-tiba-primary-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-tiba-primary-800 font-medium">الحضور والانصراف مسموح من أي مكان</p>
                <p className="text-xs text-tiba-primary-600 mt-0.5">
                  عند تعطيل نظام الموقع، يستطيع الموظفون تسجيل الحضور والانصراف من أي مكان.
                  يمكنك تفعيل نظام الموقع وإضافة مناطق مسموحة على الخريطة لتقييد أماكن الحضور والانصراف.
                </p>
              </div>
            </div>
          )}

          {/* Map and zones (visible only when requireLocation is on) */}
          {form.requireLocation && (
            <div className="space-y-4">
              {/* Map */}
              <div className="relative z-0 rounded-xl overflow-hidden border border-tiba-gray-200" style={{ height: 480 }}>
                <DynamicMap
                  zones={zones}
                  onMapClick={handleMapClick}
                  center={mapCenter}
                  previewZone={addingZone ? { latitude: newZone.latitude, longitude: newZone.longitude, radius: newZone.radius, color: newZone.color } : null}
                  onRadiusChange={addingZone ? (r: number) => setNewZone(z => ({ ...z, radius: r })) : undefined}
                  flyToTarget={flyToZone}
                />
                {/* Overlay hint */}
                {!addingZone && (
                  <div className="absolute bottom-3 left-3 right-3 z-[999] pointer-events-none">
                    <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2.5 shadow-lg border border-tiba-gray-200 flex items-center gap-2.5">
                      <CursorArrowRaysIcon className="w-5 h-5 text-tiba-primary-500 flex-shrink-0" />
                      <p className="text-xs text-tiba-gray-600">
                        <span className="font-semibold text-tiba-primary-700">اضغط على أي نقطة في الخريطة</span> لإضافة منطقة حضور جديدة • استخدم البحث في الأعلى للوصول لمكان معين
                      </p>
                    </div>
                  </div>
                )}
                {zones.filter(z => z.isActive).length === 0 && !addingZone && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none z-[999]">
                    <div className="bg-white/95 backdrop-blur-sm rounded-xl px-6 py-4 shadow-lg text-center">
                      <MapIcon className="w-8 h-8 text-tiba-primary-500 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-tiba-gray-800">اضغط على الخريطة لإضافة منطقة حضور</p>
                      <p className="text-xs text-tiba-gray-500 mt-1">حدد موقع مقر العمل أو أي نقطة مسموحة</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Add Zone Modal */}
              {addingZone && (
                <div className="p-4 rounded-xl bg-tiba-primary-50 border-2 border-tiba-primary-300 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-tiba-primary-900 flex items-center gap-2">
                      <PlusIcon className="w-4 h-4" /> إضافة منطقة جديدة
                    </h4>
                    <button onClick={() => setAddingZone(false)} className="text-tiba-gray-400 hover:text-tiba-gray-600">
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-tiba-gray-600 block mb-1">اسم المنطقة *</label>
                      <input
                        type="text"
                        value={newZone.name}
                        onChange={e => setNewZone(z => ({ ...z, name: e.target.value }))}
                        placeholder="مثال: المقر الرئيسي"
                        className="w-full px-3 py-2 text-sm border border-tiba-primary-200 rounded-xl focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500 outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-tiba-gray-600 block mb-1">نصف القطر</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={Number((newZone.radius / 1000).toFixed(2))}
                          onChange={e => setNewZone(z => ({ ...z, radius: Math.max(50, Math.round(Number(e.target.value) * 1000)) }))}
                          min="0.05"
                          max="5"
                          step="0.05"
                          className="w-full px-3 py-2 text-sm border border-tiba-primary-200 rounded-xl focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500 outline-none bg-white"
                        />
                        <span className="text-xs text-tiba-gray-500 font-medium whitespace-nowrap">كم</span>
                      </div>
                      <p className="text-[10px] text-tiba-gray-400 mt-1">{formatRadius(newZone.radius)} • استخدم الشريط على الخريطة</p>
                    </div>
                    <div>
                      <label className="text-xs text-slate-600 block mb-1">اللون</label>
                      <div className="flex gap-1.5 flex-wrap">
                        {ZONE_COLORS.map(c => (
                          <button
                            key={c}
                            onClick={() => setNewZone(z => ({ ...z, color: c }))}
                            className={`w-7 h-7 rounded-full border-2 transition-transform ${newZone.color === c ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* isGlobal toggle */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-tiba-primary-200">
                    <label className="relative inline-flex items-center cursor-pointer mt-0.5">
                      <input
                        type="checkbox"
                        checked={newZone.isGlobal}
                        onChange={e => setNewZone(z => ({ ...z, isGlobal: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-[22px] bg-tiba-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-tiba-primary-500/30 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-tiba-gray-300 after:border after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:bg-tiba-primary-600" />
                    </label>
                    <div>
                      <p className="text-xs font-semibold text-tiba-gray-800">
                        {newZone.isGlobal ? 'منطقة عامة للجميع' : 'منطقة مخصصة لموظفين معينين'}
                      </p>
                      <p className="text-[11px] text-tiba-gray-500 mt-0.5">
                        {newZone.isGlobal
                          ? 'جميع الموظفين يستطيعون تسجيل الحضور من هذه المنطقة'
                          : 'اختر الموظفين المسموح لهم بتسجيل الحضور من هذه المنطقة'
                        }
                      </p>
                    </div>
                  </div>

                  {/* Employee picker for custom zones */}
                  {!newZone.isGlobal && (
                    <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                          <UserGroupIcon className="w-4 h-4" /> الموظفين المسموح لهم ({newZone.employeeIds.length})
                        </label>
                        {enrolledEmployees.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setNewZone(z => ({
                              ...z,
                              employeeIds: z.employeeIds.length === enrolledEmployees.length ? [] : enrolledEmployees.map(e => e.user.id),
                            }))}
                            className="text-[10px] text-amber-700 hover:text-amber-900 font-medium"
                          >
                            {newZone.employeeIds.length === enrolledEmployees.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                          </button>
                        )}
                      </div>
                      {enrolledEmployees.length > 5 && (
                        <div className="relative mb-2">
                          <MagnifyingGlassIcon className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-tiba-gray-400" />
                          <input
                            type="text"
                            value={empSearch}
                            onChange={e => setEmpSearch(e.target.value)}
                            placeholder="بحث عن موظف..."
                            className="w-full pr-8 pl-3 py-1.5 text-xs border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-300/40 focus:border-amber-400 outline-none bg-white"
                          />
                        </div>
                      )}
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {enrolledEmployees
                          .filter(e => !empSearch || e.user.name.toLowerCase().includes(empSearch.toLowerCase()))
                          .map(emp => (
                          <label
                            key={emp.user.id}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-amber-100/60 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={newZone.employeeIds.includes(emp.user.id)}
                              onChange={() => {
                                setNewZone(z => ({
                                  ...z,
                                  employeeIds: z.employeeIds.includes(emp.user.id)
                                    ? z.employeeIds.filter(id => id !== emp.user.id)
                                    : [...z.employeeIds, emp.user.id],
                                }));
                              }}
                              className="w-3.5 h-3.5 text-amber-600 border-amber-300 rounded focus:ring-amber-500"
                            />
                            <span className="text-xs text-tiba-gray-700">{emp.user.name}</span>
                          </label>
                        ))}
                        {enrolledEmployees.length === 0 && (
                          <p className="text-[11px] text-amber-600 text-center py-2">لا يوجد موظفين مسجلين في النظام</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-[11px] text-tiba-gray-500">
                    <MapPinIcon className="w-3.5 h-3.5" />
                    الإحداثيات: {newZone.latitude.toFixed(6)}, {newZone.longitude.toFixed(6)}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setAddingZone(false)}>إلغاء</Button>
                    <Button size="sm" onClick={saveNewZone} disabled={zoneSaving}>
                      {zoneSaving ? 'جاري الحفظ...' : 'إضافة المنطقة'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Zones List */}
              {zones.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-tiba-gray-500 uppercase tracking-wider">المناطق المضافة ({zones.length})</h4>
                  {zones.map(z => (
                    <div
                      key={z.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                        z.isActive ? 'border-tiba-gray-200 bg-white' : 'border-tiba-gray-100 bg-tiba-gray-50 opacity-60'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full flex-shrink-0 border-2 border-white shadow-sm mt-1" style={{ backgroundColor: z.color }} />

                      {editingZone === z.id ? (
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                              className="flex-1 min-w-[120px] px-2 py-1 text-sm border border-tiba-primary-200 rounded-lg outline-none focus:border-tiba-primary-500"
                            />
                            <input
                              type="number"
                              value={Number((editForm.radius / 1000).toFixed(2))}
                              onChange={e => setEditForm(f => ({ ...f, radius: Math.max(50, Math.round(Number(e.target.value) * 1000)) }))}
                              className="w-20 px-2 py-1 text-sm border border-tiba-primary-200 rounded-lg outline-none focus:border-tiba-primary-500"
                              min="0.05"
                              max="5"
                              step="0.05"
                            />
                            <span className="text-xs text-tiba-gray-400">كم</span>
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editForm.isGlobal}
                                onChange={e => setEditForm(f => ({ ...f, isGlobal: e.target.checked, employeeIds: e.target.checked ? [] : f.employeeIds }))}
                                className="w-3.5 h-3.5 text-tiba-primary-600 border-tiba-gray-300 rounded focus:ring-tiba-primary-500"
                              />
                              <span className="text-[11px] text-tiba-gray-600">عامة</span>
                            </label>
                          </div>
                          {/* Employee picker for edit mode */}
                          {!editForm.isGlobal && (
                            <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[11px] font-semibold text-amber-800 flex items-center gap-1">
                                  <UserGroupIcon className="w-3.5 h-3.5" /> الموظفين ({editForm.employeeIds.length})
                                </span>
                                {enrolledEmployees.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setEditForm(f => ({
                                      ...f,
                                      employeeIds: f.employeeIds.length === enrolledEmployees.length ? [] : enrolledEmployees.map(e => e.user.id),
                                    }))}
                                    className="text-[10px] text-amber-700 hover:text-amber-900 font-medium"
                                  >
                                    {editForm.employeeIds.length === enrolledEmployees.length ? 'إلغاء الكل' : 'تحديد الكل'}
                                  </button>
                                )}
                              </div>
                              <div className="space-y-0.5 max-h-32 overflow-y-auto">
                                {enrolledEmployees.map(emp => (
                                  <label key={emp.user.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-amber-100/60 cursor-pointer text-xs">
                                    <input
                                      type="checkbox"
                                      checked={editForm.employeeIds.includes(emp.user.id)}
                                      onChange={() => setEditForm(f => ({
                                        ...f,
                                        employeeIds: f.employeeIds.includes(emp.user.id)
                                          ? f.employeeIds.filter(id => id !== emp.user.id)
                                          : [...f.employeeIds, emp.user.id],
                                      }))}
                                      className="w-3.5 h-3.5 text-amber-600 border-amber-300 rounded focus:ring-amber-500"
                                    />
                                    <span className="text-tiba-gray-700">{emp.user.name}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => saveEditZone(z.id)} disabled={zoneSaving} className="px-3 py-1 text-xs font-medium text-white bg-tiba-primary-600 hover:bg-tiba-primary-700 rounded-lg transition-colors">
                              حفظ
                            </button>
                            <button onClick={() => setEditingZone(null)} className="px-3 py-1 text-xs font-medium text-tiba-gray-600 bg-tiba-gray-100 hover:bg-tiba-gray-200 rounded-lg transition-colors">
                              إلغاء
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-tiba-gray-800 truncate">{z.name}</p>
                              {z.isGlobal ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-tiba-primary-50 text-tiba-primary-700 border border-tiba-primary-200/60">
                                  <GlobeAltIcon className="w-3 h-3" /> عامة
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
                                  <UserGroupIcon className="w-3 h-3" /> مخصصة
                                </span>
                              )}
                              {!z.isGlobal && z.enrollments && z.enrollments.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-tiba-gray-100 text-tiba-gray-600">
                                  <UsersIcon className="w-3 h-3" /> {z.enrollments.length} موظف
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-tiba-gray-400">
                              نصف القطر: {formatRadius(z.radius)} • {z.latitude.toFixed(4)}, {z.longitude.toFixed(4)}
                            </p>
                            {!z.isGlobal && z.enrollments && z.enrollments.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {z.enrollments.slice(0, 5).map(e => (
                                  <span
                                    key={e.enrollment.user.id}
                                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded-md border ${
                                      e.enrollment.allowGlobalZones
                                        ? 'bg-amber-50 text-amber-700 border-amber-100'
                                        : 'bg-red-50 text-red-700 border-red-100'
                                    }`}
                                    title={e.enrollment.allowGlobalZones ? 'مسموح بالنقاط العامة' : 'فقط النقاط المخصصة'}
                                  >
                                    {e.enrollment.user.name}
                                    {!e.enrollment.allowGlobalZones && (
                                      <span className="text-[8px] text-red-500">⊘</span>
                                    )}
                                  </span>
                                ))}
                                {z.enrollments.length > 5 && (
                                  <span className="inline-block px-1.5 py-0.5 text-[10px] bg-tiba-gray-100 text-tiba-gray-500 rounded-md">
                                    +{z.enrollments.length - 5} آخرين
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setFlyToZone([z.latitude, z.longitude])}
                              title="عرض على الخريطة"
                              className="p-1.5 text-tiba-gray-400 hover:text-tiba-primary-600 hover:bg-tiba-primary-50 rounded-lg transition-colors"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => toggleZoneActive(z)}
                              className={`px-2 py-1 text-[10px] font-medium rounded-md transition-colors ${
                                z.isActive
                                  ? 'bg-tiba-secondary-50 text-tiba-secondary-700 hover:bg-tiba-secondary-100'
                                  : 'bg-tiba-gray-100 text-tiba-gray-500 hover:bg-tiba-gray-200'
                              }`}
                            >
                              {z.isActive ? 'مفعّل' : 'معطّل'}
                            </button>
                            <button onClick={() => startEditZone(z)} className="p-1.5 text-tiba-gray-400 hover:text-tiba-primary-600 hover:bg-tiba-primary-50 rounded-lg transition-colors">
                              <PencilSquareIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => deleteZone(z.id)} className="p-1.5 text-tiba-gray-400 hover:text-tiba-danger-600 hover:bg-tiba-danger-50 rounded-lg transition-colors">
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-tiba-gray-50 rounded-xl border border-dashed border-tiba-gray-300">
                  <MapIcon className="w-10 h-10 text-tiba-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-tiba-gray-500">لا توجد مناطق مضافة</p>
                  <p className="text-xs text-tiba-gray-400 mt-1">اضغط على الخريطة لتحديد منطقة مسموح بتسجيل الحضور منها</p>
                </div>
              )}

              {/* Info box when zones exist but location is enforced */}
              {zones.filter(z => z.isActive).length > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-tiba-secondary-50 border border-tiba-secondary-200">
                  <CheckIcon className="w-4 h-4 text-tiba-secondary-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-tiba-secondary-700">
                    الموظفون يستطيعون تسجيل الحضور فقط عند التواجد داخل إحدى المناطق المفعّلة أعلاه.
                    يتم حساب المسافة من موقع GPS الخاص بجهاز الموظف.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Weekly Off Days */}
        <div className="bg-white rounded-xl border border-tiba-gray-200 shadow-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
              <ShieldCheckIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-tiba-gray-900">أيام الإجازة الأسبوعية</h3>
              <p className="text-xs text-tiba-gray-400">اختر أيام العطلة الأسبوعية للموظفين</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {DAY_OPTIONS.map(d => (
              <button
                key={d.value}
                onClick={() => toggleDay(d.value)}
                className={`px-4 py-2 text-sm rounded-xl font-medium transition-colors ${
                  form.weeklyOffDays.includes(d.value)
                    ? 'bg-tiba-primary-600 text-white shadow-sm'
                    : 'bg-tiba-gray-100 text-tiba-gray-600 hover:bg-tiba-gray-200'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            leftIcon={saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckIcon className="w-4 h-4" />}
          >
            حفظ الإعدادات
          </Button>
        </div>
      </div>

      {/* Delete Zone ConfirmDialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteZone}
        title="حذف منطقة الحضور"
        description="هل أنت متأكد من حذف هذه المنطقة؟ لن يتمكن الموظفون من تسجيل الحضور منها بعد الحذف."
        type="danger"
        confirmText="حذف"
        cancelText="إلغاء"
      />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <PageGuard requiredPermission={{ resource: 'staff-attendance.settings', action: 'view' }}>
      <SettingsPageContent />
    </PageGuard>
  );
}
