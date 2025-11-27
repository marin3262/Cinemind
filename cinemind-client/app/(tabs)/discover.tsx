import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, ScrollView, SafeAreaView, View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import MovieCarousel from '@/components/MovieCarousel';
import API_BASE_URL from '@/constants/config';
import { Colors } from '@/constants/theme';
import MovieModal from '@/components/MovieModal';
import { authenticatedFetch } from '@/utils/api';
import { useMovieModal } from '@/hooks/useMovieModal';

interface Carousel {
  title: string;
  apiUrl: string;
  movies: any[];
}

const VALID_CAROUSELS = [
  { title: '요즘 뜨는 영화', apiUrl: '/movies/trending' },
  { title: '평점 높은 명작', apiUrl: '/movies/top_rated' },
];

const FullScreenState = ({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void; }) => (
  <View style={styles.center}>
    <FontAwesome name={title === '오류' ? 'exclamation-circle' : 'film'} size={40} color={Colors.light.textSecondary} />
    <Text style={styles.stateTitle}>{title}</Text>
    <Text style={styles.stateMessage}>{message}</Text>
    {onRetry && (
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryButtonText}>다시 시도</Text>
      </TouchableOpacity>
    )}
  </View>
);

export default function DiscoverScreen() {
  const router = useRouter();
  const [carousels, setCarousels] = useState<Carousel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    modalVisible,
    selectedMovie,
    isDetailLoading,
    handleMoviePress,
    handleCloseModal,
    handleSaveRating,
    handleToggleLike,
  } = useMovieModal();

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const genresRes = await authenticatedFetch(`${API_BASE_URL}/genres`);
      if (!genresRes.ok) throw new Error('장르 목록을 불러오는 데 실패했습니다.');
      const allGenres = await genresRes.json();
      
      const genresToShow = ['액션', '코미디', '로맨스', 'SF', '스릴러'];
      const selectedGenres = allGenres.filter((g: any) => genresToShow.includes(g.name));

      const carouselEndpoints = [
        ...VALID_CAROUSELS,
        ...selectedGenres.map((g: any) => ({ title: `${g.name} 영화`, apiUrl: `/movies/genre/${g.id}` }))
      ];

      const responses = await Promise.all(carouselEndpoints.map(ep => authenticatedFetch(`${API_BASE_URL}${ep.apiUrl}`)));
      const allMovieLists = await Promise.all(responses.map(res => res.ok ? res.json() : []));
      
      const newCarousels = carouselEndpoints.map((ep, index) => ({
        ...ep,
        movies: allMovieLists[index] || [],
      })).filter(c => c.movies.length > 0);

      setCarousels(newCarousels);

    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleSeeMore = (title: string, apiUrl: string) => {
    router.push({ pathname: '/movie-list', params: { title, apiUrl } });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>둘러보기</Text>
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
            <Text style={styles.stateMessage}>콘텐츠를 불러오는 중...</Text>
          </View>
        ) : error ? (
          <FullScreenState title="오류" message={error} onRetry={fetchAllData} />
        ) : carousels.length === 0 ? (
          <FullScreenState title="콘텐츠 없음" message="표시할 영화 정보가 없습니다." onRetry={fetchAllData} />
        ) : (
          carousels.map((carousel, index) => (
            <View key={index} style={styles.carouselContainer}>
              <View style={styles.carouselHeader}>
                <Text style={styles.carouselTitle}>{carousel.title}</Text>
                <TouchableOpacity onPress={() => handleSeeMore(carousel.title, carousel.apiUrl)}>
                  <Text style={styles.seeMoreText}>더보기</Text>
                </TouchableOpacity>
              </View>
              <MovieCarousel 
                movies={carousel.movies}
                onMoviePress={(movie) => handleMoviePress(movie, 'tmdb')}
              />
            </View>
          ))
        )}
      </ScrollView>
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
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'white' },
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: Colors.light.text },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  stateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginTop: 16,
  },
  stateMessage: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  carouselContainer: { marginBottom: 24 },
  carouselHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  carouselTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  seeMoreText: {
    fontSize: 14,
    color: Colors.light.primary,
    fontWeight: '600',
  },
});