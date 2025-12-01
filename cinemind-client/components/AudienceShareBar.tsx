// components/AudienceShareBar.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';

interface AudienceShareBarProps {
  championAudience: number;
  challengerAudience: number;
}

const AudienceShareBar: React.FC<AudienceShareBarProps> = ({ championAudience, challengerAudience }) => {
  const totalAudience = championAudience + challengerAudience;

  if (totalAudience === 0) {
    return null; // Don't render if there's no audience data
  }

  const championPercentage = (championAudience / totalAudience) * 100;
  const challengerPercentage = 100 - championPercentage;

  return (
    <View style={styles.container}>
        <Text style={styles.title}>일일 관객 점유율</Text>
        <View style={styles.barContainer}>
            <View style={[styles.koreanBar, { width: `${championPercentage}%` }]}>
                <Text style={styles.barText}>{`${Math.round(championPercentage)}%`}</Text>
            </View>
            <View style={[styles.foreignBar, { width: `${challengerPercentage}%` }]}>
                <Text style={styles.barText}>{`${Math.round(challengerPercentage)}%`}</Text>
            </View>
        </View>
        <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: Colors.light.primary }]} />
                <Text style={styles.legendText}>1위</Text>
            </View>
            <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: Colors.light.secondary }]} />
                <Text style={styles.legendText}>2위</Text>
            </View>
        </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 16,
  },
  barContainer: {
    flexDirection: 'row',
    height: 30,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
  },
  koreanBar: {
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  foreignBar: {
    backgroundColor: Colors.light.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
});

export default AudienceShareBar;
