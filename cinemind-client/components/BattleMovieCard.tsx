import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '@/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

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

const renderRankChange = (rankChange: string | null | undefined) => {
    const change = parseInt(rankChange || '0', 10);
    
    let iconName: 'arrow-up' | 'arrow-down' | 'minus' = 'minus';
    let color = Colors.light.textSecondary;
    let value: string | number = '';

    if (change > 0) {
        iconName = 'arrow-up';
        color = '#22C55E'; // green-500
        value = change;
    } else if (change < 0) {
        iconName = 'arrow-down';
        color = '#EF4444'; // red-500
        value = Math.abs(change);
    }

    return (
        <View style={styles.rankChangeContainer}>
            <FontAwesome name={iconName} color={color} style={{ marginRight: 4 }} />
            <Text style={[styles.detailValue, { color }]}>{value}</Text>
        </View>
    );
};

const BattleMovieCard: React.FC<BattleMovieCardProps> = ({ movie, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.posterContainer}>
        {movie.poster_url ? (
          <Image source={{ uri: movie.poster_url }} style={styles.posterImage} contentFit="cover" />
        ) : (
          <View style={styles.posterPlaceholder}>
            <Text style={styles.posterText}>데이터 없음</Text>
          </View>
        )}
      </View>
      
      <View style={styles.contentContainer}>
        <Text style={styles.title} numberOfLines={1}>{movie.title}</Text>
        
        <View style={styles.detailsContainer}>
            <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>일일 관객</Text>
                <Text style={styles.detailValue}>{movie.daily_audience.toLocaleString()} 명</Text>
            </View>
            <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>누적 관객</Text>
                <Text style={styles.detailValue}>{(movie.audience / 10000).toFixed(1)} 만</Text>
            </View>
             <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>전일 대비</Text>
                {renderRankChange(movie.rank_change)}
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
    marginHorizontal: 8,
    maxWidth: 200,
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
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  detailsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  rankChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default BattleMovieCard;

