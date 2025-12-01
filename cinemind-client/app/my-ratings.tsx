import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter, Stack } from 'expo-router';
import { Colors } from '@/constants/theme';
import { authenticatedFetch } from '@/utils/api';
import API_BASE_URL from '@/constants/config';
import { Image } from 'expo-image';
import { FontAwesome } from '@expo/vector-icons';
import MovieModal from '@/components/MovieModal';
import { useMovieModal } from '@/hooks/useMovieModal';

type UserRatingWithMovie = {
    movie_id: string;
    title: string;
    poster_url: string | null;
    rating: number;
};

type GroupedRatings = {
    [key:number]: UserRatingWithMovie[];
};

export default function MyRatingsScreen() {
    const [groupedRatings, setGroupedRatings] = useState<GroupedRatings>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const fetchAndGroupRatings = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/users/me/ratings`);
            if (!response.ok) {
                throw new Error('평가한 영화 목록을 불러오는 데 실패했습니다.');
            }
            const data: UserRatingWithMovie[] = await response.json();

            const groups = data.reduce((acc, movie) => {
                const rating = movie.rating;
                if (!acc[rating]) {
                    acc[rating] = [];
                }
                acc[rating].push(movie);
                return acc;
            }, {} as GroupedRatings);

            setGroupedRatings(groups);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchAndGroupRatings();
        }, [fetchAndGroupRatings])
    );

    const {
        modalVisible,
        selectedMovie,
        isDetailLoading,
        handleMoviePress,
        handleCloseModal,
        handleSaveRating,
        handleToggleLike
    } = useMovieModal({
        onRatingSaved: fetchAndGroupRatings
    });

    const renderContent = () => {
        if (isLoading) {
            return <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 50 }} />;
        }
        if (error) {
            return <Text style={styles.infoText}>{error}</Text>;
        }
        
        const sortedRatingKeys = Object.keys(groupedRatings).map(Number).sort((a, b) => b - a);

        if (sortedRatingKeys.length === 0) {
            return <Text style={styles.infoText}>아직 평가한 영화가 없습니다.</Text>;
        }

        return (
            <View style={styles.contentContainer}>
                {sortedRatingKeys.map(rating => (
                    <View key={rating} style={styles.ratingSection}>
                        <View style={styles.ratingHeader}>
                            {[...Array(rating)].map((_, i) => <FontAwesome key={i} name="star" size={20} color="#FFD700" />)}
                            <Text style={styles.ratingTitle}>{rating}점 ({groupedRatings[rating].length}편)</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselContainer}>
                            {groupedRatings[rating].map(movie => (
                                <TouchableOpacity 
                                    key={movie.movie_id} 
                                    style={styles.movieCard} 
                                    onPress={() => handleMoviePress({ id: movie.movie_id, ...movie })}
                                >
                                    <Image source={{ uri: movie.poster_url || undefined }} style={styles.posterImage} />
                                    <Text style={styles.movieTitle} numberOfLines={2}>{movie.title}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                ))}
            </View>
        );
    };

    return (
        <>
            <Stack.Screen options={{ title: '내가 평가한 영화', headerBackTitle: '뒤로가기' }} />
            <SafeAreaView style={styles.safeArea}>
                <ScrollView style={styles.container}>
                    {renderContent()}
                </ScrollView>
                {selectedMovie && (
                    <MovieModal 
                        visible={modalVisible} 
                        onClose={handleCloseModal} 
                        movie={selectedMovie} 
                        isDetailLoading={isDetailLoading} 
                        onSaveRating={handleSaveRating}
                        onToggleLike={handleToggleLike}
                    />
                )}
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: 'white' },
    container: { flex: 1 },
    contentContainer: { paddingVertical: 16 },
    infoText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: Colors.light.textSecondary },
    ratingSection: { marginBottom: 32 },
    ratingHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16 },
    ratingTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 8 },
    carouselContainer: { paddingHorizontal: 16 },
    movieCard: { 
        width: 130, 
        marginRight: 12,
    },
    posterImage: { 
        width: '100%', 
        height: 130 * 1.5, // 2:3 ratio
        borderRadius: 8, 
        backgroundColor: '#E5E7EB' 
    },
    movieTitle: { 
        fontSize: 14,
        marginTop: 8,
        textAlign: 'left',
    },
});
