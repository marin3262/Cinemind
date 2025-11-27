import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Colors } from '@/constants/theme';
import { getSimilarMovies } from '../utils/api';
import MovieCarousel from './MovieCarousel';
import WatchProviderList from './WatchProviderList';

type MovieDetails = {
  id: string;
  rank?: number;
  title: string;
  release: string;
  audience?: number;
  genres?: { genreNm: string }[] | string[];
  runtime?: string;
  synopsis?: string;
  poster_url?: string | null;
  backdrop_url?: string | null;
  user_rating?: number | null;
  is_liked?: boolean;
  error?: string | null;
};

type MovieModalProps = {
  visible: boolean;
  onClose: () => void;
  movie: MovieDetails | null;
  isDetailLoading: boolean;
  onSaveRating: (movieId: string | number, rating: number) => void;
  onToggleLike: (movieId: string | number, isLiked: boolean) => void;
};

const MovieModal = ({ visible, onClose, movie, isDetailLoading, onSaveRating, onToggleLike }: MovieModalProps) => {
  const [userRating, setUserRating] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [similarMovies, setSimilarMovies] = useState<any[]>([]);
  const [isSimilarLoading, setIsSimilarLoading] = useState(false);

  useEffect(() => {
    if (movie) {
      setUserRating(movie.user_rating || 0);
      setIsLiked(movie.is_liked || false);
      
      const fetchSimilar = async () => {
        if (movie.id) {
          setIsSimilarLoading(true);
          setSimilarMovies([]); // Reset on new movie
          const movies = await getSimilarMovies(movie.id);
          setSimilarMovies(movies);
          setIsSimilarLoading(false);
        }
      };
      fetchSimilar();
    }
  }, [movie]);

  if (!movie) {
    return null;
  }

  const handleSaveRating = () => {
    if (userRating > 0) {
      onSaveRating(movie.id, userRating);
    } else {
      Alert.alert("알림", "먼저 평점을 선택해주세요.");
    }
  };

  const handleToggleLike = () => {
    onToggleLike(movie.id, !isLiked);
    setIsLiked(!isLiked); // Optimistically update UI
  };

  const renderStars = () => {
    return [1, 2, 3, 4, 5].map((star) => (
      <TouchableOpacity key={star} onPress={() => setUserRating(star)}>
        <FontAwesome 
          name={star <= userRating ? 'star' : 'star-o'} 
          size={30} 
          color={Colors.light.primary} 
          style={{ marginRight: 8 }}
        />
      </TouchableOpacity>
    ));
  };

  const getGenreNames = () => {
    if (!movie.genres || movie.genres.length === 0) return 'N/A';
    if (typeof movie.genres[0] === 'string') return (movie.genres as string[]).join(', ');
    return (movie.genres as { genreNm: string }[]).map(g => g.genreNm).join(', ');
  };
  
  const imageUri = movie.backdrop_url || movie.poster_url;

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <FontAwesome name="close" size={24} color={Colors.light.textSecondary} />
          </TouchableOpacity>
          
          <ScrollView>
            <View style={styles.posterContainer}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.posterImage} contentFit="cover" />
              ) : (
                <Text style={styles.posterText}>이미지 없음</Text>
              )}
            </View>
            <View style={styles.contentContainer}>
              <Text style={styles.title}>{movie.title}</Text>
              
              {movie.error ? (
                <Text style={styles.errorText}>{movie.error}</Text>
              ) : isDetailLoading ? (
                <ActivityIndicator style={{ marginVertical: 40 }} size="large" color={Colors.light.primary} />
              ) : (
                <>
                  <View style={styles.detailsGrid}>
                    <Text style={styles.detailItem}>장르: {getGenreNames()}</Text>
                    <Text style={styles.detailItem}>개봉일: {movie.release}</Text>
                    <Text style={styles.detailItem}>상영 시간: {movie.runtime || 'N/A'} 분</Text>
                  </View>
                  <Text style={styles.synopsisTitle}>줄거리</Text>
                  <Text style={styles.synopsis}>{movie.synopsis || '줄거리 정보가 없습니다.'}</Text>
                  
                  {movie.watch_providers && movie.watch_providers.length > 0 && (
                    <WatchProviderList providers={movie.watch_providers} watchLink={movie.watch_link} />
                  )}

                  <Text style={styles.synopsisTitle}>내 평점</Text>
                  <View style={styles.ratingInputContainer}>{renderStars()}</View>
                  
                  <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.saveButton} onPress={handleSaveRating}>
                      <Text style={styles.saveButtonText}>평점 저장</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.likeButton} onPress={handleToggleLike}>
                      <FontAwesome name={isLiked ? 'heart' : 'heart-o'} size={24} color={isLiked ? Colors.light.error : Colors.light.primary} />
                    </TouchableOpacity>
                  </View>

                  {isSimilarLoading ? (
                    <ActivityIndicator style={{ marginTop: 20 }} size="large" />
                  ) : similarMovies.length > 0 ? (
                    <View style={styles.similarContainer}>
                      <Text style={styles.synopsisTitle}>이런 영화는 어떠세요?</Text>
                      <MovieCarousel 
                        movies={similarMovies}
                        onMoviePress={(selectedMovie) => {
                          // TODO: Close current modal and open new one for selectedMovie
                          console.log("Selected similar movie:", selectedMovie.id);
                        }}
                      />
                    </View>
                  ) : null}
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
    centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
    modalView: { margin: 20, backgroundColor: 'white', borderRadius: 20, width: '90%', maxHeight: '80%', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
    closeButton: { position: 'absolute', top: 16, right: 16, zIndex: 1, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 15, width: 30, height: 30, justifyContent: 'center', alignItems: 'center' },
    posterContainer: { height: 250, backgroundColor: '#E5E7EB', borderTopLeftRadius: 20, borderTopRightRadius: 20, justifyContent: 'center', alignItems: 'center' },
    posterImage: { width: '100%', height: '100%', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    posterText: { color: Colors.light.textSecondary },
    contentContainer: { padding: 24 },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 16 },
    detailsGrid: { marginBottom: 16 },
    detailItem: { fontSize: 16, color: Colors.light.textSecondary, marginBottom: 6 },
    synopsisTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 8, marginBottom: 8 },
    synopsis: { fontSize: 16, lineHeight: 24, color: Colors.light.text },
    ratingInputContainer: { flexDirection: 'row', justifyContent: 'center', marginVertical: 20 },
    buttonContainer: {
      flexDirection: 'row',
      marginTop: 16,
      alignItems: 'center',
    },
    saveButton: {
      flex: 1,
      backgroundColor: Colors.light.primary,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
    },
    saveButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    likeButton: {
      padding: 12,
      marginLeft: 12,
      borderWidth: 1,
      borderColor: Colors.light.primary,
      borderRadius: 8,
    },
    errorText: {
      fontSize: 16,
      color: Colors.light.error,
      textAlign: 'center',
      marginVertical: 20,
    },
    similarContainer: {
      marginTop: 24,
    }
});

export default MovieModal;
