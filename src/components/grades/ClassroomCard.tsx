// SOLID Principles Applied:
// 1. Single Responsibility: This component only displays classroom information
// 2. Open/Closed: Can be extended with new props without modification
// 3. Interface Segregation: Uses specific props interface

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { ClassroomWithContents } from '../../types/grades';
import { getGradeColor, formatGrade, formatPercentage } from '../../utils/gradesUtils';
import ContentCard from './ContentCard';

interface ClassroomCardProps {
  classroomData: ClassroomWithContents;
  expandedClassroom: number | null;
  expandedContent: number | null;
  onToggleClassroom: (classroomId: number) => void;
  onToggleContent: (contentId: number) => void;
  fadeAnim: Animated.Value;
}

const ClassroomCard: React.FC<ClassroomCardProps> = ({
  classroomData,
  expandedClassroom,
  expandedContent,
  onToggleClassroom,
  onToggleContent,
  fadeAnim,
}) => {
  const isExpanded = expandedClassroom === classroomData.classroom.id;

  return (
    <View style={styles.container}>
      {/* Classroom Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => onToggleClassroom(classroomData.classroom.id)}
        activeOpacity={0.7}
      >
        <View style={styles.info}>
          <Text style={styles.name}>
            {classroomData.classroom.name}
          </Text>
          <Text style={styles.stats}>
            {classroomData.stats.contentCount} مادة • {formatPercentage(classroomData.stats.percentage)}
          </Text>
        </View>
        <View style={styles.grade}>
          <Text style={[
            styles.percentage,
            { color: getGradeColor(classroomData.stats.percentage) }
          ]}>
            {formatPercentage(classroomData.stats.percentage)}
          </Text>
          <Text style={styles.total}>
            {formatGrade(classroomData.stats.totalEarned, classroomData.stats.totalMax)}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Classroom Contents */}
      {isExpanded && (
        <Animated.View style={[
          styles.contents,
          { opacity: fadeAnim }
        ]}>
          {classroomData.contents.map((content) => (
            <ContentCard
              key={content.content.id}
              content={content}
              isExpanded={expandedContent === content.content.id}
              onToggle={() => onToggleContent(content.content.id)}
            />
          ))}
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  stats: {
    fontSize: 14,
    color: '#6B7280',
  },
  grade: {
    alignItems: 'flex-end',
  },
  percentage: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  total: {
    fontSize: 14,
    color: '#6B7280',
  },
  contents: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
  },
});

export default ClassroomCard;
