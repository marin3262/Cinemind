import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { Colors } from '@/constants/theme';
import MovieCard from '@/components/MovieCard';
import API_BASE_URL from '@/constants/config';
import MovieModal from '@/components/MovieModal';
import { authenticatedFetch } from '@/utils/api';

const screenWidth = Dimensions.get('window').width;

const chartConfig = {
  backgroundGradientFrom: Colors.light.card,
  backgroundGradientTo: Colors.light.card,
  color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.8,
  useShadowColorFromDataset: false,
  decimalPlaces: 0,
  propsForLabels: {
      fontSize: 12,
      fontWeight: '500',
      fill: Colors.light.textSecondary,
  },
};

export default function HomeScreen() {
  const [movies, setMovies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<any | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  useEffect(() => {
    const fetchBoxOffice = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/movies/box-office`);
        if (!response.ok) {
          throw new Error('서버에서 데이터를 가져오는 데 실패했습니다.');
        }
        const data = await response.json();
        setMovies(data);
      } catch (e: any) {
        setError(e.message);
        Alert.alert('오류', e.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBoxOffice();
  }, []);

  const handleMoviePress = async (movie: any) => {
    setModalVisible(true);
    setSelectedMovie(movie);
    setIsDetailLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/movies/${movie.id}`);
      if (!response.ok) {
        throw new Error('상세 정보를 불러오는 데 실패했습니다.');
      }
      const details = await response.json();
      setSelectedMovie((prevMovie: any) => ({ ...prevMovie, ...details }));
    } catch (e: any) {
      Alert.alert('오류', e.message);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedMovie(null);
  };

  const handleSaveRating = async (movieId: string, rating: number) => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/ratings`, {
        method: 'POST',
        body: JSON.stringify({
          movie_id: movieId,
          rating: rating,
        }),
      });
       if (!response.ok) {
          throw new Error('평점 저장에 실패했습니다.');
      }
      Alert.alert("성공", "평점이 저장되었습니다.");
    } catch (e: any) {
      Alert.alert("오류", e.message);
      console.error(e);
    }
  };

  const topMovies = movies.slice(0, 3);
  const chartData = {
    labels: topMovies.map(m => m.title),
    datasets: [
      {
        data: topMovies.map(m => m.audience / 10000),
      },
    ],
  };

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
        <Text>오류: {error}</Text>
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

        {topMovies.length > 0 && (
            <View style={styles.chartSection}>
                <Text style={styles.sectionTitle}>TOP 3 누적 관객 수 비교</Text>
                <BarChart
                    data={chartData}
                    width={screenWidth - 32}
                    height={250}
                    chartConfig={chartConfig}
                    fromZero
                    showValuesOnTopOfBars
                    yAxisLabel=""
                    yAxisSuffix="만"
                    style={styles.chart}
                />
            </View>
        )}

        <View style={styles.listSection}>
            {movies.map(movie => (
                <MovieCard key={movie.id} movie={movie} onPress={() => handleMoviePress(movie)} />
            ))}
        </View>
      </ScrollView>
      <MovieModal 
        visible={modalVisible} 
        onClose={handleCloseModal} 
        movie={selectedMovie} 
        isDetailLoading={isDetailLoading} 
        onSaveRating={handleSaveRating}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F3F4F6' },
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: Colors.light.text },
  subtitle: { fontSize: 16, color: Colors.light.textSecondary, marginTop: 8 },
  chartSection: { alignItems: 'center', backgroundColor: Colors.light.card, borderRadius: 12, marginHorizontal: 16, paddingVertical: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, color: Colors.light.text },
  chart: { borderRadius: 12 },
  listSection: { paddingHorizontal: 16 }
});