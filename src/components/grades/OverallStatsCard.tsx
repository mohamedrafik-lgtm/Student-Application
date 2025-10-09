// SOLID Principles Applied:
// 1. Single Responsibility: This component only displays overall statistics
// 2. Open/Closed: Can be extended with new props without modification
// 3. Interface Segregation: Uses specific props interface

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { OverallStats, Trainee } from '../../types/grades';
import { getGradeColor, getGradeStatus, formatGrade, formatPercentage } from '../../utils/gradesUtils';

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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  traineeName: {
    fontSize: 16,
    color: '#6B7280',
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
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  statusBadge: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OverallStatsCard;
