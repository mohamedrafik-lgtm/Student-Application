// Signup — Step Indicator component
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../styles/colors';

interface Props {
  currentStep: number;
  totalSteps?: number;
}

const StepIndicator: React.FC<Props> = ({ currentStep, totalSteps = 3 }) => (
  <View style={s.row}>
    {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
      <View key={step} style={s.stepRow}>
        <View style={[s.circle, currentStep >= step && s.circleActive]}>
          <Text style={[s.num, currentStep >= step && s.numActive]}>{step}</Text>
        </View>
        {step < totalSteps && (
          <View style={[s.line, currentStep > step && s.lineActive]} />
        )}
      </View>
    ))}
  </View>
);

const s = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 28 },
  stepRow: { flexDirection: 'row', alignItems: 'center' },
  circle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.borderMedium,
    alignItems: 'center', justifyContent: 'center',
  },
  circleActive: { backgroundColor: Colors.primary },
  num: { fontSize: 15, fontWeight: '700', color: Colors.textHint },
  numActive: { color: Colors.white },
  line: { width: 50, height: 2.5, backgroundColor: Colors.borderMedium, marginHorizontal: 6, borderRadius: 2 },
  lineActive: { backgroundColor: Colors.primary },
});

export default StepIndicator;
