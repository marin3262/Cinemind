import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

interface TasteAnalysisCardProps {
  tasteTitle: string;
  topGenres: string[];
  preferredEra: string | null;
}

const TasteAnalysisCard: React.FC<TasteAnalysisCardProps> = ({ tasteTitle, topGenres, preferredEra }) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <FontAwesome name="star" size={24} color={Colors.light.primary} style={styles.icon} />
        <Text style={styles.title}>나의 영화 취향 분석</Text>
      </View>
      <Text style={styles.tasteTitle}>{tasteTitle}</Text>
      
      {topGenres.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>선호 장르</Text>
          <View style={styles.genreContainer}>
            {topGenres.map((genre, index) => (
              <View key={index} style={styles.genreTag}>
                <Text style={styles.genreText}>{genre}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {preferredEra && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>선호 시대</Text>
          <View style={styles.eraTag}>
            <Text style={styles.eraText}>{preferredEra}</Text>
          </View>
        </View>
      )}

      {topGenres.length === 0 && !preferredEra && (
        <Text style={styles.noDataText}>아직 취향을 분석할 데이터가 부족해요!{"\n"}영화를 평가하거나 찜해보세요.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  icon: {
    marginRight: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  tasteTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.light.primary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 30,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.textSecondary,
    marginBottom: 8,
  },
  genreContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  genreTag: {
    backgroundColor: Colors.light.tint,
    borderRadius: 15,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  genreText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  eraTag: {
    backgroundColor: Colors.light.secondary,
    borderRadius: 15,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start', // To make it wrap content
  },
  eraText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  noDataText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 24,
  }
});

export default TasteAnalysisCard;
