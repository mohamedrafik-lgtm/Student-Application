// Home — Dashboard Cards (Attendance, Finance, Documents, Register Attendance)
import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import Icon, { AppIcons } from '../shared/Icon';
import { Colors } from '../../styles/colors';
import { AttendanceSummary } from '../../services/homeService';
import { TraineeDocument, DocumentType } from '../../types/auth';

const DOC_TYPE_LABELS: Record<string, string> = {
  [DocumentType.NATIONAL_ID]: 'بطاقة الهوية',
  [DocumentType.BIRTH_CERTIFICATE]: 'شهادة الميلاد',
  [DocumentType.QUALIFICATION_CERTIFICATE]: 'شهادة المؤهل',
  [DocumentType.MILITARY_SERVICE]: 'التجنيد',
  [DocumentType.MEDICAL_CERTIFICATE]: 'الشهادة الطبية',
  [DocumentType.PHOTOS]: 'صورة شخصية',
  [DocumentType.OTHER]: 'أخرى',
};
const REQUIRED_DOC_TYPES = [
  DocumentType.NATIONAL_ID, DocumentType.BIRTH_CERTIFICATE,
  DocumentType.QUALIFICATION_CERTIFICATE, DocumentType.MILITARY_SERVICE,
  DocumentType.MEDICAL_CERTIFICATE, DocumentType.PHOTOS,
];

interface Props {
  attendanceSummary: AttendanceSummary | null;
  loadingAttendance: boolean;
  loadingAccess: boolean;
  documents: TraineeDocument[];
  loadingDocs: boolean;
  onAttendance?: () => void;
  onPayments?: () => void;
  onDocuments?: () => void;
  onRegisterAttendance?: () => void;
}

