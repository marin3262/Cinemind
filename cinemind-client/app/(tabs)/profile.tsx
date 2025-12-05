import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthManager';
import { Colors } from '@/constants/theme';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { authenticatedFetch } from '@/utils/api';
import API_BASE_URL from '@/constants/config';
import TasteAnalysisCard from '@/components/TasteAnalysisCard';
import { Collapsible } from '@/components/ui/collapsible';

type MovieListItem = {
    movie_id: string;
    title: string;
    poster_url: string | null;
    rating?: number;
};

interface RatingDistributionItem {
  rating: number;
  count: number;
}

interface TasteAnalysisResponse {
  total_ratings: number;
  analysis_title: string;
  top_genres: string[];
  rating_distribution: RatingDistributionItem[];
}

export default function ProfileScreen() {
    const { onLogout, authState } = useAuth();
    const user = authState.user;
    const router = useRouter();

    const [ratedMovies, setRatedMovies] = useState<MovieListItem[]>([]);
    const [likedMovies, setLikedMovies] = useState<MovieListItem[]>([]);
    const [analysis, setAnalysis] = useState<TasteAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProfileData = useCallback(async () => {
        if (ratedMovies.length === 0 && likedMovies.length === 0) {
            setIsLoading(true);
        }
        setError(null);
        try {
            const [ratingsResponse, likesResponse, tasteAnalysisResponse] = await Promise.all([
                authenticatedFetch(`${API_BASE_URL}/users/me/ratings`),
                authenticatedFetch(`${API_BASE_URL}/users/me/likes`),
                authenticatedFetch(`${API_BASE_URL}/users/me/taste-analysis`)
            ]);

            if (!ratingsResponse.ok || !likesResponse.ok || !tasteAnalysisResponse.ok) {
                throw new Error('프로필 정보를 불러오는 데 실패했습니다.');
            }

            const ratingsData = await ratingsResponse.json();
            const likesData = await likesResponse.json();
            const tasteAnalysisData: TasteAnalysisResponse = await tasteAnalysisResponse.json();
            
            setRatedMovies(ratingsData);
            setLikedMovies(likesData);
            setAnalysis(tasteAnalysisData);

        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, [ratedMovies.length, likedMovies.length]);

    useFocusEffect(
        useCallback(() => {
            fetchProfileData();
        }, [fetchProfileData])
    );

    const handleDeleteAccount = () => {
        Alert.alert(
          "회원 탈퇴",
          "정말로 탈퇴하시겠습니까? 모든 활동 기록(평점, 좋아요 등)이 영구적으로 삭제되며 복구할 수 없습니다.",
          [
            {
              text: "취소",
              style: "cancel",
            },
            {
              text: "탈퇴",
              onPress: async () => {
                try {
                  const response = await authenticatedFetch(`${API_BASE_URL}/users/me`, {
                    method: 'DELETE',
                  });
                  if (response.ok) {
                    Alert.alert("탈퇴 완료", "회원 탈퇴가 성공적으로 처리되었습니다.");
                    onLogout(); // Log out and redirect
                  } else {
                    const data = await response.json();
                    throw new Error(data.detail || "계정 삭제에 실패했습니다.");
                  }
                } catch (e: any) {
                  Alert.alert("오류", e.message || "계정 삭제 중 오류가 발생했습니다.");
                }
              },
              style: "destructive", // This makes the button red on iOS
            },
          ]
        );
      };

    return (
        <>
            <Stack.Screen options={{ title: '프로필' }} />
            <SafeAreaView style={styles.safeArea}>
                <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
                    
                    {user && (
                        <View style={styles.section}>
                            <Collapsible title="계정 정보">
                                <View style={styles.collapsibleContent}>
                                    <Text style={styles.label}>아이디</Text>
                                    <Text style={styles.value}>{user.username}</Text>
                                    <Text style={styles.label}>이메일</Text>
                                    <Text style={styles.value}>{user.email}</Text>
                                </View>
                            </Collapsible>
                        </View>
                    )}

                    {isLoading ? (
                        <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 50 }} />
                    ) : error ? (
                        <Text style={styles.infoText}>{error}</Text>
                    ) : (
                        <>
                            <TasteAnalysisCard analysis={analysis} />

                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>내가 평가한 영화</Text>
                                    <TouchableOpacity onPress={() => router.push('/my-ratings')}>
                                        <Text style={styles.viewMoreButton}>더보기</Text>
                                    </TouchableOpacity>
                                </View>
                                {ratedMovies.length > 0 ? (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselContainer}>
                                        {ratedMovies.map((movie) => (
                                            <View key={`rated-${movie.movie_id}`} style={styles.movieCard}>
                                                <Image source={{ uri: movie.poster_url || undefined }} style={styles.posterImage} />
                                                <Text style={styles.movieTitle} numberOfLines={1}>{movie.title}</Text>
                                                <View style={styles.ratingContainer}>
                                                    <FontAwesome name="star" size={16} color="#FFD700" />
                                                    <Text style={styles.ratingText}>{movie.rating}점</Text>
                                                </View>
                                            </View>
                                        ))}
                                    </ScrollView>
                                ) : (
                                    <Text style={styles.infoText}>아직 평가한 영화가 없어요.</Text>
                                )}
                            </View>

                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>찜한 영화</Text>
                                    <TouchableOpacity onPress={() => router.push('/my-likes')}>
                                        <Text style={styles.viewMoreButton}>더보기</Text>
                                    </TouchableOpacity>
                                </View>
                                {likedMovies.length > 0 ? (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselContainer}>
                                        {likedMovies.map((movie) => (
                                            <View key={`liked-${movie.movie_id}`} style={styles.movieCard}>
                                                <View style={styles.posterImageContainer}>
                                                    <Image source={{ uri: movie.poster_url || undefined }} style={styles.posterImage} />
                                                    <View style={styles.bookmarkIconContainer}>
                                                        <FontAwesome name="bookmark" size={24} color={Colors.light.primary} />
                                                    </View>
                                                </View>
                                                <Text style={styles.movieTitle} numberOfLines={2}>{movie.title}</Text>
                                            </View>
                                        ))}
                                    </ScrollView>
                                ) : (
                                    <Text style={styles.infoText}>아직 찜한 영화가 없어요.</Text>
                                )}
                            </View>
                        </>
                    )}

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
                            <FontAwesome name="sign-out" size={20} color="white" />
                            <Text style={styles.buttonText}>로그아웃</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.logoutButton, styles.testButton]} 
                            onPress={() => router.push('/onboarding')}
                        >
                            <FontAwesome name="rocket" size={20} color="white" />
                            <Text style={styles.buttonText}>온보딩 테스트</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.logoutButton, styles.deleteButton]}
                            onPress={handleDeleteAccount}
                        >
                            <FontAwesome name="trash" size={20} color="white" />
                            <Text style={styles.buttonText}>회원 탈퇴</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: 'white',
    },
    container: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
    },
    collapsibleContent: {
        backgroundColor: 'white',
        padding: 24,
        borderRadius: 12,
        marginTop: 8,
    },
    label: {
        fontSize: 16,
        color: Colors.light.textSecondary,
    },
    value: {
        fontSize: 20,
        fontWeight: '500',
        color: Colors.light.text,
        marginBottom: 16,
        marginTop: 4,
    },
    section: {
        marginBottom: 24,
        width: '100%',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.light.text,
    },
    viewMoreButton: {
        fontSize: 16,
        color: Colors.light.primary,
        fontWeight: '600',
    },
    carouselContainer: {
        paddingVertical: 10, // Add vertical padding for shadow
        paddingLeft: 8,
    },
    movieCard: {
        width: 140,
        margin: 8, // Use margin instead of marginRight for all-around spacing
        backgroundColor: 'white',
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
        paddingBottom: 8,
    },
    posterImage: {
        width: '100%',
        height: 200,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        backgroundColor: '#E5E7EB',
    },
    movieTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 8,
        marginHorizontal: 8,
        height: 34, // Allow for two lines
    },
    posterImageContainer: {
        position: 'relative',
        width: '100%',
        height: 200,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        backgroundColor: '#E5E7EB',
    },
    bookmarkIconContainer: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: 12,
        padding: 4,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 8,
        marginTop: 4,
    },
    ratingText: {
        marginLeft: 4,
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.light.text,
    },
    infoText: {
        color: Colors.light.textSecondary,
        textAlign: 'center',
        marginTop: 20,
        minHeight: 50,
        width: '100%',
        paddingVertical: 20,
        backgroundColor: 'white',
        borderRadius: 12,
    },
    buttonContainer: {
        marginTop: 20,
        alignItems: 'center',
        paddingBottom: 40,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.light.textSecondary,
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 8,
        width: '80%',
        maxWidth: 300,
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18,
        marginLeft: 12,
    },
    testButton: {
        backgroundColor: '#4A90E2',
        marginTop: 16,
    },
    deleteButton: {
        backgroundColor: '#E53E3E', // A shade of red
        marginTop: 16,
    },
});