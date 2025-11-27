import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { authenticatedFetch } from '@/utils/api';
import API_BASE_URL from '@/constants/config';
import { Colors } from '@/constants/theme';
import MovieModal from '@/components/MovieModal';
import { useMovieModal } from '@/hooks/useMovieModal';
import { FontAwesome } from '@expo/vector-icons';

interface FilmoItem {
    movieCd: string;
    movieNm: string;
    category: string;
}

interface PersonDetails {
    personCd: string;
    personNm: string;
    repRoleNm: string;
    filmos: FilmoItem[];
}

const PersonDetailScreen = () => {
    const { id: personId } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [personDetails, setPersonDetails] = useState<PersonDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const {
        modalVisible,
        selectedMovie,
        isDetailLoading,
        handleMoviePress,
        handleCloseModal,
        handleSaveRating,
        handleToggleLike,
    } = useMovieModal();

    useEffect(() => {
        if (!personId) return;
        const fetchPersonDetails = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await authenticatedFetch(`${API_BASE_URL}/person/${personId}`);
                if (!response.ok) {
                    throw new Error('영화인 정보를 불러오는 데 실패했습니다.');
                }
                const data: PersonDetails = await response.json();
                setPersonDetails(data);
            } catch (e: any) {
                setError(e.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPersonDetails();
    }, [personId]);

    const renderContent = () => {
        if (isLoading) {
            return <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 50 }} />;
        }
        if (error || !personDetails) {
            return <Text style={styles.infoText}>{error || '정보를 찾을 수 없습니다.'}</Text>;
        }

        const { personNm, repRoleNm, filmos } = personDetails;

        // Group filmography by category (e.g., '감독', '배우')
        const groupedFilmos = filmos.reduce((acc, filmo) => {
            const category = filmo.category || '기타';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(filmo);
            return acc;
        }, {} as Record<string, FilmoItem[]>);

        return (
            <ScrollView>
                {Object.entries(groupedFilmos).map(([category, movies]) => (
                    <View key={category} style={styles.section}>
                        <Text style={styles.sectionTitle}>{category}</Text>
                        {movies.map((movie, index) => (
                            <TouchableOpacity 
                                key={`${movie.movieCd}-${index}`} 
                                style={styles.movieRow} 
                                onPress={() => handleMoviePress({ id: movie.movieCd, title: movie.movieNm }, 'kobis')}
                            >
                                <FontAwesome name="film" size={16} color={Colors.light.textSecondary} />
                                <Text style={styles.movieTitle}>{movie.movieNm}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                ))}
            </ScrollView>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="arrow-left" size={24} color={Colors.light.text} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.title}>{personDetails?.personNm || '영화인 정보'}</Text>
                    {personDetails?.repRoleNm && <Text style={styles.subtitle}>{personDetails.repRoleNm}</Text>}
                </View>
            </View>
            {renderContent()}
            {selectedMovie && (
                <MovieModal
                    visible={modalVisible}
                    onClose={handleCloseModal}
                    movie={selectedMovie}
                    isDetailLoading={isDetailLoading}
                    onSaveRating={handleSaveRating}
                    onToggleLike={handleToggleLike}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: 'white' },
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6'
    },
    backButton: { marginRight: 16, padding: 4 },
    title: { fontSize: 24, fontWeight: 'bold', color: Colors.light.text },
    subtitle: { fontSize: 16, color: Colors.light.textSecondary },
    infoText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: Colors.light.textSecondary },
    section: { paddingHorizontal: 20, paddingVertical: 16 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, borderLeftWidth: 4, borderLeftColor: Colors.light.primary, paddingLeft: 8 },
    movieRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    movieTitle: { fontSize: 16, marginLeft: 12 }
});

export default PersonDetailScreen;
