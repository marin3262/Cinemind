import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Animated from 'react-native-reanimated';
import { Colors } from '@/constants/theme';
import { FontAwesome } from '@expo/vector-icons'; // Import FontAwesome for icons

type SwipeCardProps = {
  movie: {
    movie_id: number;
    title: string;
    poster_url: string;
    genre_name: string;
    actors: string[]; // Actors array
  };
  style: any;
};

const SwipeCard = ({ movie, style }: SwipeCardProps) => {
  return (
    <Animated.View style={[styles.card, style]}>
      <Image source={{ uri: movie.poster_url }} style={styles.poster} />
      <View style={styles.gradient}>
        <View style={styles.tagContainer}>
          <Text style={styles.genreTag}>{movie.genre_name}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>{movie.title}</Text>
        {movie.actors && movie.actors.length > 0 && (
          <View style={styles.actorsContainer}>
            <FontAwesome name="users" size={14} color="#EAEAEA" />
            <Text style={styles.actorsText} numberOfLines={1}>{movie.actors.join(', ')}</Text>
          </View>
        )}
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
    height: '45%', // Increase height to fit more info
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 20,
    justifyContent: 'flex-end',
  },
  tagContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  genreTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    overflow: 'hidden', // Ensures text inside stays within rounded corners
  },
  title: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  actorsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  actorsText: {
    color: '#EAEAEA',
    fontSize: 15,
    marginLeft: 8,
  },
});

export default SwipeCard;
