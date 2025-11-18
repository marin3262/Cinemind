import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

const moods = [
  { emoji: '🔥', text: '신나는' },
  { emoji: '😊', text: '행복한' },
  { emoji: '😢', text: '위로가 필요한' },
  { emoji: '🤔', text: '생각이 많은' },
];

export default function OnboardingMoodScreen() {
  const router = useRouter();
  const { authState } = useAuth();

  const handleMoodSelect = (mood: { text: string; emoji: string }) => {
    // Navigate to the swipe screen, passing the mood as a parameter
    router.push({ pathname: '/onboarding/swipe', params: { moodText: mood.text, moodEmoji: mood.emoji } });
  };

  return (
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
                    <TouchableOpacity 
                        key={mood.text} 
                        style={styles.moodButton} 
                        onPress={() => handleMoodSelect(mood)}
                    >
                        <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                        <Text style={styles.moodText}>{mood.text}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
      </View>
    </SafeAreaView>
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
        justifyContent: 'space-between',
        marginTop: 32,
        width: '100%',
    },
    moodButton: {
        width: '48%',
        aspectRatio: 1,
        backgroundColor: '#F9FAFB', // neutral-50
        borderRadius: 12,
        borderWidth: 2,
        borderColor: Colors.light.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        padding: 16,
    },
    moodEmoji: {
        fontSize: 50,
    },
    moodText: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 8,
        color: Colors.light.text,
    },
});