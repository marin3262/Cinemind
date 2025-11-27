import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMoviesByApi, Movie } from '@/utils/api';
import PosterCard from '@/components/PosterCard';
import MovieModal from '@/components/MovieModal';
import { useMovieModal } from '@/hooks/useMovieModal';

const MovieListScreen = () => {
  const { title, apiUrl } = useLocalSearchParams<{ title: string; apiUrl: string }>();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // 화면 너비 계산
  const screenWidth = Dimensions.get('window').width;
  const numColumns = 3;
  const horizontalPadding = 16; // listContainer의 좌우 패딩 합
  const cardMargin = 8; // 각 카드 사이의 여백
  const posterWidth = (screenWidth - horizontalPadding * 2 - cardMargin * (numColumns - 1)) / numColumns;


  const {
    modalVisible,
    selectedMovie,
    isDetailLoading,
    handleMoviePress,
    handleCloseModal,
    handleSaveRating,
    handleToggleLike,
  } = useMovieModal();

  const fetchMovies = useCallback(async () => {
    if (loading || !hasMore || !apiUrl) return;

    setLoading(true);
    try {
      const newMovies = await getMoviesByApi(apiUrl, page);
      if (newMovies.length > 0) {
        setMovies((prevMovies) => [...prevMovies, ...newMovies]);
        setPage((prevPage) => prevPage + 1);
      } else {
        setHasMore(false);
      } 
    } catch (error) {
      console.error('Failed to fetch movies:', error);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, page, loading, hasMore, screenWidth]); // screenWidth 의존성 추가

  useEffect(() => {
    fetchMovies();
  }, []);

  const renderFooter = () => {
    if (!loading) return null;
    return <ActivityIndicator style={{ marginVertical: 20 }} size="large" />;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>{title}</Text>
      <FlatList
        data={movies}
        renderItem={({ item }) => (
          <View style={{ width: posterWidth + cardMargin, marginBottom: cardMargin }}>
            <PosterCard 
              movie={item} 
              onPress={() => handleMoviePress(item, 'tmdb')} 
              style={{ width: posterWidth, height: posterWidth * 1.5 }} // 포스터 비율 유지
            />
          </View>
        )}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        numColumns={numColumns}
        contentContainerStyle={styles.listContainer}
        onEndReached={fetchMovies}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            {!loading && <Text style={styles.emptyText}>영화를 찾을 수 없습니다.</Text>}
          </View>
        )}
      />
      <MovieModal
        visible={modalVisible}
        onClose={handleCloseModal}
        movie={selectedMovie}
        isDetailLoading={isDetailLoading}
        onSaveRating={handleSaveRating}
        onToggleLike={handleToggleLike}
      />
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listContainer: {
    paddingHorizontal: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
  },
});

export default MovieListScreen;
