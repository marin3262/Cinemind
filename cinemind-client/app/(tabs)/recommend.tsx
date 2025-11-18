import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/theme';
import RecommendCard from '@/components/RecommendCard';
import MovieModal from '@/components/MovieModal';
import { useRecommendations } from '@/hooks/useRecommendations';
import { useMovieModal } from '@/hooks/useMovieModal';

const MOODS = [
  { label: '😄 신나는', tag: 'happy' },
  { label: '💧 감성적인', tag: 'sad' },
  { label: '❤️ 설레는', tag: 'love' },
  { label: '🔥 스트레스 해소', tag: 'angry' },
  { label: '🌿 힐링', tag: 'relax' },
  { label: '😱 스릴 넘치는', tag: 'thrill' },
];

export default function RecommendScreen() {
    const [selectedMood, setSelectedMood] = useState<string | null>(null);
    
    const { recommendations, isLoading, error, fetchRecommendations } = useRecommendations(selectedMood);
    
    const { 
        modalVisible, 
        selectedMovie, 
        isDetailLoading, 
        handleMoviePress, 
        handleCloseModal, 
        handleSaveRating 
    } = useMovieModal({
        onRatingSaved: () => fetchRecommendations(selectedMood)
    });

    const handleMoodSelect = (moodTag: string) => {
        const newMood = selectedMood === moodTag ? null : moodTag;
        setSelectedMood(newMood);
    };

    const renderContent = () => {
        if (isLoading) {
            return <ActivityIndicator style={{ marginTop: 50 }} size="large" color={Colors.light.primary} />;
        }
        if (error) {
            return <Text style={styles.infoText}>오류: {error}</Text>;
        }
        if (recommendations.length === 0) {
            return <Text style={styles.infoText}>추천 데이터가 없습니다.{"\n"}다른 기분을 선택하거나 영화에 평점을 남겨보세요!</Text>;
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
                    <Text style={styles.title}>감성 추천</Text>
                    <Text style={styles.subtitle}>오늘의 기분에 맞는 영화를 추천해 드립니다.</Text>
                </View>

                <View style={styles.moodSection}>
                    <Text style={styles.sectionTitle}>오늘 기분이 어떠세요?</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moodSelector}>
                        {MOODS.map((mood) => (
                            <TouchableOpacity
                                key={mood.tag}
                                style={[styles.moodButton, selectedMood === mood.tag && styles.moodButtonSelected]}
                                onPress={() => handleMoodSelect(mood.tag)}
                            >
                                <Text style={[styles.moodButtonText, selectedMood === mood.tag && styles.moodButtonTextSelected]}>
                                    {mood.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        {selectedMood ? `'${MOODS.find(m => m.tag === selectedMood)?.label}' 기분을 위한 추천` : '회원님을 위한 추천'}
                    </Text>
                    {renderContent()}
                </View>
            </ScrollView>
            {selectedMovie && (
                <MovieModal 
                    visible={modalVisible} 
                    onClose={handleCloseModal} 
                    movie={selectedMovie} 
                    isDetailLoading={isDetailLoading} 
                    onSaveRating={handleSaveRating}
                />
            )}
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
    moodSection: {
        marginBottom: 24,
    },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.light.text, marginLeft: 16, marginBottom: 16 },
    carousel: { paddingHorizontal: 16 },
    infoText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: Colors.light.textSecondary, lineHeight: 24 },
    moodSelector: {
        paddingHorizontal: 16,
    },
    moodButton: {
        backgroundColor: '#FFF',
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 20,
        marginRight: 12,
        borderWidth: 1,
        borderColor: Colors.light.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    moodButtonSelected: {
        backgroundColor: Colors.light.primary,
        borderColor: Colors.light.primary,
    },
    moodButtonText: {
        fontSize: 16,
        color: Colors.light.text,
        fontWeight: '500',
    },
    moodButtonTextSelected: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
});
