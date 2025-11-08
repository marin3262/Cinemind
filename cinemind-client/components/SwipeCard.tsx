import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Animated from 'react-native-reanimated';
import { Colors } from '@/constants/theme';

type SwipeCardProps = {
  movie: {
    id: number;
    title: string;
    poster: string;
    genre: string;
  };
  style: any;
};

const SwipeCard = ({ movie, style }: SwipeCardProps) => {
  return (
    <Animated.View style={[styles.card, style]}>
      <Image source={{ uri: movie.poster }} style={styles.poster} />
      <View style={styles.gradient}>
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
    padding: 16,
    justifyContent: 'flex-end',
  },
  title: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default SwipeCard;
