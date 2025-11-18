import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/theme';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { authenticatedFetch } from '@/utils/api';
import API_BASE_URL from '@/constants/config';
import TasteAnalysisCard from '@/components/TasteAnalysisCard';

// Define the type for a movie object in the lists
type MovieListItem = {
    movie_id: string;
    title: string;
    poster_url: string | null;
    rating?: number; // Optional for liked movies
};

// Define the type for TasteAnalysisReport
type TasteAnalysisReport = {
    taste_title: string;
    top_genres: string[];
    preferred_era: string | null;
};

export default function ProfileScreen() {
    const { onLogout, authState } = useAuth();
    const user = authState.user;
    const router = useRouter();

    const [ratedMovies, setRatedMovies] = useState<MovieListItem[]>([]);
    const [likedMovies, setLikedMovies] = useState<MovieListItem[]>([]);
    const [tasteAnalysisReport, setTasteAnalysisReport] = useState<TasteAnalysisReport | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // useFocusEffect will re-run the fetch logic every time the screen comes into focus
    useFocusEffect(
        useCallback(() => {
            const fetchProfileData = async () => {
                setIsLoading(true);
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
                    const tasteAnalysisData: TasteAnalysisReport = await tasteAnalysisResponse.json();
                    
                    setRatedMovies(ratingsData);
                    setLikedMovies(likesData);
                    setTasteAnalysisReport(tasteAnalysisData);

                } catch (e: any) {
                    setError(e.message);
                } finally {
                    setIsLoading(false);
                }
            };

            fetchProfileData();

            return () => {};
        }, [])
    );

    const renderRatedMovies = () => {
        if (isLoading) {
            return <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 20 }} />;
        }

        if (error) {
            return <Text style={styles.errorText}>{error}</Text>;
        }

        if (ratedMovies.length === 0) {
            return <Text style={styles.infoText}>아직 평가한 영화가 없습니다.</Text>;
        }

        return (
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
        );
    };

    const renderLikedMovies = () => {
        // Loading and error are handled by renderRatedMovies
        if (isLoading || error) {
            return null;
        }

        if (likedMovies.length === 0) {
            return <Text style={styles.infoText}>아직 찜한 영화가 없습니다.</Text>;
        }

        return (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselContainer}>
                {likedMovies.map((movie) => (
                    <View key={`liked-${movie.movie_id}`} style={styles.movieCard}>
                        <Image source={{ uri: movie.poster_url || undefined }} style={styles.posterImage} />
                        <Text style={styles.movieTitle} numberOfLines={2}>{movie.title}</Text>
                    </View>
                ))}
            </ScrollView>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container}>
                <Text style={styles.title}>내 정보</Text>
                
                {user && (
                    <View style={styles.profileInfo}>
                        <Text style={styles.label}>아이디</Text>
                        <Text style={styles.value}>{user.username}</Text>
                        <Text style={styles.label}>이메일</Text>
                        <Text style={styles.value}>{user.email}</Text>
                    </View>
                )}

                {/* Taste Analysis Card */}
                {isLoading ? (
                    <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginVertical: 20 }} />
                ) : error ? (
                    <Text style={styles.errorText}>{error}</Text>
                ) : tasteAnalysisReport && (
                    <TasteAnalysisCard 
                        tasteTitle={tasteAnalysisReport.taste_title}
                        topGenres={tasteAnalysisReport.top_genres}
                        preferredEra={tasteAnalysisReport.preferred_era}
                    />
                )}

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>내가 평가한 영화</Text>
                        <TouchableOpacity onPress={() => router.push('/my-ratings')}>
                            <Text style={styles.viewMoreButton}>더보기</Text>
                        </TouchableOpacity>
                    </View>
                    {renderRatedMovies()}
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>찜한 영화</Text>
                        <TouchableOpacity onPress={() => router.push('/my-likes')}>
                            <Text style={styles.viewMoreButton}>더보기</Text>
                        </TouchableOpacity>
                    </View>
                    {renderLikedMovies()}
                </View>

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
                </View>
            </ScrollView>
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
        padding: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.light.text,
        marginBottom: 24,
    },
    profileInfo: {
        width: '100%',
        backgroundColor: 'white',
        padding: 24,
        borderRadius: 12,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
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
        marginBottom: 32,
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
        paddingLeft: 4,
    },
    movieCard: {
        width: 140,
        marginRight: 16,
        backgroundColor: 'white',
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
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
    errorText: {
        color: 'red',
        textAlign: 'center',
        marginTop: 20,
    },
    infoText: {
        color: Colors.light.textSecondary,
        textAlign: 'center',
        marginTop: 20,
        minHeight: 50,
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
});