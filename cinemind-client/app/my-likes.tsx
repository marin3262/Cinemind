import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { authenticatedFetch } from '@/utils/api';
import API_BASE_URL from '@/constants/config';
import { Image } from 'expo-image';
import { FontAwesome } from '@expo/vector-icons';
import MovieModal from '@/components/MovieModal';
import { useMovieModal } from '@/hooks/useMovieModal'; // Import the custom hook

type LikedMovie = {
    movie_id: string;
    title: string;
    poster_url: string | null;
};

export default function MyLikesScreen() {
    const [likedMovies, setLikedMovies] = useState<LikedMovie[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);

    const fetchLikedMovies = useCallback(async () => {
        if (!refreshing) setIsLoading(true);
        setError(null);
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/users/me/likes`);
            if (!response.ok) {
                throw new Error('찜한 영화 목록을 불러오는 데 실패했습니다.');
            }
            const data: LikedMovie[] = await response.json();
            setLikedMovies(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [refreshing]);

    useFocusEffect(
        useCallback(() => {
            fetchLikedMovies();
        }, [fetchLikedMovies])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
    }, []);

    const handleToggleLike = async (movieId: string | number, isLiked: boolean) => {
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/movies/${movieId}/like`, {
                method: isLiked ? 'POST' : 'DELETE',
            });
            if (!response.ok) throw new Error('찜하기 상태 변경에 실패했습니다.');
            
            // If unliked, remove from the list optimistically
            if (!isLiked) {
                setLikedMovies(prev => prev.filter(m => m.movie_id !== movieId));
            }
            handleCloseModal();

        } catch (e: any) {
            Alert.alert("오류", e.message);
        }
    };

    // Use the custom hook for all modal logic
    const { 
        modalVisible, 
        selectedMovie, 
        isDetailLoading, 
        handleMoviePress, 
        handleCloseModal, 
        handleSaveRating 
    } = useMovieModal({
        onRatingSaved: () => {} // This page doesn't need to refetch on rating
    });

    const renderContent = () => {
        if (isLoading) {
            return <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 50 }} />;
        }
        if (error) {
            return <Text style={styles.infoText}>{error}</Text>;
        }
        if (likedMovies.length === 0) {
            return <Text style={styles.infoText}>아직 찜한 영화가 없습니다.</Text>;
        }

        return (
            <View style={styles.movieGrid}>
                {likedMovies.map(movie => (
                    <TouchableOpacity 
                        key={movie.movie_id} 
                        style={styles.movieCard} 
                        onPress={() => handleMoviePress({ id: movie.movie_id, ...movie })}
                    >
                        <Image source={{ uri: movie.poster_url || undefined }} style={styles.posterImage} />
                        <Text style={styles.movieTitle} numberOfLines={2}>{movie.title}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="arrow-left" size={24} color={Colors.light.text} />
                </TouchableOpacity>
                <Text style={styles.title}>찜한 영화</Text>
            </View>
            <ScrollView 
                style={styles.container}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
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
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: 'white' },
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    backButton: { marginRight: 16, padding: 4 },
    title: { fontSize: 24, fontWeight: 'bold', color: Colors.light.text },
    infoText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: Colors.light.textSecondary },
    movieGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 4 },
    movieCard: { width: '33.333%', padding: 4 },
    posterImage: { width: '100%', aspectRatio: 2/3, borderRadius: 8, backgroundColor: '#E5E7EB' },
    movieTitle: { fontSize: 12, marginTop: 4, textAlign: 'center' },
});