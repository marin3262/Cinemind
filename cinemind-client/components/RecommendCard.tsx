import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Colors } from '@/constants/theme';

type RecommendCardProps = {
  movie: {
    id: string | number;
    title: string;
    poster_url?: string; // Make poster_url optional
  };
  onPress: () => void;
};

const RecommendCard = ({ movie, onPress }: RecommendCardProps) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {movie.poster_url ? (
        <Image source={{ uri: movie.poster_url }} style={styles.posterImage} />
      ) : (
        <View style={styles.posterPlaceholder}>
          <Text style={styles.posterText}>영화포스터</Text>
        </View>
      )}
      <Text style={styles.title} numberOfLines={1}>{movie.title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 140,
    marginRight: 16,
  },
  posterImage: {
    width: 140,
    height: 200,
    borderRadius: 8,
    backgroundColor: '#E5E7EB', // for loading
  },
  posterPlaceholder: {
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