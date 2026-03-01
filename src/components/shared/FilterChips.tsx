// Shared FilterChips — horizontal scrollable filter chips
import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
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
          activeOpacity={0.7}
        >
          <Text style={[s.chipText, active && s.chipTextActive]}>
            {opt.label}
            {opt.count !== undefined ? ` (${opt.count})` : ''}
          </Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);

const s = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderMedium,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.white,
  },
});

export default FilterChips;
