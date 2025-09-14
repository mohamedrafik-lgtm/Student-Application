// SOLID Principles Applied:
// 1. Single Responsibility: This component only handles date selection
// 2. Open/Closed: Can be extended with new features without modification
// 3. Interface Segregation: Uses specific interfaces for different concerns
// 4. Dependency Inversion: Depends on abstractions (props) not concretions

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Colors } from '../styles/colors';

const { width } = Dimensions.get('window');

interface DatePickerProps {
  label: string;
  value?: string; // Format: YYYY-MM-DD
  onChange: (date: string) => void;
  required?: boolean;
  error?: string;
  placeholder?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({
  label,
  value,
  onChange,
  required = false,
  error,
  placeholder = 'اختر التاريخ',
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // Generate arrays for days, months, and years
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = [
    { value: 1, label: 'يناير' },
    { value: 2, label: 'فبراير' },
    { value: 3, label: 'مارس' },
    { value: 4, label: 'أبريل' },
    { value: 5, label: 'مايو' },
    { value: 6, label: 'يونيو' },
    { value: 7, label: 'يوليو' },
    { value: 8, label: 'أغسطس' },
    { value: 9, label: 'سبتمبر' },
    { value: 10, label: 'أكتوبر' },
    { value: 11, label: 'نوفمبر' },
    { value: 12, label: 'ديسمبر' },
  ];
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  useEffect(() => {
    if (value) {
      const [year, month, day] = value.split('-').map(Number);
      setSelectedYear(year);
      setSelectedMonth(month);
      setSelectedDay(day);
    }
  }, [value]);

  const handleConfirm = () => {
    if (selectedDay && selectedMonth && selectedYear) {
      const formattedDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`;
      onChange(formattedDate);
      setIsModalVisible(false);
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const getDisplayValue = () => {
    if (selectedDay && selectedMonth && selectedYear) {
      const monthName = months.find(m => m.value === selectedMonth)?.label;
      return `${selectedDay} ${monthName} ${selectedYear}`;
    }
    return placeholder;
  };

  const renderPicker = (
    items: (number | { value: number; label: string })[],
    selectedValue: number | null,
    onSelect: (value: number) => void,
    label: string
  ) => (
    <View style={styles.pickerColumn}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <ScrollView style={styles.pickerScrollView} showsVerticalScrollIndicator={false}>
        {items.map((item, index) => {
          const value = typeof item === 'number' ? item : item.value;
          const displayText = typeof item === 'number' ? item.toString() : item.label;
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.pickerItem,
                selectedValue === value && styles.pickerItemSelected
              ]}
              onPress={() => onSelect(value)}
            >
              <Text style={[
                styles.pickerItemText,
                selectedValue === value && styles.pickerItemTextSelected
              ]}>
                {displayText}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Label */}
      <View style={styles.labelContainer}>
        <Text style={styles.label}>
          {required && <Text style={styles.required}>*</Text>}
          {label}
        </Text>
      </View>

      {/* Input Field */}
      <TouchableOpacity
        style={[
          styles.inputContainer,
          error && styles.inputContainerError
        ]}
        onPress={() => setIsModalVisible(true)}
      >
        <Text style={[
          styles.inputText,
          !selectedDay && styles.placeholderText
        ]}>
          {getDisplayValue()}
        </Text>
        <View style={styles.dropdownIcon}>
          <Text style={styles.dropdownIconText}>▼</Text>
        </View>
      </TouchableOpacity>

      {/* Error Message */}
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {/* Modal */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>اختر التاريخ</Text>
            </View>

            <View style={styles.pickerContainer}>
              {renderPicker(days, selectedDay, setSelectedDay, 'اليوم')}
              {renderPicker(months, selectedMonth, setSelectedMonth, 'الشهر')}
              {renderPicker(years, selectedYear, setSelectedYear, 'السنة')}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={handleCancel}
              >
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.confirmButton,
                  (!selectedDay || !selectedMonth || !selectedYear) && styles.confirmButtonDisabled
                ]}
                onPress={handleConfirm}
                disabled={!selectedDay || !selectedMonth || !selectedYear}
              >
                <Text style={[
                  styles.confirmButtonText,
                  (!selectedDay || !selectedMonth || !selectedYear) && styles.confirmButtonTextDisabled
                ]}>
                  تأكيد
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelContainer: {
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  required: {
    color: Colors.error,
    marginRight: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 50,
  },
  inputContainerError: {
    borderColor: Colors.error,
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  placeholderText: {
    color: Colors.textLight,
  },
  dropdownIcon: {
    marginLeft: 8,
    padding: 4,
  },
  dropdownIconText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    marginTop: 4,
    textAlign: 'right',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    width: width * 0.9,
    maxHeight: '80%',
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 102, 241, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  pickerContainer: {
    flexDirection: 'row',
    padding: 20,
    maxHeight: 300,
  },
  pickerColumn: {
    flex: 1,
    marginHorizontal: 8,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  pickerScrollView: {
    maxHeight: 200,
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.1)',
  },
  pickerItemSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pickerItemText: {
    fontSize: 16,
    color: Colors.textPrimary,
    textAlign: 'center',
    fontWeight: '500',
  },
  pickerItemTextSelected: {
    color: Colors.white,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(99, 102, 241, 0.1)',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
  },
  confirmButtonDisabled: {
    backgroundColor: Colors.textLight,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  confirmButtonTextDisabled: {
    color: Colors.textSecondary,
  },
});

export default DatePicker;
