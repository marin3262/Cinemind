import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, SafeAreaView, Keyboard, Alert, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/theme';
import MovieCard from '@/components/MovieCard';
import MovieModal from '@/components/MovieModal';
import API_BASE_URL from '@/constants/config';
import { authenticatedFetch } from '@/utils/api';
import { useMovieModal } from '@/hooks/useMovieModal';

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { 
    modalVisible, 
    selectedMovie, 
    isDetailLoading, 
    handleMoviePress: openMovieModal, 
    handleCloseModal, 
    handleSaveRating 
  } = useMovieModal();

  // Debounce effect for search input
  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    const handler = setTimeout(async () => {
      try {
        const encodedQuery = encodeURIComponent(searchQuery);
        const response = await fetch(`${API_BASE_URL}/movies/search?query=${encodedQuery}`);
        if (!response.ok) {
          throw new Error('검색 결과를 불러오는 데 실패했습니다.');
        }
        const data = await response.json();
        setSearchResults(data);
      } catch (e: any) {
        Alert.alert('오류', e.message);
      } finally {
        setIsLoading(false);
      }
    }, 500); // 500ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);
  
  const handleCardPress = (movie: any) => {
    // 검색 결과는 TMDB의 결과이므로, TMDB ID를 사용하도록 movie 객체와 타입을 전달
    openMovieModal(movie, 'tmdb');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>영화 검색</Text>
          <Text style={styles.subtitle}>찾고 싶은 영화 제목을 입력해주세요.</Text>
        </View>

        <View style={styles.searchContainer}>
          <TextInput 
            style={styles.input} 
            placeholder="영화 제목 검색..." 
            value={searchQuery} 
            onChangeText={setSearchQuery} 
            onBlur={() => Keyboard.dismiss()} 
            clearButtonMode="while-editing"
          />
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => <MovieCard movie={item} onPress={() => handleCardPress(item)} />}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={() => (
              <View style={styles.placeholderContainer}>
                <Text style={styles.placeholderText}>
                  {searchQuery.length > 0 ? '검색 결과가 없습니다.' : '검색 결과가 여기에 표시됩니다.'}
                </Text>
              </View>
            )}
            onScrollBeginDrag={() => Keyboard.dismiss()}
          />
        )}
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
