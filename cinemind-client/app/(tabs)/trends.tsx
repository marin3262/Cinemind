import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Colors } from '@/constants/theme';
import { authenticatedFetch } from '@/utils/api';
import API_BASE_URL from '@/constants/config';
import MovieCarousel from '@/components/MovieCarousel';
import MovieModal from '@/components/MovieModal';
import { useMovieModal } from '@/hooks/useMovieModal';
import { FontAwesome } from '@expo/vector-icons';
import BoxOfficeSection from '@/components/trends/BoxOfficeSection';
import BattleSection from '@/components/trends/BattleSection';

interface Person {
  id: string;
  name: string;
  profile_url?: string;
  related_movies?: { id: string; title: string }[];
}

const EmptyStateCard = ({ message }: { message: string }) => (
    <View style={styles.noDataCard}>
        <Text style={styles.noDataText}>{message}</Text>
    </View>
);

export default function TrendsScreen() {
    const router = useRouter();
    const [sortBy, setSortBy] = useState<'rank' | 'audience'>('audience');
    
    const [boxOfficeMovies, setBoxOfficeMovies] = useState<any[]>([]);
    const [battleData, setBattleData] = useState<any>(null);
    const [popularPerson, setPopularPerson] = useState<Person | null>(null);
    const [newReleases, setNewReleases] = useState<any[]>([]);
    
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

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const [boxOfficeResponse, battleResponse, popularPersonResponse, newReleasesResponse] = await Promise.all([
                    authenticatedFetch(`${API_BASE_URL}/movies/box-office?sort_by=${sortBy}`),
                    authenticatedFetch(`${API_BASE_URL}/movies/box-office/battle`),
                    authenticatedFetch(`${API_BASE_URL}/person/weekly-popular`),
                    authenticatedFetch(`${API_BASE_URL}/movies/new-releases`),
                ]);

                // Even if some APIs fail, we want to show what we can
                if (boxOfficeResponse.ok) setBoxOfficeMovies(await boxOfficeResponse.json());
                if (battleResponse.ok) setBattleData(await battleResponse.json());
                if (popularPersonResponse.ok) setPopularPerson(await popularPersonResponse.json());
                if (newReleasesResponse.ok) setNewReleases(await newReleasesResponse.json());

            } catch (e: any) {
                setError('트렌드 정보를 불러오는 중 오류가 발생했습니다.');
                Alert.alert('오류', e.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [sortBy]);
    
    const topMovies = boxOfficeMovies.slice(0, 3);
    const maxAudience = topMovies.length > 0 
      ? Math.max(...topMovies.map(m => Number(sortBy === 'rank' ? m.daily_audience : m.audience) || 0))
      : 0;

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView>
                <View style={styles.header}>
                    <Text style={styles.title}>무비 트렌드</Text>
                </View>

                {isLoading ? (
                    <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 50 }} />
                ) : error ? (
                    <Text style={styles.infoText}>{error}</Text>
                ) : (
                    <>
                        <BoxOfficeSection 
                            boxOfficeMovies={boxOfficeMovies}
                            topMovies={topMovies}
                            maxAudience={maxAudience}
                            sortBy={sortBy}
                            setSortBy={setSortBy}
                            handleMoviePress={handleMoviePress}
                        />
                        
                        <BattleSection 
                            battleData={battleData}
                            handleMoviePress={handleMoviePress}
                        />
                        
                        <View style={styles.sectionContainer}>
                            <Text style={styles.sectionTitle}>이번 주 최고의 인물</Text>
                             <Text style={styles.sectionSubtitle}>주간 박스오피스에 가장 많이 등장한 영화인</Text>
                            {popularPerson ? (
                                <TouchableOpacity style={styles.personCard} onPress={() => router.push({ pathname: `/person/${popularPerson.id}` })}>
                                    <Image source={{ uri: popularPerson.profile_url }} style={styles.personImage} />
                                    <View style={styles.personInfo}>
                                        <Text style={styles.personName}>{popularPerson.name}</Text>
                                        <Text style={styles.personSubtext} numberOfLines={1}>
                                            관련 작품: {popularPerson.related_movies?.map(m => m.title).join(', ')}
                                        </Text>
                                    </View>
                                    <FontAwesome name="chevron-right" size={20} color={Colors.light.textSecondary} />
                                </TouchableOpacity>
                            ) : (
                                <EmptyStateCard message="이번 주 최고의 인물 정보를 집계 중입니다." />
                            )}
                        </View>

                        <View style={styles.sectionContainer}>
                            <View style={styles.carouselHeader}>
                                <Text style={styles.sectionTitle}>따끈따끈 신작</Text>
                            </View>
                            {newReleases.length > 0 ? (
                                <MovieCarousel movies={newReleases} onMoviePress={(movie) => handleMoviePress(movie, 'tmdb')} />
                            ) : (
                                <EmptyStateCard message="신작 영화 정보를 불러올 수 없습니다." />
                            )}
                        </View>
                    </>
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
  header: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: Colors.light.text },
  infoText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: Colors.light.textSecondary },
  sectionContainer: { marginBottom: 40 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.light.text, marginBottom: 4, paddingHorizontal: 16 },
  sectionSubtitle: { fontSize: 14, color: Colors.light.textSecondary, marginBottom: 16, paddingHorizontal: 16 },
  
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16, 
  },
  personImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E5E7EB',
  },
  personInfo: {
    flex: 1,
    marginLeft: 16,
  },
  personName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  personSubtext: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  carouselHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  noDataCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 100,
  },
  noDataText: { color: Colors.light.textSecondary, fontSize: 14, textAlign: 'center' },
});
