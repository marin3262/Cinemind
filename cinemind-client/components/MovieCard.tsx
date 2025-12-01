import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '@/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

type MovieCardProps = {
  movie: {
    id: number | string;
    title: string;
    poster_url?: string | null;
    rank?: number;
    release?: string;
    release_date?: string;
    audience?: number;
    daily_audience?: number;
    recommendation_reason?: string | null;
  };
  onPress: () => void;
  displayRank?: number;
  displayAudience?: number;
  audienceLabel?: string;
};

const MovieCard = ({ movie, onPress, displayRank, displayAudience, audienceLabel }: MovieCardProps) => {
  const hasBoxOfficeInfo = displayRank || movie.rank;
  const releaseDate = movie.release || movie.release_date;
  const audienceInfo = displayAudience ?? movie.audience;

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
      <View style={styles.contentContainer}>
        {movie.recommendation_reason && (
            <View style={styles.reasonContainer}>
                <FontAwesome name="magic" size={12} color={Colors.light.tint} />
                <Text style={styles.reasonText}>{movie.recommendation_reason}</Text>
            </View>
        )}
        {hasBoxOfficeInfo ? (
          <Text style={styles.rank}>RANK {displayRank ?? movie.rank}</Text>
        ) : null}
        <Text style={styles.title} numberOfLines={2}>{movie.title}</Text>
        
        {(releaseDate || (audienceInfo !== undefined && audienceLabel)) ? (
          <View style={styles.details}>
            {releaseDate ? <Text style={styles.detailText}>개봉일: {releaseDate}</Text> : null}
            {(audienceInfo !== undefined && audienceLabel) ? (
              <Text style={styles.detailText}>{audienceLabel}: {Math.round(audienceInfo / 10000).toLocaleString()}만명</Text>
            ) : null}
          </View>
        ) : null}
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
    height: 180,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
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
  reasonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  reasonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.light.tint,
    marginLeft: 6,
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
