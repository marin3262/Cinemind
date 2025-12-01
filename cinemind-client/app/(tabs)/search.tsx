import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, Keyboard, Alert, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import MovieCard from '@/components/MovieCard';
import MovieModal from '@/components/MovieModal';
import API_BASE_URL from '@/constants/config';
import { authenticatedFetch } from '@/utils/api';
import { useMovieModal } from '@/hooks/useMovieModal';

// 실시간 트렌드 순위 리스트를 위한 컴포넌트
const TrendingList = ({ movies, onPressTitle }: { movies: any[], onPressTitle: (title: string) => void }) => (
  <View style={styles.trendingContainer}>
    <Text style={styles.trendingTitle}>실시간 트렌드 순위</Text>
    <View style={styles.trendingList}>
      {movies.slice(0, 10).map((movie, index) => (
        <TouchableOpacity key={movie.id} style={styles.trendingItem} onPress={() => onPressTitle(movie.title)}>
          <Text style={styles.trendingRank}>{index + 1}</Text>
          <Text style={styles.trendingMovieTitle} numberOfLines={1}>{movie.title}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);


export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false); // 이름 변경: isLoading -> isSearching
  const [hasSearched, setHasSearched] = useState(false);

  // --- Zero State를 위한 새로운 상태 ---
  const [trendingMovies, setTrendingMovies] = useState<any[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  const {
    modalVisible,
    selectedMovie,
    isDetailLoading,
    handleMoviePress: openMovieModal,
    handleCloseModal,
    handleSaveRating,
    handleToggleLike,
  } = useMovieModal();
  
  // Zero State 콘텐츠(트렌드)를 위한 데이터 fetch
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const response = await authenticatedFetch(`${API_BASE_URL}/movies/box-office`);
        if (!response.ok) {
          throw new Error('트렌드 정보를 가져오지 못했습니다.');
        }
        const data = await response.json();
        setTrendingMovies(data);
      } catch (e) {
        // 이 화면에서 오류는 치명적이지 않으므로, 그냥 빈 화면을 보여줌
        console.error(e);
      } finally {
        setIsInitialLoading(false);
      }
    };
    fetchTrending();
  }, []);

  // 검색어 입력에 따른 Debounce 검색 로직
  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setHasSearched(true);
    setIsSearching(true);
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
        setIsSearching(false);
      }
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);
  
  const handleCardPress = (movie: any) => {
    openMovieModal(movie, 'tmdb');
  };

  const renderContent = () => {
    // 검색어가 입력되어 검색 결과가 나온 경우
    if (hasSearched) {
      if (isSearching) {
        return <ActivityIndicator size="large" color={Colors.light.primary} style={styles.feedbackContainer} />;
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
    }

    // 검색어가 없는 초기 화면 (Zero State)
    if (isInitialLoading) {
      return <ActivityIndicator size="large" color={Colors.light.primary} style={styles.feedbackContainer} />;
    }
    
    return (
      <ScrollView onScrollBeginDrag={() => Keyboard.dismiss()} keyboardShouldPersistTaps="handled">
        <TrendingList movies={trendingMovies} onPressTitle={setSearchQuery} />
        {/* 여기에 나중에 '추천 검색어' 같은 다른 Zero State 컴포넌트를 추가할 수 있음 */}
      </ScrollView>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: '검색' }} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
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
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'white' },
  container: { flex: 1 },
  searchContainer: { padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  input: { width: '100%', padding: 16, borderWidth: 1, borderColor: Colors.light.border, borderRadius: 12, fontSize: 16, backgroundColor: '#f9f9f9' },
  listContent: { padding: 16, paddingTop: 0 },
  feedbackContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
  placeholderText: { fontSize: 16, color: Colors.light.textSecondary, marginTop: 16 },
  // --- Trending List Styles ---
  trendingContainer: {
    padding: 16,
  },
  trendingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  trendingList: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  trendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  trendingRank: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.primary,
    width: 30,
  },
  trendingMovieTitle: {
    fontSize: 16,
    flex: 1, // Ensure title takes remaining space
  },
});