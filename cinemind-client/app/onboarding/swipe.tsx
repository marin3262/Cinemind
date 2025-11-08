import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Dimensions } from 'react-native';
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
import { authenticatedFetch } from '@/utils/api';
import API_BASE_URL from '@/constants/config';

const { width: screenWidth } = Dimensions.get('window');
const swipeThreshold = screenWidth * 0.4;

// Data from mockup
const movieData = {
    '신나는': [
        { id: '1', title: '범죄도시 2', poster: 'https://placehold.co/320x450/F59E0B/white?text=Exciting+Movie+1', genre: 'action' },
        { id: '2', title: '스파이더맨: 노 웨이 홈', poster: 'https://placehold.co/320x450/F59E0B/white?text=Exciting+Movie+2', genre: 'action' },
    ],
    '위로가 필요한': [
        { id: '11', title: '리틀 포레스트', poster: 'https://placehold.co/320x450/3B82F6/white?text=Comfort+Movie+1', genre: 'drama' },
        { id: '12', title: '어바웃 타임', poster: 'https://placehold.co/320x450/3B82F6/white?text=Comfort+Movie+2', genre: 'romance' },
    ],
    '행복한': [
        { id: '21', title: '맘마미아!', poster: 'https://placehold.co/320x450/10B981/white?text=Happy+Movie+1', genre: 'romance' },
        { id: '22', title: '라라랜드', poster: 'https://placehold.co/320x450/10B981/white?text=Happy+Movie+2', genre: 'romance' },
    ],
    '생각이 많은': [
        { id: '31', title: '인터스텔라', poster: 'https://placehold.co/320x450/6366F1/white?text=Deep+Movie+1', genre: 'sf' },
        { id: '32', title: '컨택트', poster: 'https://placehold.co/320x450/6366F1/white?text=Deep+Movie+2', genre: 'sf' },
    ]
};

export default function OnboardingSwipeScreen() {
  const router = useRouter();
  const { moodText, moodEmoji } = useLocalSearchParams();
  
  const [movieList, setMovieList] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    const selectedMovies = movieData[moodText as keyof typeof movieData] || movieData['신나는'];
    setMovieList(selectedMovies.slice().reverse()); // Create a reversed copy
  }, [moodText]);

  const advanceCard = async (liked: boolean) => {
    if (currentIndex >= movieList.length) return;

    const movie = movieList[currentIndex];
    const rating = liked ? 5 : 1;

    try {
      await authenticatedFetch(`${API_BASE_URL}/ratings`, {
        method: 'POST',
        body: JSON.stringify({
          movie_id: movie.id.toString(),
          rating: rating,
        }),
      });
    } catch (e) {
      console.error("Failed to save rating:", e);
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex >= movieList.length) {
      router.replace('/onboarding/complete');
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

  const progressPercent = movieList.length > 0 ? ((currentIndex) / movieList.length) * 100 : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{moodEmoji} {moodText} 기분을 위한</Text>
          <Text style={styles.subtitle}>마음에 드는 영화를 선택해 주세요.</Text>
        </View>

        <View style={styles.progressContainer}>
            <Text style={styles.progressText}>{currentIndex}/{movieList.length}</Text>
            <View style={styles.progressBarBackground}>
                <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
            </View>
        </View>

        <View style={styles.deck}>
          {movieList.map((movie, index) => {
            if (index < currentIndex) return null;
            if (index > currentIndex + 2) return null;

            if (index === currentIndex) {
              return (
                <GestureDetector gesture={gesture} key={movie.id}>
                  <SwipeCard movie={movie} style={animatedStyle} />
                </GestureDetector>
              );
            }
            return <SwipeCard key={movie.id} movie={movie} style={{
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
  container: { flex: 1, alignItems: 'center', padding: 16 },
  header: { alignItems: 'center', marginVertical: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.light.text, textAlign: 'center' },
  subtitle: { fontSize: 16, color: Colors.light.textSecondary, marginTop: 4 },
  progressContainer: { width: '100%', maxWidth: 320, marginBottom: 16 },
  progressText: { color: Colors.light.primary, fontWeight: '600', marginBottom: 4, textAlign: 'left' },
  progressBarBackground: { height: 8, backgroundColor: Colors.light.border, borderRadius: 4 },
  progressBar: { height: 8, backgroundColor: Colors.light.primary, borderRadius: 4 },
  deck: { width: 320, height: 450, justifyContent: 'center', alignItems: 'center' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-evenly', width: '100%', maxWidth: 320, marginTop: 30 },
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
