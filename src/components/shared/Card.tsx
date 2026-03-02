// Shared Card — premium white card with emerald-aligned shadow
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../styles/colors';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  noPadding?: boolean;
  accent?: boolean;
}

const Card: React.FC<Props> = ({ children, style, noPadding, accent }) => (
  <View style={[s.card, noPadding ? s.noPad : s.pad, accent && s.accent, style]}>
    {accent && <View style={s.accentBar} />}
    {children}
  </View>
);

const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 14,
    overflow: 'hidden',
  },
  accent: {
    borderLeftWidth: 0,
    borderRightWidth: 4,
    borderRightColor: Colors.primary,
  },
  accentBar: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: Colors.primary,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  pad: { padding: 18 },
  noPad: { padding: 0 },
});

export default Card;

