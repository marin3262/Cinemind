import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, SafeAreaView, Keyboard, Alert, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
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
  const [hasSearched, setHasSearched] = useState(false); // To track if a search has been initiated

  const {
    modalVisible,
    selectedMovie,
    isDetailLoading,
    handleMoviePress: openMovieModal,
    handleCloseModal,
    handleSaveRating,
    handleToggleLike,
  } = useMovieModal();
  
  // Debounce effect for search input
  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setSearchResults([]);
      setHasSearched(false); // Reset search status
      return;
    }

    setHasSearched(true); // A search is about to happen
    setIsLoading(true);
    const handler = setTimeout(async () => {
      try {
        const encodedQuery = encodeURIComponent(searchQuery);
        const response = await authenticatedFetch(`${API_BASE_URL}/movies/search?query=${encodedQuery}`);
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
    openMovieModal(movie, 'tmdb');
  };

  const renderContent = () => {
    if (isLoading) {
      return <ActivityIndicator size="large" color={Colors.light.primary} style={styles.feedbackContainer} />;
    }
    
    if (!hasSearched) {
      return (
        <View style={styles.feedbackContainer}>
          <FontAwesome name="search" size={40} color={Colors.light.textSecondary} />
          <Text style={styles.placeholderText}>어떤 영화를 찾아볼까요?</Text>
        </View>
      );
    }
    
    if (searchResults.length === 0) {
      return (
        <View style={styles.feedbackContainer}>
          <FontAwesome name="film" size={40} color={Colors.light.textSecondary} />
          <Text style={styles.placeholderText}>'{searchQuery}'에 대한 검색 결과가 없습니다.</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={searchResults}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <MovieCard movie={item} onPress={() => handleCardPress(item)} />}
        contentContainerStyle={styles.listContent}
        onScrollBeginDrag={() => Keyboard.dismiss()}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>영화 검색</Text>
        </View>

        <View style={styles.searchContainer}>
          <TextInput 
            style={styles.input} 
            placeholder="영화 제목을 입력하세요..."
            value={searchQuery} 
            onChangeText={setSearchQuery} 
            clearButtonMode="while-editing"
            autoCapitalize="none"
          />
        </View>

        {renderContent()}

      </View>
      <MovieModal 
        visible={modalVisible} 
        onClose={handleCloseModal} 
        movie={selectedMovie} 
        isDetailLoading={isDetailLoading} 
        onSaveRating={handleSaveRating}
        onToggleLike={handleToggleLike}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'white' },
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 16, backgroundColor: 'white' },
  title: { fontSize: 28, fontWeight: 'bold', color: Colors.light.text },
  searchContainer: { padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  input: { width: '100%', padding: 16, borderWidth: 1, borderColor: Colors.light.border, borderRadius: 12, fontSize: 16, backgroundColor: '#f9f9f9' },
  listContent: { padding: 16, paddingTop: 0 },
  feedbackContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
  placeholderText: { fontSize: 16, color: Colors.light.textSecondary, marginTop: 16 },
});