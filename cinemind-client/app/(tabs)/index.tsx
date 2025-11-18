import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, SafeAreaView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/theme';
import MovieCard from '@/components/MovieCard';
import API_BASE_URL from '@/constants/config';
import MovieModal from '@/components/MovieModal';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { authenticatedFetch } from '@/utils/api';

const screenWidth = Dimensions.get('window').width;

export default function HomeScreen() {
  const [movies, setMovies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<any | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  
  const [sortBy, setSortBy] = useState<'rank' | 'audience'>('rank');

  const router = useRouter();
  const { authState } = useAuth();

  useEffect(() => {
    const fetchBoxOffice = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/movies/box-office?sort_by=${sortBy}`);
        if (!response.ok) {
          throw new Error(`서버 응답 오류: ${response.status}`);
        }
        const data = await response.json();
        setMovies(data);
      } catch (e: any) {
        console.error('Caught an error during fetch:', e);
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (authState.authenticated) {
      fetchBoxOffice();
    }
  }, [authState.authenticated, sortBy]);

  const handleMoviePress = async (movie: any) => {
    setModalVisible(true);
    // Set basic info first, so title is always visible
    setSelectedMovie({ ...movie, error: null }); 
    setIsDetailLoading(true);
    try {
      const [detailsResponse, activityResponse] = await Promise.all([
        authenticatedFetch(`${API_BASE_URL}/movies/${movie.id}`),
        authenticatedFetch(`${API_BASE_URL}/users/me/activity-status?movie_id=${movie.id}`)
      ]);

      // Even if one fails, we might get partial data. Best to check both.
      if (!detailsResponse.ok || !activityResponse.ok) {
        throw new Error('상세 정보를 불러오는 데 실패했습니다.');
      }
      const details = await detailsResponse.json();
      const activityStatus = await activityResponse.json();
      
      setSelectedMovie((prevMovie: any) => ({ 
        ...prevMovie, 
        ...details,
        ...activityStatus, // Adds user_rating and is_liked
        error: null,
      }));
    } catch (e: any) {
      console.error("Error in handleMoviePress:", e);
      // If fetching fails, keep the modal open with an error message
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

  const handleSaveRating = async (movieId: string | number, rating: number) => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/ratings`, {
        method: 'POST',
        body: JSON.stringify({
          movie_id: String(movieId),
          rating: rating,
        }),
      });
       if (!response.ok) {
          throw new Error('평점 저장에 실패했습니다.');
      }
      // Optimistically update the UI
      setSelectedMovie((prev: any) => ({ ...prev, user_rating: rating }));
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
      // Optimistically update the UI
      setSelectedMovie((prev: any) => ({ ...prev, is_liked: isLiked }));
    } catch (e: any) {
      Alert.alert("오류", e.message);
      console.error(e);
    }
  };

  const topMovies = movies.slice(0, 3);
  const chartColors = ['#F59E0B', '#FBBF24', '#FCD34D'];
  
  const maxAudience = topMovies.length > 0 
    ? Math.max(...topMovies.map(m => Number(sortBy === 'rank' ? m.daily_audience : m.audience) || 0))
    : 0;

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text>박스오피스 정보를 불러오는 중...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 16, color: Colors.light.textSecondary, marginBottom: 8 }}>오류: {error}</Text>
        <Text style={{ fontSize: 14, color: Colors.light.textSecondary, marginBottom: 20, textAlign: 'center' }}>
          데이터 로딩에 실패했지만,{"\n"}다른 기능은 계속 테스트할 수 있습니다.
        </Text>
        <TouchableOpacity 
          style={{ backgroundColor: Colors.light.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 }}
          onPress={() => router.push('/onboarding')}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>온보딩 시작하기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
            <Text style={styles.title}>박스오피스 순위</Text>
            <Text style={styles.subtitle}>현재 극장에서 가장 인기 있는 영화들을 만나보세요.</Text>
        </View>

        <View style={styles.toggleContainer}>
            <TouchableOpacity
                style={[styles.toggleButton, sortBy === 'rank' && styles.toggleButtonActive]}
                onPress={() => setSortBy('rank')}
            >
                <Text style={[styles.toggleButtonText, sortBy === 'rank' && styles.toggleButtonTextActive]}>일별 순위</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.toggleButton, sortBy === 'audience' && styles.toggleButtonActive]}
                onPress={() => setSortBy('audience')}
            >
                <Text style={[styles.toggleButtonText, sortBy === 'audience' && styles.toggleButtonTextActive]}>누적 순위</Text>
            </TouchableOpacity>
        </View>

        {topMovies.length > 0 && (
            <View style={styles.chartSection}>
                <Text style={styles.sectionTitle}>
                  TOP 3 {sortBy === 'rank' ? '일별 관객수' : '누적 관객수'}
                </Text>
                <View style={styles.interactiveChartContainer}>
                  {topMovies.map((movie, index) => {
                    const audienceToShow = sortBy === 'rank' ? movie.daily_audience : movie.audience;
                    const audience = Number(audienceToShow) || 0;
                    const barWidth = maxAudience > 0 ? (audience / maxAudience) * 100 : 0;
                    return (
                      <TouchableOpacity key={movie.id} style={styles.chartRow} onPress={() => handleMoviePress(movie)}>
                        <Text style={styles.chartRank}>{sortBy === 'rank' ? movie.rank : index + 1}</Text>
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
        )}

        <View style={styles.listSection}>
            {movies.map((movie, index) => (
                <MovieCard 
                  key={movie.id} 
                  movie={movie} 
                  onPress={() => handleMoviePress(movie)}
                  displayRank={sortBy === 'rank' ? movie.rank : index + 1}
                  displayAudience={sortBy === 'rank' ? movie.daily_audience : movie.audience}
                  audienceLabel={sortBy === 'rank' ? '일일 관객' : '누적 관객'}
                />
            ))}
        </View>
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
  safeArea: { flex: 1, backgroundColor: '#F3F4F6' },
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  header: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: Colors.light.text },
  subtitle: { fontSize: 16, color: Colors.light.textSecondary, marginTop: 8 },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.primary,
    marginHorizontal: 8,
  },
  toggleButtonActive: {
    backgroundColor: Colors.light.primary,
  },
  toggleButtonText: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
  toggleButtonTextActive: {
    color: '#FFFFFF',
  },
  chartSection: { backgroundColor: Colors.light.card, borderRadius: 12, marginHorizontal: 16, padding: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: Colors.light.text },
  listSection: { paddingHorizontal: 16 },
  interactiveChartContainer: {
    width: '100%',
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartRank: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.textSecondary,
    width: 30,
    marginRight: 8,
  },
  chartContent: {
    flex: 1,
  },
  chartTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    flexShrink: 1,
    marginRight: 8,
  },
  bar: {
    height: 20,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  chartAudience: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
});