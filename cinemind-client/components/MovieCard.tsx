import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '@/constants/theme';

type MovieCardProps = {
  movie: {
    id: number;
    rank: number;
    title: string;
    release: string;
    audience: number;
    daily_audience?: number;
    poster_url?: string | null;
  };
  onPress: () => void;
  displayRank?: number;
  displayAudience?: number;
  audienceLabel?: string;
};

const MovieCard = ({ movie, onPress, displayRank, displayAudience, audienceLabel }: MovieCardProps) => {
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
          <Text style={styles.posterText}>이미지 없음</Text>
        )}
      </View>
      <View style={styles.contentContainer}>
        <Text style={styles.rank}>RANK {displayRank ?? movie.rank}</Text>
        <Text style={styles.title} numberOfLines={2}>{movie.title}</Text>
        <View style={styles.details}>
          <Text style={styles.detailText}>개봉일: {movie.release}</Text>
          <Text style={styles.detailText}>{audienceLabel ?? '누적 관객'}: {((displayAudience ?? movie.audience) / 10000).toLocaleString()}만명</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 16,
  },
  posterContainer: {
    width: 120,
    height: 180, // Add fixed height for aspect ratio
    backgroundColor: '#E5E7EB', // neutral-200
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  posterText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
  },
  contentContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  rank: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.light.primary,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginTop: 4,
    marginBottom: 8,
  },
  details: {
    marginTop: 'auto',
  },
  detailText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
});

export default MovieCard;