const DashboardCards: React.FC<Props> = ({
  attendanceSummary, loadingAttendance, loadingAccess,
  documents, loadingDocs,
  onAttendance, onPayments, onDocuments, onRegisterAttendance,
}) => (
  <View style={s.section}>
    {/* Row 1 */}
    <View style={s.row}>
      {/* Attendance */}
      <TouchableOpacity style={s.card} onPress={onAttendance} activeOpacity={0.7}>
        <View style={s.cardHeader}>
          <View style={[s.iconCircle, { backgroundColor: Colors.backgroundSoft }]}>
            <Icon name={AppIcons.attendance} size={18} color={Colors.primary} />
          </View>
          <Text style={s.cardTitle}>نسبة الحضور</Text>
        </View>
        <View style={s.centerContent}>
          {loadingAttendance ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <>
              <View style={[s.attCircle, (attendanceSummary?.attendancePercentage ?? 0) < 75 && { borderColor: Colors.error }]}>
                <Text style={[s.attPercent, (attendanceSummary?.attendancePercentage ?? 0) < 75 && { color: Colors.error }]}>
                  {attendanceSummary?.attendancePercentage ?? 0}%
                </Text>
              </View>
              <Text style={s.cardSub}>
                {attendanceSummary?.present ?? 0} من {attendanceSummary?.total ?? 0} محاضرة
              </Text>
            </>
          )}
        </View>
      </TouchableOpacity>

      {/* Finance */}
      <TouchableOpacity style={s.card} onPress={onPayments} activeOpacity={0.7}>
        <View style={s.cardHeader}>
          <View style={[s.iconCircle, { backgroundColor: Colors.warningLight }]}>
            <Icon name={AppIcons.payments} size={18} color={Colors.warning} />
          </View>
          <Text style={s.cardTitle}>الحالة المالية</Text>
        </View>
        {loadingAccess ? (
          <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 12 }} />
        ) : (
          <View style={{ paddingVertical: 4 }}>
            <View style={s.finRow}><Text style={s.finLabel}>الإجمالي</Text><Text style={s.finAmount}>8000 ج.م</Text></View>
            <View style={s.finDivider} />
            <View style={s.finRow}>
              <View style={[s.statusPill, { backgroundColor: Colors.successLight }]}>
                <Text style={[s.statusPillText, { color: Colors.success }]}>المتبقي</Text>
              </View>
              <Text style={[s.finAmount, { color: Colors.error }]}>4400 ج.م</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>

    {/* Row 2 */}
    <View style={s.row}>
      {/* Documents */}
      <TouchableOpacity style={s.card} onPress={onDocuments} activeOpacity={0.7}>
        <View style={s.cardHeader}>
          <View style={[s.iconCircle, { backgroundColor: Colors.infoLight }]}>
            <Icon name={AppIcons.document} size={18} color={Colors.info} />
          </View>
          <Text style={s.cardTitle}>الوثائق المطلوبة</Text>
        </View>
        {loadingDocs ? (
          <ActivityIndicator size="small" color={Colors.info} style={{ marginTop: 10 }} />
        ) : (
          <View style={{ paddingVertical: 4 }}>
            <Text style={s.docsCount}>
              {documents.length} من {REQUIRED_DOC_TYPES.length} وثائق مطلوبة
            </Text>
            <View style={s.progressBg}>
              <View style={[s.progressFill, { width: `${Math.min(Math.round((documents.length / REQUIRED_DOC_TYPES.length) * 100), 100)}%` }]} />
            </View>
            {documents.slice(0, 2).map((doc) => (
              <View key={doc.id} style={s.docItem}>
                <View style={[s.docDot, { backgroundColor: doc.isVerified ? Colors.success : Colors.warning }]} />
                <Text style={s.docText} numberOfLines={1}>
                  {DOC_TYPE_LABELS[doc.documentType] || doc.fileName || 'وثيقة'}
                </Text>
              </View>
            ))}
            <TouchableOpacity onPress={onDocuments}><Text style={s.docLink}>عرض جميع الوثائق ←</Text></TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>

      {/* Register Attendance */}
      <TouchableOpacity style={[s.card, s.regCard]} onPress={onRegisterAttendance} activeOpacity={0.7}>
        <View style={s.cardHeader}>
          <Text style={s.regTitle}>تسجيل الحضور</Text>
          <Text style={s.regBadge}>متاح</Text>
        </View>
        <Text style={s.regSub}>سجل حضورك عبر الكود أو مسح QR</Text>
        <View style={s.qrWrap}>
          <View style={s.qrBox}>
            <Icon name="qrcode-scan" size={22} color={Colors.textHint} />
          </View>
        </View>
        <TouchableOpacity style={s.startBtn} onPress={onRegisterAttendance}>
          <Text style={s.startBtnText}>بدأ الآن</Text>
          <Icon name="play" size={12} color={Colors.white} />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  </View>
);

const s = StyleSheet.create({
  section: { paddingHorizontal: 16, marginTop: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  card: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 18, padding: 14,
    marginHorizontal: 4,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 10 },
  iconCircle: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  centerContent: { alignItems: 'center', paddingVertical: 6 },
  attCircle: {
    width: 62, height: 62, borderRadius: 31, borderWidth: 4,
    borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  attPercent: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  cardSub: { fontSize: 11, color: Colors.textLight, textAlign: 'center' },
  finRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  finLabel: { fontSize: 11, color: Colors.textLight },
  finAmount: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  finDivider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: 4 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusPillText: { fontSize: 10, fontWeight: '600' },
  docsCount: { fontSize: 12, color: Colors.textPrimary, fontWeight: '600', textAlign: 'right', marginBottom: 6 },
  progressBg: { height: 6, backgroundColor: Colors.borderLight, borderRadius: 3, marginBottom: 8, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: Colors.primary, borderRadius: 3 },
  docItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 3 },
  docDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 4 },
  docText: { fontSize: 10, color: Colors.textLight },
  docLink: { fontSize: 11, color: Colors.primary, fontWeight: '600', textAlign: 'right', marginTop: 4 },
  regCard: { borderWidth: 1, borderColor: Colors.successBorder },
  regTitle: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary, textAlign: 'right' },
  regBadge: {
    fontSize: 10, color: Colors.primary, fontWeight: '700',
    backgroundColor: Colors.backgroundSoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
  },
  regSub: { fontSize: 11, color: Colors.textLight, textAlign: 'right', marginBottom: 8 },
  qrWrap: { alignItems: 'center', marginBottom: 8 },
  qrBox: {
    width: 56, height: 56, borderRadius: 12, backgroundColor: Colors.backgroundSoft,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.borderMedium, borderStyle: 'dashed',
  },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, paddingVertical: 8, borderRadius: 10, gap: 6,
  },
  startBtnText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
});

export default DashboardCards;
