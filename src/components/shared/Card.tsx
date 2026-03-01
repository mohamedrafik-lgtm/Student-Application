// Shared Card — white card with shadow
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../styles/colors';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  noPadding?: boolean;
}

const Card: React.FC<Props> = ({ children, style, noPadding }) => (
  <View style={[s.card, noPadding ? s.noPad : s.pad, style]}>{children}</View>
);

const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  },
  pad: { padding: 16 },
  noPad: { padding: 0 },
});

export default Card;
