import { useState } from 'react';
import { Alert } from 'react-native';
import { authenticatedFetch } from '@/utils/api';
import API_BASE_URL from '@/constants/config';
import * as Haptics from 'expo-haptics'; // Add this import

interface UseMovieModalProps {
    onRatingSaved?: () => void;
}

export function useMovieModal({ onRatingSaved }: UseMovieModalProps = {}) {
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedMovie, setSelectedMovie] = useState<any | null>(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);

    const handleMoviePress = async (movie: any, type: 'kobis' | 'tmdb' = 'kobis') => {
        setModalVisible(true);
        setIsDetailLoading(true);
        setSelectedMovie(movie);
        try {
            let endpoint = '';
            const movieIdStr = String(movie.id);

            if (type === 'kobis') {
                endpoint = `${API_BASE_URL}/movies/${movieIdStr}`;
            } else { // tmdb
                endpoint = `${API_BASE_URL}/movies/tmdb/${movieIdStr}`;
            }

            const response = await authenticatedFetch(endpoint);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: '상세 정보를 불러오는 데 실패했습니다.' }));
                throw new Error(errorData.detail);
            }
            const details = await response.json();
            setSelectedMovie(details);
        } catch (e: any) {
            Alert.alert('오류', e.message);
            handleCloseModal();
        } finally {
            setIsDetailLoading(false);
        }
    };

    const handleCloseModal = () => {
        setModalVisible(false);
        setSelectedMovie(null);
    };

    const handleSaveRating = async (movieId: string | number, rating: number) => {
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/ratings`, {
                method: 'POST',
                body: JSON.stringify({ 
                    movie_id: String(movieId), 
                    rating: rating,
                    source: 'in_app' // 출처 명시
                }),
            });
            if (!response.ok) {
                throw new Error('평점 저장에 실패했습니다.');
            }
            
            handleCloseModal();
            onRatingSaved?.();
            Alert.alert("성공", "평점이 저장되었습니다.");
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // Add haptic feedback here

        } catch (e: any) {
            Alert.alert("오류", e.message);
        }
    };

    const handleToggleLike = async (movieId: string | number, isLiked: boolean) => {
        try {
          const response = await authenticatedFetch(`${API_BASE_URL}/movies/${movieId}/like`, {
            method: isLiked ? 'POST' : 'DELETE',
          });
          if (!response.ok) {
            throw new Error('찜하기 상태 변경에 실패했습니다.');
          }
          // Optimistically update the UI in the modal
          setSelectedMovie((prev: any) => ({ ...prev, is_liked: isLiked }));
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // Add haptic feedback here
        } catch (e: any) {
          Alert.alert("오류", e.message);
          console.error(e);
        }
    };

    return {
        modalVisible,
        selectedMovie,
        isDetailLoading,
        handleMoviePress,
        handleCloseModal,
        handleSaveRating,
        handleToggleLike,
    };
}