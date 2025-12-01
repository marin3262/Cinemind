import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/theme';
import { Mood } from '@/constants/moods';

type MoodButtonProps = {
  mood: Mood;
  onPress: () => void;
  isSelected: boolean;
};

const MoodButton: React.FC<MoodButtonProps> = ({ mood, onPress, isSelected }) => {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <TouchableOpacity
      style={[
        styles.moodButton,
        isSelected && styles.moodButtonSelected,
      ]}
      onPress={handlePress}
    >
      <Text style={styles.moodEmoji}>{mood.emoji}</Text>
      <Text style={styles.moodText}>{mood.name}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  moodButton: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 8,
    width: '40%', // Adjust this for more or fewer columns
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
});

export default MoodButton;
