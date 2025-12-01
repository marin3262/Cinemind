import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Colors } from '@/constants/theme';
import API_BASE_URL from '@/constants/config';

// 1. 데이터 타입 확장
interface Movie {
  movie_id: number;
  title: string;
  poster_url: string;
  genre_name: string;
  release_date?: string;
  keywords?: string[];
}

// 헬퍼: 태그 렌더링 컴포넌트
const Tag = ({ text }: { text: string }) => (
  <View style={styles.tag}>
    <Text style={styles.tagText}>#{text}</Text>
  </View>
);

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
        // 백엔드 API 호출
        const response = await fetch(`${API_BASE_URL}/movies/details`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        });
        if (!response.ok) throw new Error('영화 정보를 가져오는 데 실패했습니다.');
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

  // 2. 분석 로직 확장
  const analysis = useMemo(() => {
    if (movies.length === 0) return null;

    // 장르 분석
    const genreCounts = movies.reduce((acc, movie) => {
      acc[movie.genre_name] = (acc[movie.genre_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(e => e[0]);

    // 키워드 분석
    const keywordCounts = movies.flatMap(m => m.keywords || []).reduce((acc, kw) => {
      acc[kw] = (acc[kw] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topKeywords = Object.entries(keywordCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
    
    // 시대(Decade) 분석
    const decadeCounts = movies.map(m => m.release_date ? Math.floor(new Date(m.release_date).getFullYear() / 10) * 10 : 0)
      .reduce((acc, decade) => {
        if(decade === 0) return acc;
        acc[decade] = (acc[decade] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);
    const favoriteDecade = Object.keys(decadeCounts).length > 0 ? Object.entries(decadeCounts).sort((a, b) => b[1] - a[1])[0][0] : null;

    return { topGenres, topKeywords, favoriteDecade };
  }, [movies]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.title}>취향을 분석하고 있습니다...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // 3. UI/UX 전면 개편
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.headerTitle}>취향 분석 리포트</Text>
          <Text style={styles.headerSubtitle}>CineMind가 회원님의 첫 취향을 분석했어요.</Text>

          <View style={styles.analysisSection}>
            <Text style={styles.sectionTitle}>나의 취향 키워드</Text>
            <View style={styles.tagContainer}>
              {analysis?.topGenres.map(g => <Tag key={g} text={g} />)}
              {analysis?.topKeywords.map(kw => <Tag key={kw} text={kw} />)}
            </View>
          </View>

          {analysis?.favoriteDecade && (
            <View style={styles.analysisSection}>
              <Text style={styles.sectionTitle}>선호하는 시대</Text>
              <Text style={styles.decadeText}>당신은 <Text style={styles.bold}>{analysis.favoriteDecade}년대</Text>의 감성을 사랑하는군요!</Text>
            </View>
          )}

          <View style={styles.analysisSection}>
            <Text style={styles.sectionTitle}>나의 첫 취향 컬렉션</Text>
            <View style={styles.collageContainer}>
              {movies.map((movie, index) => (
                  <Image 
                      key={movie.movie_id}
                      source={{ uri: movie.poster_url }} 
                      style={[
                          styles.poster,
                          { transform: [{ rotate: `${(index % 2 === 0 ? 1 : -1) * (index * 2 + 2)}deg` }] }
                      ]}
                  />
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.ctaContainer}>
          <TouchableOpacity style={styles.ctaButton} onPress={() => router.push({
            pathname: '/(auth)/signup',
            params: { liked_ids: params.liked_ids }
          })}>
            <Text style={styles.ctaButtonText}>내 취향 저장하고 AI 추천받기</Text>
          </TouchableOpacity>
          <Text style={styles.ctaSubtitle}>이 분석 결과를 바탕으로 당신만을 위한 첫 추천이 준비됩니다!</Text>
        </View>
      </SafeAreaView>
    </>
  );
}

// 새로운 스타일 시트
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContainer: { paddingBottom: 150, paddingTop: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: Colors.light.text },
  headerSubtitle: { fontSize: 16, color: Colors.light.textSecondary, textAlign: 'center', marginTop: 4, marginBottom: 30 },
  analysisSection: { marginBottom: 30, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: Colors.light.text, marginBottom: 16 },
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: Colors.light.tint, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  tagText: { color: Colors.light.primary, fontSize: 15, fontWeight: '600' },
  decadeText: { fontSize: 18, color: Colors.light.textSecondary, lineHeight: 26 },
  bold: { fontWeight: 'bold', color: Colors.light.text },
  collageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    height: 250,
    marginTop: 10,
    transform: [{ rotate: '-5deg' }]
  },
  poster: {
    width: 90,
    height: 135,
    borderRadius: 8,
    margin: -10,
    borderWidth: 2,
    borderColor: 'white',
  },
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  ctaButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  ctaSubtitle: { textAlign: 'center', color: Colors.light.textSecondary, fontSize: 13, marginTop: 12 },
  errorText: { fontSize: 16, color: 'red', textAlign: 'center' },
});