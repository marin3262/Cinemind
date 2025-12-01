import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

export default function OnboardingPromptScreen() {
  const router = useRouter();

  const handleStart = () => {
    // Navigate to the main onboarding flow, replacing the current screen
    router.replace('/onboarding');
  };

  const handleSkip = () => {
    // Navigate to the main app tabs, replacing the current screen
    router.replace('/(tabs)');
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <FontAwesome name="film" size={60} color={Colors.light.primary} />
          <Text style={styles.title}>CineMind에 오신 것을 환영합니다!</Text>
          <Text style={styles.subtitle}>
            시작하기 전에, 간단한 취향 선택으로
            {"\n"}
            더 정확한 영화 추천을 받아볼까요?
          </Text>
          
          <TouchableOpacity style={styles.startButton} onPress={handleStart}>
            <Text style={styles.startButtonText}>취향 선택 시작하기</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>건너뛰기</Text>
          </TouchableOpacity>
        </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 48,
  },
  startButton: {
    width: '100%',
    backgroundColor: Colors.light.primary,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  skipButton: {
    padding: 12,
  },
  skipButtonText: {
    color: Colors.light.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
});
