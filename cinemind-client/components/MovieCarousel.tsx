import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import PosterCard from './PosterCard';
import { Colors } from '@/constants/theme';

type MovieCarouselProps = {
  title: string;
  movies: any[];
  onMoviePress: (movie: any) => void;
};

const MovieCarousel = ({ title, movies, onMoviePress }: MovieCarouselProps) => {
  if (!movies || movies.length === 0) {
    return null; // 영화 목록이 없으면 아무것도 렌더링하지 않음
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <FlatList
        data={movies}
        renderItem={({ item }) => (
          <PosterCard movie={item} onPress={() => onMoviePress(item)} />
        )}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  listContent: {
    paddingLeft: 16,
    paddingRight: 4, // 끝에 약간의 여백
  },
});

export default MovieCarousel;
