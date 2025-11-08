import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, SafeAreaView, Keyboard, Alert } from 'react-native';
import { Colors } from '@/constants/theme';
import MovieCard from '@/components/MovieCard';
import MovieModal from '@/components/MovieModal';
import API_BASE_URL from '@/constants/config';
import { authenticatedFetch } from '@/utils/api';

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [allMovies, setAllMovies] = useState<any[]>([]);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<any | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  useEffect(() => {
    // Fetch the same list of movies as the home screen to search through
    const fetchMovies = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/movies/box-office`);
        if (!response.ok) throw new Error('Failed to fetch movies');
        const data = await response.json();
        setAllMovies(data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchMovies();
  }, []);

  const filteredMovies = useMemo(() => {
    if (!searchQuery) {
      return [];
    }
    return allMovies.filter(movie => 
      movie.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, allMovies]);

  const handleMoviePress = async (movie: any) => {
    setModalVisible(true);
    setSelectedMovie(movie);
    setIsDetailLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/movies/${movie.id}`);
      if (!response.ok) throw new Error('상세 정보를 불러오는 데 실패했습니다.');
      const details = await response.json();
      setSelectedMovie((prevMovie: any) => ({ ...prevMovie, ...details }));
    } catch (e: any) {
      Alert.alert('오류', e.message);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedMovie(null);
  };
  
  const handleSaveRating = async (movieId: string, rating: number) => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/ratings`, {
        method: 'POST',
        body: JSON.stringify({ movie_id: movieId, rating: rating }),
      });
       if (!response.ok) throw new Error('평점 저장에 실패했습니다.');
      Alert.alert("성공", "평점이 저장되었습니다.");
    } catch (e: any) {
      Alert.alert("오류", e.message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>영화 검색</Text>
          <Text style={styles.subtitle}>찾고 싶은 영화 제목을 입력해주세요.</Text>
        </View>

        <View style={styles.searchContainer}>
          <TextInput style={styles.input} placeholder="영화 제목 검색..." value={searchQuery} onChangeText={setSearchQuery} onBlur={() => Keyboard.dismiss()} />
        </View>

        <FlatList
          data={filteredMovies}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <MovieCard movie={item} onPress={() => handleMoviePress(item)} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={() => (
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderText}>
                {searchQuery.length > 0 ? '검색 결과가 없습니다.' : '검색 결과가 여기에 표시됩니다.'}
              </Text>
            </View>
          )}
        />
      </View>
      <MovieModal 
        visible={modalVisible} 
        onClose={handleCloseModal} 
        movie={selectedMovie} 
        isDetailLoading={isDetailLoading} 
        onSaveRating={handleSaveRating}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F3F4F6' },
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: Colors.light.text },
  subtitle: { fontSize: 16, color: Colors.light.textSecondary, marginTop: 8 },
  searchContainer: { paddingHorizontal: 16, marginBottom: 16 },
  input: { width: '100%', padding: 16, borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, fontSize: 18, backgroundColor: Colors.light.card },
  listContent: { paddingHorizontal: 16 },
  placeholderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  placeholderText: { fontSize: 16, color: Colors.light.textSecondary },
});
