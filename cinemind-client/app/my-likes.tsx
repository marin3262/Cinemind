import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, Stack } from 'expo-router';
import { Colors } from '@/constants/theme';
import { authenticatedFetch } from '@/utils/api';
import API_BASE_URL from '@/constants/config';
import MovieModal from '@/components/MovieModal';
import { useMovieModal } from '@/hooks/useMovieModal';
import LikedMovieListItem from '@/components/LikedMovieListItem'; // Import the new component

export type LikedMovie = {
    movie_id: string;
    title: string;
    poster_url: string | null;
    created_at: string; // From datetime to string
};

export default function MyLikesScreen() {
    const [likedMovies, setLikedMovies] = useState<LikedMovie[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
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
        fetchLikedMovies();
    }, [fetchLikedMovies]);

    const handleToggleLikeInModal = async (movieId: string | number, isLiked: boolean) => {
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

    const { 
        modalVisible, 
        selectedMovie, 
        isDetailLoading, 
        handleMoviePress, 
        handleCloseModal, 
        handleSaveRating 
    } = useMovieModal({
        onRatingSaved: () => {}
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
            <FlatList
                data={likedMovies}
                keyExtractor={(item) => item.movie_id}
                renderItem={({ item }) => (
                    <LikedMovieListItem 
                        movie={item} 
                        onPress={() => handleMoviePress({ id: item.movie_id, ...item })}
                    />
                )}
                contentContainerStyle={styles.listContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            />
        );
    };

    return (
        <>
            <Stack.Screen options={{ title: '찜한 영화', headerBackTitle: '뒤로가기' }} />
            <SafeAreaView style={styles.safeArea}>
                {renderContent()}
                {selectedMovie && (
                    <MovieModal 
                        visible={modalVisible} 
                        onClose={handleCloseModal} 
                        movie={selectedMovie} 
                        isDetailLoading={isDetailLoading} 
                        onSaveRating={handleSaveRating}
                        onToggleLike={handleToggleLikeInModal}
                    />
                )}
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: 'white' },
    listContainer: {
        paddingVertical: 8,
    },
    infoText: { 
        textAlign: 'center', 
        marginTop: 50, 
        fontSize: 16, 
        color: Colors.light.textSecondary 
    },
});