import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthManager';
import { moods, Mood } from '@/constants/moods';
import MoodButton from '@/components/MoodButton';

export default function OnboardingMoodScreen() {
  const router = useRouter();
  const { authState } = useAuth();
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);

  const handleMoodSelect = (mood: Mood) => {
    setSelectedMood(mood);
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
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{authState.user?.username || '사용자'}님, 환영합니다!</Text>
            <Text style={styles.subtitle}>CineMind의 정확한 추천을 위해{"\n"}지금 기분을 알려주세요.</Text>
          </View>

          <View style={styles.moodGrid}>
              {moods.map((mood) => (
                  <MoodButton
                      key={mood.name}
                      mood={mood}
                      onPress={() => handleMoodSelect(mood)}
                      isSelected={selectedMood?.name === mood.name}
                  />
              ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F9FAFB', // Use a light gray background like home
    },
    container: {
        paddingHorizontal: 24,
        paddingVertical: 32,
        alignItems: 'center', // Add this to center content horizontally
    },
    header: {
        marginBottom: 32,
        alignItems: 'center',
        width: '100%',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.light.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 18,
        color: Colors.light.textSecondary,
        lineHeight: 26,
    },
    moodGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: '100%', // Add this to make it take full width
        justifyContent: 'center', // Added this back to center the items within the full width
    },
});
