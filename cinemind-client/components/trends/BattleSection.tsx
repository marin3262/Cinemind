import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import BattleMovieCard from '@/components/BattleMovieCard';
import AudienceShareBar from '@/components/AudienceShareBar';

const EmptyStateCard = ({ message }: { message: string }) => (
    <View style={styles.noDataCard}>
        <Text style={styles.noDataText}>{message}</Text>
    </View>
);

const BattleSection = ({ battleData, handleMoviePress }) => {
    return (
        <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>오늘의 매치업</Text>
            <Text style={styles.sectionSubtitle}>국내 vs 해외 박스오피스 1위</Text>
            {battleData && (battleData.korean || battleData.foreign) ? (
                <>
                    <View style={styles.battleContainer}>
                        <View style={styles.battleCard}>
                            <Text style={styles.battleTitle}>국내 영화 1위</Text>
                            {battleData.korean ? <BattleMovieCard movie={battleData.korean} onPress={() => handleMoviePress(battleData.korean, 'kobis')} /> : <EmptyStateCard message="데이터 없음" />}
                        </View>
                        <View style={styles.battleCard}>
                            <Text style={styles.battleTitle}>해외 영화 1위</Text>
                            {battleData.foreign ? <BattleMovieCard movie={battleData.foreign} onPress={() => handleMoviePress(battleData.foreign, 'kobis')} /> : <EmptyStateCard message="데이터 없음" />}
                        </View>
                    </View>
                    {battleData.korean && battleData.foreign && (
                        <AudienceShareBar 
                            koreanAudience={battleData.korean.daily_audience} 
                            foreignAudience={battleData.foreign.daily_audience} 
                        />
                    )}
                </>
            ) : (
                <EmptyStateCard message="매치업 정보를 불러올 수 없습니다." />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    sectionContainer: { marginBottom: 40 },
    sectionTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.light.text, marginBottom: 4, paddingHorizontal: 16 },
    sectionSubtitle: { fontSize: 14, color: Colors.light.textSecondary, marginBottom: 16, paddingHorizontal: 16 },
    noDataCard: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 20,
        marginHorizontal: 16,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 100,
    },
    noDataText: { color: Colors.light.textSecondary, fontSize: 14, textAlign: 'center' },
    battleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 8,
        marginBottom: 16,
    },
    battleCard: {
        flex: 1,
        alignItems: 'center',
    },
    battleTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        color: Colors.light.textSecondary,
    },
});

export default React.memo(BattleSection);
