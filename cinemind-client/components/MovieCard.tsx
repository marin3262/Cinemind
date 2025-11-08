import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Colors } from '@/constants/theme';

type MovieCardProps = {
  movie: {
    id: number;
    rank: number;
    title: string;
    release: string;
    audience: number;
  };
  onPress: () => void;
};

const MovieCard = ({ movie, onPress }: MovieCardProps) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.posterContainer}>
        <Text style={styles.posterText}>영화포스터</Text>
      </View>
      <View style={styles.contentContainer}>
        <Text style={styles.rank}>RANK {movie.rank}</Text>
        <Text style={styles.title} numberOfLines={2}>{movie.title}</Text>
        <View style={styles.details}>
          <Text style={styles.detailText}>개봉일: {movie.release}</Text>
          <Text style={styles.detailText}>누적 관객: {(movie.audience / 10000).toLocaleString()}만명</Text>
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
    backgroundColor: '#E5E7EB', // neutral-200
    justifyContent: 'center',
    alignItems: 'center',
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
