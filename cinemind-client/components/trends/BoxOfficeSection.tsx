import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/theme';
import TopThreeChart from '@/components/TopThreeChart';
import MovieCard from '@/components/MovieCard';

const EmptyStateCard = ({ message }: { message: string }) => (
    <View style={styles.noDataCard}>
        <Text style={styles.noDataText}>{message}</Text>
    </View>
);

const BoxOfficeSection = ({ 
    boxOfficeMovies, 
    topMovies, 
    maxAudience, 
    sortBy, 
    setSortBy, 
    handleMoviePress 
}) => {
    return (
        <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>주간 박스오피스</Text>
            <View style={styles.toggleContainer}>
                <TouchableOpacity
                    style={[styles.toggleButton, sortBy === 'audience' && styles.toggleButtonActive]}
                    onPress={() => setSortBy('audience')}
                >
                    <Text style={[styles.toggleButtonText, sortBy === 'audience' && styles.toggleButtonTextActive]}>누적 순위</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.toggleButton, sortBy === 'rank' && styles.toggleButtonActive]}
                    onPress={() => setSortBy('rank')}
                >
                    <Text style={[styles.toggleButtonText, sortBy === 'rank' && styles.toggleButtonTextActive]}>일별 순위</Text>
                </TouchableOpacity>
            </View>
            
            {boxOfficeMovies.length > 0 ? (
                <>
                    <TopThreeChart 
                        topMovies={topMovies}
                        maxAudience={maxAudience}
                        sortBy={sortBy}
                        onMoviePress={(movie) => handleMoviePress(movie, 'kobis')}
                    />
                    <View style={styles.listSection}>
                        {boxOfficeMovies.map((movie, index) => (
                            <MovieCard 
                              key={movie.id} 
                              movie={movie} 
                              onPress={() => handleMoviePress(movie, 'kobis')}
                              displayRank={sortBy === 'rank' ? movie.rank : index + 1}
                              displayAudience={sortBy === 'rank' ? movie.daily_audience : movie.audience}
                              audienceLabel={sortBy === 'rank' ? '일일' : '누적'}
                            />
                        ))}
                    </View>
                </>
            ) : (
                <EmptyStateCard message="박스오피스 정보를 불러올 수 없습니다." />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    sectionContainer: { marginBottom: 40 },
    sectionTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.light.text, marginBottom: 4, paddingHorizontal: 16 },
    noDataCard: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 20,
        marginHorizontal: 16,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 100,
    },
    noDataText: { color: Colors.light.textSecondary, fontSize: 14, textAlign: 'center' },
    toggleContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    toggleButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        marginRight: 12,
    },
    toggleButtonActive: {
        backgroundColor: Colors.light.text,
        borderColor: Colors.light.text,
    },
    toggleButtonText: {
        color: '#374151',
        fontWeight: '600',
    },
    toggleButtonTextActive: {
        color: '#FFFFFF',
    },
    listSection: { 
        paddingHorizontal: 16 
    },
});

export default React.memo(BoxOfficeSection);
