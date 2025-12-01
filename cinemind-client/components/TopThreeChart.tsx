import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/theme';

const TopThreeChart = ({ topMovies, maxAudience, sortBy, onMoviePress }) => {
    const chartColors = ['#F59E0B', '#FBBF24', '#FCD34D']; // amber-500, amber-400, amber-300

    return (
        <View style={styles.chartSection}>
            <Text style={styles.chartSectionTitle}>
              TOP 3 {sortBy === 'rank' ? '일별 관객수' : '누적 관객수'}
            </Text>
            <View style={styles.interactiveChartContainer}>
              {topMovies.map((movie, index) => {
                const audienceToShow = sortBy === 'rank' ? movie.daily_audience : movie.audience;
                const audience = Number(audienceToShow) || 0;
                const barWidth = maxAudience > 0 ? (audience / maxAudience) * 100 : 0;

                return (
                  <TouchableOpacity key={movie.id} style={styles.chartRow} onPress={() => onMoviePress(movie)}>
                    <Text style={styles.chartRank}>{movie.rank}</Text>
                    <View style={styles.chartContent}>
                      <View style={styles.chartTextRow}>
                        <Text style={styles.chartTitle} numberOfLines={1}>{movie.title || '제목 없음'}</Text>
                        <Text style={styles.chartAudience}>{Math.round(audience / 10000).toLocaleString()}만 명</Text>
                      </View>
                      <View style={styles.bar}>
                        <View style={[styles.barFill, { width: `${barWidth}%`, backgroundColor: chartColors[index] }]} />
                      </View>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    chartSection: { 
        backgroundColor: 'white', 
        borderRadius: 12, 
        marginHorizontal: 16, 
        padding: 20, 
        marginBottom: 24, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 2 }, 
        shadowOpacity: 0.1, 
        shadowRadius: 5, 
        elevation: 4 
    },
    chartSectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.light.text,
        marginBottom: 20,
    },
    interactiveChartContainer: {
        width: '100%',
    },
    chartRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 18,
    },
    chartRank: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.light.textSecondary,
        width: 30,
        marginRight: 12,
    },
    chartContent: {
        flex: 1,
    },
    chartTextRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 6,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.light.text,
        flexShrink: 1,
        marginRight: 8,
    },
    bar: {
        height: 22,
        backgroundColor: '#F3F4F6', // A light gray for the bar background
        borderRadius: 6,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: 6,
    },
    chartAudience: {
        fontSize: 13,
        color: Colors.light.textSecondary,
        fontWeight: '500',
    },
});

export default TopThreeChart;
