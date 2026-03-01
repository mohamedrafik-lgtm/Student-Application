// Home — Video / Training Content card
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon, { AppIcons } from '../shared/Icon';
import { Colors } from '../../styles/colors';

interface Props {
  onPress?: () => void;
}

const VideoSection: React.FC<Props> = ({ onPress }) => (
  <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.7}>
    <View style={s.inner}>
      <View style={s.thumb}>
        <View style={s.playBtn}>
          <Icon name="play" size={22} color={Colors.white} />
        </View>
        <View style={s.overlay}>
          <Text style={s.timestamp}>00:00 / 45:30</Text>
        </View>
      </View>
      <View style={s.info}>
        <View style={s.titleRow}>
          <Icon name={AppIcons.content} size={18} color={Colors.primaryLight} />
          <Text style={s.title}>المحتوى التدريبي</Text>
        </View>
        <Text style={s.sub}>هل يمكنك شرح هذه المحاضرة مرة أخرى؟</Text>
        <View style={s.progressBg}>
          <View style={[s.progressFill, { width: '35%' }]} />
        </View>
      </View>
    </View>
  </TouchableOpacity>
);

const s = StyleSheet.create({
  card: {
    marginHorizontal: 16, marginTop: 2,
    backgroundColor: Colors.backgroundDark, borderRadius: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 5,
  },
  inner: { flexDirection: 'column' },
  thumb: {
    height: 140, backgroundColor: '#111827',
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  playBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(5,150,105,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  overlay: { position: 'absolute', bottom: 8, left: 12 },
  timestamp: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  info: { padding: 14 },
  titleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 4 },
  title: { fontSize: 14, fontWeight: '700', color: Colors.white, textAlign: 'right' },
  sub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', textAlign: 'right', marginBottom: 8 },
  progressBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: Colors.primary, borderRadius: 2 },
});

export default VideoSection;
