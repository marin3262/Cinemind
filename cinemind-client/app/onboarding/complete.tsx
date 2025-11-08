import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function OnboardingCompleteScreen() {
  const router = useRouter();

  useEffect(() => {
    // Automatically navigate to the main app after a short delay
    const timer = setTimeout(() => {
      router.replace('/(tabs)');
    }, 2000); // 2-second delay

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>취향 분석 완료!{"\n"}CineMind에 오신 것을 환영합니다.</Text>
      </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 32,
    color: Colors.light.text,
  },
});