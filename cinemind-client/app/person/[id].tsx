import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack, useNavigation } from 'expo-router';
import { authenticatedFetch } from '@/utils/api';
import API_BASE_URL from '@/constants/config';
import { Colors } from '@/constants/theme';
import MovieModal from '@/components/MovieModal';
import { useMovieModal } from '@/hooks/useMovieModal';
import { FontAwesome } from '@expo/vector-icons';

interface FilmoItem {
    movieCd: string;
    movieNm: string;
    category: string; // This comes from KOBIS, might be '배우', '감독' etc.
}

interface PersonDetails {
    personCd: string;
    personNm: string;
    repRoleNm: string;
    filmos: FilmoItem[];
}

const PersonDetailScreen = () => {
    const { id: personId, name: personName } = useLocalSearchParams<{ id: string, name?: string }>();
    const router = useRouter();
    const navigation = useNavigation();
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

    // Set header title dynamically
    useLayoutEffect(() => {
        const title = personDetails?.personNm || personName || '영화인 정보';
        navigation.setOptions({ title });
    }, [navigation, personDetails, personName]);


    useEffect(() => {
        if (!personId) return;
        const fetchPersonDetails = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await authenticatedFetch(`${API_BASE_URL}/person/${personId}`);
                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.detail || '영화인 정보를 불러오는 데 실패했습니다.');
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
            // Use 'repRoleNm' if category is missing, default to '출연작'
            const category = filmo.category || repRoleNm || '출연작';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(filmo);
            return acc;
        }, {} as Record<string, FilmoItem[]>);

        return (
            <ScrollView style={styles.container}>
                <View style={styles.personHeader}>
                    <Text style={styles.title}>{personNm}</Text>
                    <Text style={styles.subtitle}>{repRoleNm}</Text>
                </View>

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
            {/* Use Expo Router's Stack to handle the header */}
            <Stack.Screen
                options={{
                    headerTitle: personDetails?.personNm || personName || '로딩 중...',
                    headerBackTitle: '뒤로가기',
                }}
            />
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
    personHeader: {
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6'
    },
    title: { fontSize: 28, fontWeight: 'bold', color: Colors.light.text },
    subtitle: { fontSize: 18, color: Colors.light.textSecondary, marginTop: 4 },
    infoText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: Colors.light.textSecondary },
    section: { paddingHorizontal: 20, paddingVertical: 16 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, borderLeftWidth: 4, borderLeftColor: Colors.light.primary, paddingLeft: 8 },
    movieRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    movieTitle: { fontSize: 16, marginLeft: 12 }
});

export default PersonDetailScreen;