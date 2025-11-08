import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/theme';

type RecommendCardProps = {
  movie: {
    title: string;
  };
  onPress: () => void;
};

const RecommendCard = ({ movie, onPress }: RecommendCardProps) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.poster}>
        <Text style={styles.posterText}>영화포스터</Text>
      </View>
      <Text style={styles.title} numberOfLines={1}>{movie.title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 140,
    marginRight: 16,
  },
  poster: {
    width: 140,
    height: 200,
    backgroundColor: '#E5E7EB', // neutral-200
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterText: {
    color: Colors.light.textSecondary,
    fontSize: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default RecommendCard;
