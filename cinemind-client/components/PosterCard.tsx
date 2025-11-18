import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '@/constants/theme';

const CARD_WIDTH = (Dimensions.get('window').width - 48) / 2.5; // Show 2.5 cards on screen

type PosterCardProps = {
  movie: {
    id: number;
    title: string;
    poster_url?: string | null;
  };
  onPress: () => void;
};

const PosterCard = ({ movie, onPress }: PosterCardProps) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.posterContainer}>
        {movie.poster_url ? (
          <Image
            source={{ uri: movie.poster_url }}
            style={styles.posterImage}
            contentFit="cover"
            transition={300}
          />
        ) : (
          <View style={styles.posterPlaceholder}>
            <Text style={styles.posterText}>이미지 없음</Text>
          </View>
        )}
      </View>
      <Text style={styles.title} numberOfLines={2}>{movie.title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    marginRight: 12,
  },
  posterContainer: {
    width: '100%',
    aspectRatio: 2 / 3, // Standard movie poster aspect ratio
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  posterPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
  },
  posterText: {
    color: Colors.light.textSecondary,
    fontSize: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
    textAlign: 'center',
  },
});

export default PosterCard;
