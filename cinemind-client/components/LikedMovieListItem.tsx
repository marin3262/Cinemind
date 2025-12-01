import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '@/constants/theme';
import { LikedMovie } from '@/app/my-likes'; // Assuming type is exported from my-likes

const LikedMovieListItem: React.FC<{ movie: LikedMovie, onPress: () => void }> = ({ movie, onPress }) => {

  const formattedDate = new Date(movie.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <Image source={{ uri: movie.poster_url || undefined }} style={styles.poster} />
      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={2}>{movie.title}</Text>
        <Text style={styles.dateText}>찜한 날짜: {formattedDate}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: 'white',
  },
  poster: {
    width: 80,
    height: 120,
    borderRadius: 4,
    backgroundColor: Colors.light.background,
    marginRight: 16,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
});

export default LikedMovieListItem;
