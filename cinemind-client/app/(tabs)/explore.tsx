import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, SafeAreaView, View, ActivityIndicator, Text, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import MovieCarousel from '@/components/MovieCarousel';
import API_BASE_URL from '@/constants/config';
import { Colors } from '@/constants/theme';
import MovieModal from '@/components/MovieModal';
import { authenticatedFetch } from '@/utils/api';

interface Carousel {
  title: string;
  apiUrl: string;
  movies: any[];
}

export default function ExploreScreen() {
  const router = useRouter();
  const [carousels, setCarousels] = useState<Carousel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<any | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  useEffect(() => {
    const fetchAllCarousels = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const genresRes = await authenticatedFetch(`${API_BASE_URL}/genres`);
        if (!genresRes.ok) throw new Error('장르 목록을 불러오는 데 실패했습니다.');
        const allGenres = await genresRes.json();

        const genresToShow = ['액션', '코미디', '로맨스', 'SF'];
        const selectedGenres = allGenres.filter((g: any) => genresToShow.includes(g.name));

        const endpoints = [
          { title: '새로운 발견', apiUrl: '/movies/all-random' },
          { title: '요즘 뜨는 영화', apiUrl: '/movies/trending' },
          { title: '현재 상영중인 영화', apiUrl: '/movies/now_playing' },
          { title: '평점 높은 명작', apiUrl: '/movies/top_rated' },
          ...selectedGenres.map((g: any) => ({ title: g.name, apiUrl: `/movies/genre/${g.id}` }))
        ];

        const responses = await Promise.all(endpoints.map(ep => authenticatedFetch(`${API_BASE_URL}${ep.apiUrl}`)));

        if (responses.some(res => !res.ok)) {
          throw new Error('하나 이상의 영화 목록을 불러오는 데 실패했습니다.');
        }

        const allMovieLists = await Promise.all(responses.map(res => res.json()));

        const newCarousels = endpoints.map((ep, index) => ({
          ...ep,
          movies: allMovieLists[index],
        }));

        setCarousels(newCarousels);

      } catch (e: any) {
        console.error('Caught an error during fetch:', e);
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllCarousels();
  }, []);

  const handleSeeMore = (title: string, apiUrl: string) => {
    router.push({
      pathname: '/movie-list',
      params: { title, apiUrl },
    });
  };

  const handleMoviePress = async (movie: any) => {
    setModalVisible(true);
    setSelectedMovie({ ...movie, id: String(movie.id) });
    setIsDetailLoading(true);
    try {
      const movieId = String(movie.id);
      const detailsResponse = await authenticatedFetch(`${API_BASE_URL}/movies/${movieId}`);

      if (!detailsResponse.ok) {
        throw new Error('상세 정보를 불러오는 데 실패했습니다.');
      }
      const details = await detailsResponse.json();
      
      setSelectedMovie((prevMovie: any) => ({ 
        ...prevMovie, 
        ...details,
      }));
    } catch (e: any) {
      console.error("Error in handleMoviePress (Explore):", e);
      setSelectedMovie((prevMovie: any) => ({
        ...prevMovie,
        error: '상세 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
      }));
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedMovie(null);
  };

  const handleSaveRating = async (movieId: string | number, rating: number, comment: string | null) => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/ratings`, {
        method: 'POST',
        body: JSON.stringify({ movie_id: String(movieId), rating, comment }),
      });
       if (!response.ok) {
          throw new Error('평점 저장에 실패했습니다.');
      }
      setSelectedMovie((prev: any) => ({ ...prev, user_rating: rating, comment: comment }));
      Alert.alert("성공", "평점이 저장되었습니다.");
    } catch (e: any) {
      Alert.alert("오류", e.message);
      console.error(e);
    }
  };

  const handleToggleLike = async (movieId: string | number, isLiked: boolean) => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/movies/${movieId}/like`, {
        method: isLiked ? 'POST' : 'DELETE',
      });
      if (!response.ok) {
        throw new Error('찜하기 상태 변경에 실패했습니다.');
      }
      setSelectedMovie((prev: any) => ({ ...prev, is_liked: isLiked }));
    } catch (e: any) {
      Alert.alert("오류", e.message);
      console.error(e);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text>콘텐츠를 불러오는 중...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>오류: {error}</Text>
        <Text>데이터 로딩에 실패했습니다.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>둘러보기</Text>
        </View>
        {carousels.map((carousel, index) => (
          carousel.movies.length > 0 && (
            <View key={index} style={styles.carouselContainer}>
              <View style={styles.carouselHeader}>
                <Text style={styles.carouselTitle}>{carousel.title}</Text>
                <TouchableOpacity onPress={() => handleSeeMore(carousel.title, carousel.apiUrl)}>
                  <Text style={styles.seeMoreText}>더보기</Text>
                </TouchableOpacity>
              </View>
              <MovieCarousel 
                movies={carousel.movies}
                onMoviePress={handleMoviePress}
              />
            </View>
          )
        ))}
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
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    marginBottom: 8,
  },
  carouselContainer: {
    marginBottom: 24,
  },
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
