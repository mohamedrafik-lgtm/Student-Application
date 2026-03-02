// Shared FilterChips  premium horizontally scrollable filter chips
import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Colors } from '../../styles/colors';

interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

interface Props {
  options: FilterOption[];
  activeId: string;
  onSelect: (id: string) => void;
}

const FilterChips: React.FC<Props> = ({ options, activeId, onSelect }) => (
  <View style={s.container}>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.row}
    >
      {options.map(opt => {
        const active = opt.id === activeId;
        return (
          <TouchableOpacity
            key={opt.id}
            style={[s.chip, active && s.chipActive]}
            onPress={() => onSelect(opt.id)}
            activeOpacity={0.75}
          >
            <Text style={[s.chipText, active && s.chipTextActive]}>
              {opt.label}{opt.count !== undefined ? ` (${opt.count})` : ''}
            </Text>
            {active && <View style={s.dot} />}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  </View>
);

const s = StyleSheet.create({
  container: { marginVertical: 4 },
  row: { flexDirection: 'row-reverse', paddingVertical: 6, paddingHorizontal: 4, gap: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 24,
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.borderDark,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  chipActive: {
    backgroundColor: Colors.primary, borderColor: Colors.primary,
    shadowColor: Colors.primaryDark, shadowOpacity: 0.18, shadowRadius: 6, elevation: 3,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.textLight },
  chipTextActive: { color: Colors.white },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.7)' },
});

export default FilterChips;