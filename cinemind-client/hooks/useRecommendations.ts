import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { authenticatedFetch } from '@/utils/api';
import API_BASE_URL from '@/constants/config';

export function useRecommendations(moodTag: string | null) {
    const [recommendations, setRecommendations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRecommendations = useCallback(async (currentMood: string | null) => {
        setIsLoading(true);
        setError(null);
        try {
            const endpoint = currentMood 
                ? `${API_BASE_URL}/movies/recommendations?mood_tag=${currentMood}`
                : `${API_BASE_URL}/movies/recommendations`;
            
            const response = await authenticatedFetch(endpoint);
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.detail || '추천을 불러오는 데 실패했습니다.');
            }
            const data = await response.json();
            setRecommendations(data);
        } catch (e: any) {
            setError(e.message);
            setRecommendations([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchRecommendations(moodTag);
        }, [fetchRecommendations, moodTag])
    );

    return { recommendations, isLoading, error, fetchRecommendations };
}
