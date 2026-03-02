// SOLID Principles Applied:
// 1. Single Responsibility: This component only displays overall statistics
// 2. Open/Closed: Can be extended with new props without modification
// 3. Interface Segregation: Uses specific props interface

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { OverallStats, Trainee } from '../../types/grades';
import { getGradeColor, getGradeStatus, formatGrade, formatPercentage } from '../../utils/gradesUtils';
import { Colors } from '../../styles/colors';

interface OverallStatsCardProps {
  trainee: Trainee;
  overallStats: OverallStats;
}

const OverallStatsCard: React.FC<OverallStatsCardProps> = ({ trainee, overallStats }) => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>الإحصائيات العامة</Text>
        <Text style={styles.traineeName}>{trainee.nameAr}</Text>
      </View>
      
      {/* Stats Content */}
      <View style={styles.content}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {formatPercentage(overallStats.percentage)}
          </Text>
          <Text style={styles.statLabel}>النسبة الإجمالية</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {formatGrade(overallStats.totalEarned, overallStats.totalMax)}
          </Text>
          <Text style={styles.statLabel}>إجمالي الدرجات</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {overallStats.totalContents}
          </Text>
          <Text style={styles.statLabel}>عدد المواد</Text>
        </View>
      </View>

      {/* Status Badge */}
      <View style={[
        styles.statusBadge,
        { backgroundColor: getGradeColor(overallStats.percentage) + '20' }
      ]}>
        <Text style={[
          styles.statusText,
          { color: getGradeColor(overallStats.percentage) }
        ]}>
          {getGradeStatus(overallStats.percentage)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  traineeName: {
    fontSize: 15,
    color: Colors.textLight,
    fontWeight: '600',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
  },
  statusBadge: {
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '800',
  },
});

export default OverallStatsCard;
