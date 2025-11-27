import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '@/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

// Define the shape of the movie data this card expects
type BattleMovie = {
  id: string;
  rank: number;
  title: string;
  release: string;
  audience: number;
  daily_audience: number;
  rank_change?: string | null;
  poster_url?: string | null;
};

type BattleMovieCardProps = {
  movie: BattleMovie;
  onPress: () => void;
};

// Helper to display rank change with an icon and color
const renderRankChange = (rankChange: string | null | undefined) => {
    if (rankChange === null || rankChange === undefined) {
        return <Text style={[styles.detailValue, { color: Colors.light.textSecondary }]}>-</Text>;
    }
    const change = parseInt(rankChange, 10);
    if (change > 0) {
        return (
            <Text style={[styles.detailValue, { color: '#22C55E' }]}>
                <FontAwesome name="arrow-up" /> {change}
            </Text>
        );
    } else if (change < 0) {
        return (
            <Text style={[styles.detailValue, { color: '#EF4444' }]}>
                <FontAwesome name="arrow-down" /> {Math.abs(change)}
            </Text>
        );
    } else {
        return <Text style={[styles.detailValue, { color: Colors.light.textSecondary }]}>(-)</Text>;
    }
};

const BattleMovieCard: React.FC<BattleMovieCardProps> = ({ movie, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {/* Poster Image */}
      <View style={styles.posterContainer}>
        {movie.poster_url ? (
          <Image source={{ uri: movie.poster_url }} style={styles.posterImage} contentFit="cover" />
        ) : (
          <View style={styles.posterPlaceholder}>
            <Text style={styles.posterText}>이미지 없음</Text>
          </View>
        )}
      </View>
      
      {/* Content */}
      <View style={styles.contentContainer}>
        <Text style={styles.title} numberOfLines={2}>{movie.title}</Text>
        <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>전일 대비 순위</Text>
                {renderRankChange(movie.rank_change)}
            </View>
             <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>일일 관객</Text>
                <Text style={styles.detailValue}>{movie.daily_audience.toLocaleString()} 명</Text>
            </View>
             <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>누적 관객</Text>
                <Text style={styles.detailValue}>{(movie.audience / 10000).toFixed(1)} 만</Text>
            </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
    overflow: 'hidden'
  },
  posterContainer: {
    width: '100%',
    aspectRatio: 2/3,
    backgroundColor: '#F3F4F6',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  posterPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterText: {
    color: Colors.light.textSecondary,
  },
  contentContainer: {
    padding: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.light.text,
    minHeight: 38, // for 2 lines
    marginBottom: 8,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
});

export default BattleMovieCard;
