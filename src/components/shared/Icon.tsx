// Shared Icon component — wraps react-native-vector-icons/MaterialCommunityIcons
// Single Responsibility: Only icon rendering
import React from 'react';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../styles/colors';

export interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

const Icon: React.FC<IconProps> = ({ name, size = 22, color = Colors.textPrimary, style }) => (
  <MaterialCommunityIcons name={name} size={size} color={color} style={style} />
);

export default Icon;

// ── Common icon names used throughout the app ──
export const AppIcons = {
  // Navigation
  back: 'arrow-right',
  forward: 'arrow-left',
  menu: 'menu',
  close: 'close',
  home: 'home-outline',
  homeFilled: 'home',

  // Academic
  grades: 'chart-bar',
  gradesFilled: 'chart-bar',
  exam: 'file-document-edit-outline',
  certificate: 'certificate-outline',
  schedule: 'calendar-clock-outline',
  scheduleFilled: 'calendar-clock',
  attendance: 'clipboard-check-outline',
  attendanceFilled: 'clipboard-check',
  lecture: 'play-circle-outline',
  book: 'book-open-variant',

  // Finance
  payments: 'credit-card-outline',
  paymentsFilled: 'credit-card',
  money: 'cash-multiple',
  receipt: 'receipt',

  // User
  profile: 'account-circle-outline',
  profileFilled: 'account-circle',
  student: 'school-outline',
  logout: 'logout',
  settings: 'cog-outline',

  // Actions
  add: 'plus',
  edit: 'pencil-outline',
  delete: 'delete-outline',
  search: 'magnify',
  filter: 'filter-variant',
  refresh: 'refresh',
  download: 'download-outline',
  upload: 'upload-outline',
  share: 'share-variant-outline',
  copy: 'content-copy',
  camera: 'camera-outline',
  qrCode: 'qrcode-scan',

  // Status
  check: 'check-circle-outline',
  checkFilled: 'check-circle',
  warning: 'alert-circle-outline',
  error: 'close-circle-outline',
  info: 'information-outline',
  pending: 'clock-outline',
  lock: 'lock-outline',
  unlock: 'lock-open-outline',

  // Misc
  star: 'star-outline',
  starFilled: 'star',
  heart: 'heart-outline',
  bell: 'bell-outline',
  document: 'file-document-outline',
  folder: 'folder-outline',
  link: 'link-variant',
  phone: 'phone-outline',
  email: 'email-outline',
  location: 'map-marker-outline',
  calendar: 'calendar-outline',
  time: 'clock-time-four-outline',
  chevronDown: 'chevron-down',
  chevronUp: 'chevron-up',
  chevronLeft: 'chevron-left',
  chevronRight: 'chevron-right',
  dotsVertical: 'dots-vertical',
  expand: 'chevron-down',
  collapse: 'chevron-up',
  eye: 'eye-outline',
  eyeOff: 'eye-off-outline',

  // Requests
  appeal: 'scale-balance',
  request: 'file-send-outline',
  sickLeave: 'hospital-box-outline',
  postpone: 'calendar-remove-outline',
  enrollment: 'badge-account-outline',
  deferral: 'timer-sand',
} as const;
