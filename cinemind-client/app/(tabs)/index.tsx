import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Colors } from '@/constants/theme';
import { FontAwesome } from '@expo/vector-icons';
import { authenticatedFetch } from '@/utils/api';
import API_BASE_URL from '@/constants/config';
import MovieCard from '@/components/MovieCard';
import MovieModal from '@/components/MovieModal';
import { useMovieModal } from '@/hooks/useMovieModal';

type Mood = {
  name: string;
  emoji: string;
  keywords: string[];
};

const moods: Mood[] = [
  { name: '신나는', emoji: '😄', keywords: ['액션', '모험'] },
  { name: '감성적인', emoji: '😢', keywords: ['드라마', '로맨스'] },
  { name: '설레는', emoji: '💖', keywords: ['로맨스', '코미디'] },
  { name: '긴장감 넘치는', emoji: '😨', keywords: ['스릴러', '미스터리'] },
  { name: '웃고 싶은', emoji: '😂', keywords: ['코미디'] },
  { name: '생각에 잠기는', emoji: '🤔', keywords: ['다큐멘터리', '역사', '드라마'] },
];

export default function HomeScreen() {
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const {
    modalVisible,
    selectedMovie,
    isDetailLoading,
    handleMoviePress,
    handleCloseModal,
    handleSaveRating,
    handleToggleLike,
  } = useMovieModal();

  const handleMoodSelect = async (mood: Mood) => {
    setSelectedMood(mood);
    setIsLoading(true);
    setRecommendations([]);
    try {
      const keywords = mood.keywords.join(',');
      const url = `${API_BASE_URL}/recommendations/mood?mood_keywords=${encodeURIComponent(keywords)}`;
      
      const response = await authenticatedFetch(url);

      if (!response.ok) {
        throw new Error('영화를 추천받는 데 실패했습니다.');
      }

      const data = await response.json();
      setRecommendations(data);

    } catch (e: any) {
      Alert.alert('오류', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Automatically scroll down when new recommendations are loaded
    if (recommendations.length > 0 && !isLoading) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 450, animated: true });
      }, 100); // A small delay ensures the UI has rendered before scrolling
    }
  }, [recommendations, isLoading]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>오늘의 기분은 어떠세요?</Text>
          <Text style={styles.subtitle}>
            {selectedMood 
              ? `${selectedMood.emoji} ${selectedMood.name} 기분에 맞는 영화를 추천해 드릴게요!`
              : "현재 기분을 선택하고 맞춤 영화를 추천받으세요."
            }
          </Text>
        </View>

        <View style={styles.moodGrid}>
          {moods.map((mood) => (
            <TouchableOpacity 
              key={mood.name} 
              style={[
                styles.moodButton, 
                selectedMood?.name === mood.name && styles.moodButtonSelected
              ]} 
              onPress={() => handleMoodSelect(mood)}
            >
              <Text style={styles.moodEmoji}>{mood.emoji}</Text>
              <Text style={styles.moodText}>{mood.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading && (
          <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 40 }} />
        )}

        {!isLoading && recommendations.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>'{selectedMood?.name}' 기분을 위한 추천 영화</Text>
            {recommendations.map((movie) => (
              <MovieCard 
                key={movie.id} 
                movie={movie} 
                onPress={() => handleMoviePress(movie, 'tmdb')} 
              />
            ))}
          </View>
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
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    paddingBottom: 48,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    marginBottom: 32,
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
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  moodButton: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 8,
    width: '40%', // 2 columns
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  moodButtonSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: '#FFFBEB', // amber-50
  },
  moodEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  moodText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  resultsContainer: {
    marginTop: 40,
    paddingHorizontal: 16,
  },
  resultsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 20,
    textAlign: 'center',
  },
});