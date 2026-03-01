// Home — Header with profile photo & greeting
import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import Icon, { AppIcons } from '../shared/Icon';
import { Colors } from '../../styles/colors';

interface Props {
  nameAr?: string;
  photoUrl?: string;
  onProfilePress?: () => void;
}

const HomeHeader: React.FC<Props> = ({ nameAr, photoUrl, onProfilePress }) => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'صباح الخير' : 'مساء الخير';
  const firstName = nameAr?.split(' ')[0] || 'متدرب';

  return (
    <View style={s.card}>
      <View style={s.row}>
        <TouchableOpacity style={s.profileBtn} onPress={onProfilePress}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={s.img} />
          ) : (
            <View style={s.defaultAvatar}>
              <Text style={s.defaultAvatarText}>{nameAr?.charAt(0) || 'ط'}</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={s.textArea}>
          <View style={s.greetRow}>
            <Icon name="hand-wave" size={22} color={Colors.accent} />
            <Text style={s.greetName}>{greeting} {firstName}!</Text>
          </View>
          <Text style={s.sub}>مرحباً بك في منصة المتدربين - طيبة للعلوم المنصورة</Text>
          <View style={s.badge}>
            <Icon name="star" size={13} color={Colors.accent} />
            <Text style={s.badgeText}>مساعد خدمات هميه</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.white, marginHorizontal: 16, marginTop: 12,
    borderRadius: 20, padding: 20,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 12, elevation: 3,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  profileBtn: {
    width: 54, height: 54, borderRadius: 27, overflow: 'hidden',
    borderWidth: 2.5, borderColor: Colors.primary100, marginRight: 12,
  },
  img: { width: 54, height: 54 },
  defaultAvatar: {
    width: 54, height: 54, backgroundColor: Colors.backgroundSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  defaultAvatarText: { color: Colors.primary, fontWeight: '800', fontSize: 20 },
  textArea: { flex: 1, alignItems: 'flex-end' },
  greetRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  greetName: { fontSize: 20, fontWeight: '800', color: Colors.primary, textAlign: 'right', marginRight: 6 },
  sub: { fontSize: 12, color: Colors.textLight, textAlign: 'right', marginBottom: 8 },
  badge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.backgroundSoft, paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 12, gap: 4,
  },
  badgeText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
});

export default HomeHeader;
