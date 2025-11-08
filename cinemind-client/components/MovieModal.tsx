import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

type MovieDetails = {
  id: string;
  rank?: number;
  title: string;
  release: string;
  audience?: number;
  genres?: { genreNm: string }[] | string[];
  runtime?: string;
  synopsis?: string;
};

type MovieModalProps = {
  visible: boolean;
  onClose: () => void;
  movie: MovieDetails | null;
  isDetailLoading: boolean;
  onSaveRating: (movieId: string, rating: number) => void;
};

const MovieModal = ({ visible, onClose, movie, isDetailLoading, onSaveRating }: MovieModalProps) => {
  const [userRating, setUserRating] = useState(0);

  useEffect(() => {
    setUserRating(0);
  }, [movie]);

  if (!movie) {
    return null;
  }

  const handleSave = () => {
    if (userRating > 0) {
      onSaveRating(movie.id, userRating);
      Alert.alert("성공", "평점이 저장되었습니다.");
    } else {
      Alert.alert("알림", "먼저 평점을 선택해주세요.");
    }
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

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <FontAwesome name="close" size={24} color={Colors.light.textSecondary} />
          </TouchableOpacity>
          
          <ScrollView>
            <View style={styles.posterContainer}><Text style={styles.posterText}>영화포스터</Text></View>
            <View style={styles.contentContainer}>
              <Text style={styles.title}>{movie.title}</Text>
              
              {isDetailLoading ? (
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
                  
                  <Text style={styles.synopsisTitle}>내 평점</Text>
                  <View style={styles.ratingInputContainer}>{renderStars()}</View>
                  <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>평점 저장</Text>
                  </TouchableOpacity>
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
    closeButton: { position: 'absolute', top: 16, right: 16, zIndex: 1 },
    posterContainer: { height: 250, backgroundColor: '#E5E7EB', borderTopLeftRadius: 20, borderTopRightRadius: 20, justifyContent: 'center', alignItems: 'center' },
    posterText: { color: Colors.light.textSecondary },
    contentContainer: { padding: 24 },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 16 },
    detailsGrid: { marginBottom: 16 },
    detailItem: { fontSize: 16, color: Colors.light.textSecondary, marginBottom: 6 },
    synopsisTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 8, marginBottom: 8 },
    synopsis: { fontSize: 16, lineHeight: 24, color: Colors.light.text },
    ratingInputContainer: { flexDirection: 'row', justifyContent: 'center', marginVertical: 20 },
    saveButton: { backgroundColor: Colors.light.primary, paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 16 },
    saveButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});

export default MovieModal;
