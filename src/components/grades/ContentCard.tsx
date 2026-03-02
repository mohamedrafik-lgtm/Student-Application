// SOLID Principles Applied:
// 1. Single Responsibility: This component only displays content information
// 2. Open/Closed: Can be extended with new props without modification
// 3. Interface Segregation: Uses specific props interface

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ContentWithGrades, GradeType, GRADE_TYPE_INFO } from '../../types/grades';
import { getGradeColor, getGradeStatus, formatGrade, calculatePercentage } from '../../utils/gradesUtils';
import { Colors } from '../../styles/colors';

interface ContentCardProps {
  content: ContentWithGrades;
  isExpanded: boolean;
  onToggle: () => void;
}

const ContentCard: React.FC<ContentCardProps> = ({ content, isExpanded, onToggle }) => {
  const renderGradeBreakdown = () => {
    const gradeTypes = [
      GradeType.YEAR_WORK,
      GradeType.PRACTICAL,
      GradeType.WRITTEN,
      GradeType.ATTENDANCE,
      GradeType.QUIZZES,
      GradeType.FINAL_EXAM,
    ];

    return (
      <View style={styles.breakdown}>
        <Text style={styles.breakdownTitle}>تفاصيل الدرجات:</Text>
        {gradeTypes.map((gradeType) => {
          const typeInfo = GRADE_TYPE_INFO[gradeType];
          const earned = content.grades[gradeType];
          const max = content.maxMarks[gradeType];
          const percentage = calculatePercentage(earned, max);

          return (
            <View key={gradeType} style={styles.gradeTypeRow}>
              <View style={styles.gradeTypeInfo}>
                <Text style={styles.gradeTypeIcon}>{typeInfo.icon}</Text>
                <Text style={styles.gradeTypeLabel}>{typeInfo.labelAr}</Text>
              </View>
              <View style={styles.gradeTypeValues}>
                <Text style={styles.gradeTypeMarks}>
                  {formatGrade(earned, max)}
                </Text>
                <Text style={[
                  styles.gradeTypePercentage,
                  { color: getGradeColor(percentage) }
                ]}>
                  {percentage.toFixed(1)}%
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      {/* Content Header */}
      <View style={styles.header}>
        <View style={styles.info}>
          <Text style={styles.code}>{content.content.code}</Text>
          <Text style={styles.name}>{content.content.name}</Text>
        </View>
        <View style={styles.grade}>
          <Text style={[
            styles.percentage,
            { color: getGradeColor(content.percentage) }
          ]}>
            {content.percentage.toFixed(1)}%
          </Text>
          <Text style={styles.total}>
            {formatGrade(content.grades.totalMarks, content.maxMarks.total)}
          </Text>
        </View>
      </View>

      {/* Grade Status */}
      <View style={styles.statusContainer}>
        <View style={[
          styles.statusBadge,
          { backgroundColor: getGradeColor(content.percentage) + '20' }
        ]}>
          <Text style={[
            styles.statusText,
            { color: getGradeColor(content.percentage) }
          ]}>
            {getGradeStatus(content.percentage)}
          </Text>
        </View>
        <Text style={styles.expandIcon}>
          {isExpanded ? '▲' : '▼'}
        </Text>
      </View>

      {/* Expanded Details */}
      {isExpanded && renderGradeBreakdown()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  code: {
    fontSize: 13,
    color: Colors.textLight,
    marginBottom: 4,
    textAlign: 'right',
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  grade: {
    alignItems: 'flex-end',
  },
  percentage: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  total: {
    fontSize: 13,
    color: Colors.textLight,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  expandIcon: {
    fontSize: 14,
    color: Colors.textLight,
  },
  breakdown: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
    textAlign: 'right',
  },
  gradeTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  gradeTypeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  gradeTypeIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  gradeTypeLabel: {
    fontSize: 13,
    color: Colors.textPrimary,
  },
  gradeTypeValues: {
    alignItems: 'flex-end',
  },
  gradeTypeMarks: {
    fontSize: 13,
    color: Colors.textLight,
    marginBottom: 2,
  },
  gradeTypePercentage: {
    fontSize: 12,
    fontWeight: '700',
  },
});

export default ContentCard;
