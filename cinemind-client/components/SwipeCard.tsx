import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Animated from 'react-native-reanimated';
import { Colors } from '@/constants/theme';

type SwipeCardProps = {
  movie: {
    movie_id: number;
    title: string;
    poster_url: string;
    genre_name: string;
  };
  style: any;
};

const SwipeCard = ({ movie, style }: SwipeCardProps) => {
  return (
    <Animated.View style={[styles.card, style]}>
      <Image source={{ uri: movie.poster_url }} style={styles.poster} />
      <View style={styles.gradient}>
        <Text style={styles.genre}>{movie.genre_name}</Text>
        <Text style={styles.title}>{movie.title}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: Colors.light.card,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  poster: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 20,
    justifyContent: 'flex-end',
  },
  genre: {
    color: '#EAEAEA',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  title: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },
});

export default SwipeCard;
