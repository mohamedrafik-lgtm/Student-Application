'use client';

import Image from 'next/image';

const STATUS_RING_COLORS: Record<string, string> = {
  PRESENT: 'ring-emerald-400',
  ABSENT_UNEXCUSED: 'ring-red-400',
  ABSENT: 'ring-red-400',
  ABSENT_EXCUSED: 'ring-teal-400',
  LEAVE: 'ring-teal-400',
  LATE: 'ring-amber-400',
  EARLY_LEAVE: 'ring-orange-400',
  HOLIDAY: 'ring-purple-400',
  DAY_OFF: 'ring-blue-300',
  ON_LEAVE: 'ring-purple-400',
  NOT_RECORDED: 'ring-slate-300',
};

const STATUS_DOT_COLORS: Record<string, string> = {
  PRESENT: 'bg-emerald-400 border-white',
  ABSENT_UNEXCUSED: 'bg-red-400 border-white',
  ABSENT: 'bg-red-400 border-white',
  ABSENT_EXCUSED: 'bg-teal-400 border-white',
  LEAVE: 'bg-teal-400 border-white',
  LATE: 'bg-amber-400 border-white',
  EARLY_LEAVE: 'bg-orange-400 border-white',
  HOLIDAY: 'bg-purple-400 border-white',
  DAY_OFF: 'bg-blue-300 border-white',
  ON_LEAVE: 'bg-purple-400 border-white',
  NOT_RECORDED: 'bg-slate-300 border-white',
};

const GRADIENT_COLORS = [
  'from-blue-400 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-violet-400 to-purple-500',
  'from-rose-400 to-pink-500',
  'from-amber-400 to-orange-500',
  'from-cyan-400 to-blue-500',
  'from-fuchsia-400 to-pink-500',
  'from-lime-400 to-emerald-500',
];

function getGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return GRADIENT_COLORS[Math.abs(hash) % GRADIENT_COLORS.length];
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

interface StaffAvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: string | null;
  showStatusDot?: boolean;
  showStatusRing?: boolean;
  className?: string;
  onClick?: () => void;
}

const SIZES = {
  xs: { container: 'w-7 h-7', text: 'text-[9px]', dot: 'w-2 h-2 -bottom-0 -right-0 border', ring: 'ring-[1.5px]', img: 28 },
  sm: { container: 'w-8 h-8', text: 'text-[10px]', dot: 'w-2.5 h-2.5 -bottom-0.5 -right-0.5 border-[1.5px]', ring: 'ring-2', img: 32 },
  md: { container: 'w-10 h-10', text: 'text-xs', dot: 'w-3 h-3 -bottom-0.5 -right-0.5 border-[1.5px]', ring: 'ring-2', img: 40 },
  lg: { container: 'w-12 h-12', text: 'text-sm', dot: 'w-3.5 h-3.5 -bottom-0.5 -right-0.5 border-2', ring: 'ring-[2.5px]', img: 48 },
  xl: { container: 'w-16 h-16', text: 'text-base', dot: 'w-4 h-4 -bottom-0.5 -right-0.5 border-2', ring: 'ring-[3px]', img: 64 },
};

export default function StaffAvatar({
  name,
  photoUrl,
  size = 'md',
  status,
  showStatusDot = false,
  showStatusRing = false,
  className = '',
  onClick,
}: StaffAvatarProps) {
  const s = SIZES[size];
  const ringColor = status ? STATUS_RING_COLORS[status] || 'ring-slate-200' : 'ring-transparent';
  const dotColor = status ? STATUS_DOT_COLORS[status] || 'bg-slate-300 border-white' : '';
  const gradient = getGradient(name);

  return (
    <div
      className={`relative inline-flex flex-shrink-0 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      <div
        className={`${s.container} rounded-full overflow-hidden ${
          showStatusRing && status ? `ring ${s.ring} ring-offset-1 ${ringColor}` : ''
        } transition-all`}
      >
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={name}
            width={s.img}
            height={s.img}
            className="w-full h-full object-cover rounded-full"
            unoptimized
          />
        ) : (
          <div className={`w-full h-full rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <span className={`font-bold text-white ${s.text} leading-none`}>{getInitials(name)}</span>
          </div>
        )}
      </div>
      {showStatusDot && status && (
        <span className={`absolute ${s.dot} rounded-full ${dotColor}`} />
      )}
    </div>
  );
}

export { STATUS_RING_COLORS, STATUS_DOT_COLORS };
