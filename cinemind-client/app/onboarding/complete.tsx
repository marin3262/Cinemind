import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, FlatList, Image, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/theme';
import API_BASE_URL from '@/constants/config';

interface Movie {
  movie_id: number;
  title: string;
  poster_url: string;
  genre_name: string;
}

export default function OnboardingCompleteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLikedMovies = async () => {
      const { liked_ids } = params;
      if (!liked_ids || typeof liked_ids !== 'string') {
        setError("선택된 영화 정보를 찾을 수 없습니다.");
        setIsLoading(false);
        return;
      }

      try {
        const ids = JSON.parse(liked_ids);
        if (!Array.isArray(ids) || ids.length === 0) {
          setError("선택된 영화가 없습니다.");
          setIsLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/movies/details`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        });

        if (!response.ok) {
          throw new Error('영화 정보를 가져오는 데 실패했습니다.');
        }

        const data: Movie[] = await response.json();
        setMovies(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLikedMovies();
  }, [params.liked_ids]);

  const topGenres = useMemo(() => {
    if (movies.length === 0) return [];
    const genreCounts = movies.reduce((acc, movie) => {
      acc[movie.genre_name] = (acc[movie.genre_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(entry => entry[0]);
  }, [movies]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.title}>취향을 분석하고 있습니다...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>취향 분석 완료!</Text>
        <Text style={styles.subtitle}>
          {topGenres.length > 0 
            ? `주요 선호 장르는 '${topGenres.join("', '")}' 입니다.`
            : "다양한 영화를 좋아하시는군요!"}
        </Text>

        <View style={styles.movieListContainer}>
          <Text style={styles.listTitle}>선택한 영화 목록</Text>
          <FlatList
            data={movies}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.movie_id.toString()}
            renderItem={({ item }) => (
              <Image source={{ uri: item.poster_url }} style={styles.poster} />
            )}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          />
        </View>

        <TouchableOpacity style={styles.ctaButton} onPress={() => router.push({
          pathname: '/(auth)/signup',
          params: { liked_ids: params.liked_ids }
        })}>
          <Text style={styles.ctaButtonText}>내 취향 저장하고 추천받기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginBottom: 32,
    paddingHorizontal: 20,
    textAlign: 'center',
  },
  movieListContainer: {
    height: 220,
    width: '100%',
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginLeft: 16,
    marginBottom: 12,
  },
  poster: {
    width: 120,
    height: 180,
    borderRadius: 8,
    marginRight: 12,
  },
  ctaButton: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: Colors.light.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  ctaButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  }
});