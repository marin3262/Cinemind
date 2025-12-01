import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { moods, Mood } from '@/constants/moods'; // Import shared moods
import MoodButton from '@/components/MoodButton'; // Import shared button component

export default function OnboardingMoodScreen() {
  const router = useRouter();
  const { authState } = useAuth();
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);

  const handleMoodSelect = (mood: Mood) => {
    setSelectedMood(mood);
    // Navigate to the swipe screen, passing the mood keywords
    router.push({ 
        pathname: '/onboarding/swipe', 
        params: { 
            moodKeywords: mood.keywords.join(','),
            moodName: mood.name,
            moodEmoji: mood.emoji,
        } 
    });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.header}>
              <Text style={styles.title}>
                  <FontAwesome name="film" size={36} color={Colors.light.primary} /> CineMind
              </Text>
          </View>

          <View style={styles.content}>
              <View style={styles.prompt}>
                  <Text style={styles.promptTitle}>{authState.user?.username || '사용자'}님, 환영합니다!</Text>
                  <Text style={styles.promptSubtitle}>CineMind의 정확한 추천을 위해{"\n"}지금 기분을 알려주세요.</Text>
              </View>

              <View style={styles.moodGrid}>
                  {moods.map((mood) => (
                      <MoodButton
                          key={mood.name}
                          mood={mood}
                          onPress={() => handleMoodSelect(mood)}
                          isSelected={selectedMood?.name === mood.name} // Onboarding needs selection state
                      />
                  ))}
              </View>
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F3F4F6', // neutral-100
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    header: {
        position: 'absolute',
        top: 80,
        alignItems: 'center',
    },
    title: {
        fontSize: 40,
        fontWeight: 'bold',
        color: Colors.light.primary,
        flexDirection: 'row',
        alignItems: 'center',
    },
    content: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: Colors.light.card,
        padding: 32,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        alignItems: 'center',
    },
    prompt: {
        textAlign: 'center',
        alignItems: 'center',
    },
    promptTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
        color: Colors.light.text,
    },
    promptSubtitle: {
        fontSize: 18,
        color: Colors.light.textSecondary,
        textAlign: 'center',
        lineHeight: 26,
    },
    moodGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center', // Center the buttons
        marginTop: 32,
        width: '100%',
    },
});