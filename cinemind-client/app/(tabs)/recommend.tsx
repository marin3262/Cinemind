import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/theme';
import RecommendCard from '@/components/RecommendCard';
import { authenticatedFetch } from '@/utils/api';
import API_BASE_URL from '@/constants/config';

export default function RecommendScreen() {
    const [recommendations, setRecommendations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            const fetchRecommendations = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    const response = await authenticatedFetch(`${API_BASE_URL}/movies/recommendations`);
                    if (!response.ok) {
                        throw new Error('추천을 불러오는 데 실패했습니다.');
                    }
                    const data = await response.json();
                    setRecommendations(data);
                } catch (e: any) {
                    setError(e.message);
                } finally {
                    setIsLoading(false);
                }
            };

            fetchRecommendations();
        }, [])
    );

    const handleMoviePress = (movie: any) => {
        console.log('Pressed movie:', movie.title);
        // TODO: Implement modal view for recommendations
    }

    const renderContent = () => {
        if (isLoading) {
            return <ActivityIndicator style={{ marginTop: 50 }} size="large" color={Colors.light.primary} />;
        }
        if (error) {
            return <Text style={styles.infoText}>오류: {error}</Text>;
        }
        if (recommendations.length === 0) {
            return <Text style={styles.infoText}>추천 데이터가 없습니다. 영화에 평점을 남겨주세요!</Text>;
        }
        return (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
                {recommendations.map((movie) => (
                    <RecommendCard key={movie.id} movie={movie} onPress={() => handleMoviePress(movie)} />
                ))}
            </ScrollView>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>맞춤 추천</Text>
                    <Text style={styles.subtitle}>AI가 회원님의 취향을 분석하여 영화를 추천해 드립니다.</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>회원님을 위한 추천 영화</Text>
                    {renderContent()}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F3F4F6' },
    container: { flex: 1 },
    header: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 16 },
    title: { fontSize: 28, fontWeight: 'bold', color: Colors.light.text },
    subtitle: { fontSize: 16, color: Colors.light.textSecondary, marginTop: 8 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.light.text, marginLeft: 16, marginBottom: 12 },
    carousel: { paddingHorizontal: 16 },
    infoText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: Colors.light.textSecondary },
});
