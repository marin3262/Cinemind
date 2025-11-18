import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  interpolate, 
  Extrapolate,
  runOnJS
} from 'react-native-reanimated';
import { Colors } from '@/constants/theme';
import SwipeCard from '@/components/SwipeCard';
import API_BASE_URL from '@/constants/config';

const { width: screenWidth } = Dimensions.get('window');
const swipeThreshold = screenWidth * 0.4;

interface OnboardingMovie {
  movie_id: number;
  title: string;
  poster_url: string;
  genre_name: string;
}

export default function OnboardingSwipeScreen() {
  const router = useRouter();
  const { moodText, moodEmoji } = useLocalSearchParams();
  
  const [movies, setMovies] = useState<OnboardingMovie[]>([]);
  const [likedMovies, setLikedMovies] = useState<OnboardingMovie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    const fetchOnboardingMovies = async () => {
        if (!moodText) {
            setError("기분 정보가 없습니다.");
            setIsLoading(false);
            return;
        }
        try {
            const url = `${API_BASE_URL}/movies/onboarding?mood=${encodeURIComponent(moodText as string)}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('서버에서 영화 목록을 가져오는데 실패했습니다.');
            }
            const data: OnboardingMovie[] = await response.json();
            if (data.length === 0) {
                throw new Error('표시할 영화가 없습니다.');
            }
            setMovies(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    fetchOnboardingMovies();
  }, [moodText]);

  const advanceCard = (liked: boolean) => {
    if (currentIndex >= movies.length) return;

    const movie = movies[currentIndex];
    
    if (liked) {
      setLikedMovies(prev => [...prev, movie]);
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex >= movies.length) {
      const likedIds = [...likedMovies, ...(liked ? [movie] : [])].map(m => m.movie_id);
      router.replace({
        pathname: '/onboarding/complete',
        params: { liked_ids: JSON.stringify(likedIds) }
      });
    } else {
      setCurrentIndex(nextIndex);
      translateX.value = 0;
      translateY.value = 0;
      rotation.value = 0;
    }
  };

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
      rotation.value = interpolate(event.translationX, [-screenWidth, screenWidth], [-30, 30], Extrapolate.CLAMP);
    })
    .onEnd((event) => {
      if (Math.abs(event.translationX) > swipeThreshold) {
        const liked = event.translationX > 0;
        translateX.value = withSpring((liked ? 1 : -1) * screenWidth * 1.5, { damping: 20, stiffness: 90 });
        runOnJS(advanceCard)(liked);
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 90 });
        translateY.value = withSpring(0, { damping: 20, stiffness: 90 });
        rotation.value = withSpring(0, { damping: 20, stiffness: 90 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const handleButtonSwipe = (liked: boolean) => {
    translateX.value = withSpring((liked ? 1 : -1) * screenWidth * 1.5, { damping: 20, stiffness: 90 });
    runOnJS(advanceCard)(liked);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={{ marginTop: 10 }}>취향에 맞는 영화를 찾고 있어요...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, color: 'red', textAlign: 'center' }}>오류가 발생했습니다</Text>
          <Text style={{ marginTop: 10, textAlign: 'center' }}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const progressPercent = movies.length > 0 ? ((currentIndex) / movies.length) * 100 : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{moodEmoji} {moodText} 기분을 위한</Text>
          <Text style={styles.subtitle}>마음에 드는 영화를 선택해 주세요.</Text>
        </View>

        <View style={styles.progressContainer}>
            <Text style={styles.progressText}>{currentIndex}/{movies.length}</Text>
            <View style={styles.progressBarBackground}>
                <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
            </View>
        </View>

        <View style={styles.deck}>
          {movies.map((movie, index) => {
            if (index < currentIndex) return null;
            if (index > currentIndex + 2) return null;

            if (index === currentIndex) {
              return (
                <GestureDetector gesture={gesture} key={movie.movie_id}>
                  <SwipeCard movie={movie} style={animatedStyle} />
                </GestureDetector>
              );
            }
            return <SwipeCard key={movie.movie_id} movie={movie} style={{
                transform: [{ scale: 1 - (index - currentIndex) * 0.05 }, { translateY: (index - currentIndex) * 10 }],
                opacity: 1 - (index - currentIndex) * 0.1
            }} />;
          }).reverse()}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={() => handleButtonSwipe(false)}>
            <FontAwesome name="times" size={32} color="#71717A" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => handleButtonSwipe(true)}>
            <FontAwesome name="heart" size={30} color={Colors.light.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.light.background },
  container: { flex: 1, alignItems: 'center', padding: 16, justifyContent: 'space-between' },
  header: { alignItems: 'center', marginVertical: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.light.text, textAlign: 'center' },
  subtitle: { fontSize: 16, color: Colors.light.textSecondary, marginTop: 4 },
  progressContainer: { width: '100%', maxWidth: 320, marginTop: 16 },
  progressText: { color: Colors.light.primary, fontWeight: '600', marginBottom: 4, textAlign: 'left' },
  progressBarBackground: { height: 8, backgroundColor: Colors.light.border, borderRadius: 4 },
  progressBar: { height: 8, backgroundColor: Colors.light.primary, borderRadius: 4 },
  deck: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', maxHeight: 450, marginVertical: 20 },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-evenly', width: '100%', maxWidth: 320, paddingBottom: 20 },
  button: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.card,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
