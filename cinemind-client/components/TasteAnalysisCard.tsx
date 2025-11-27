import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/theme';
import { FontAwesome } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';
import { useRouter } from 'expo-router'; // Import useRouter

// Backend의 TasteAnalysisResponse 스키마와 일치하는 TypeScript 인터페이스
interface RatingDistributionItem {
  rating: number;
  count: number;
}

interface Person {
  id: string;
  name: string;
}

interface TasteAnalysisResponse {
  total_ratings: number;
  analysis_title: string;
  top_genres: string[];
  rating_distribution: RatingDistributionItem[];
  top_actors: Person[];
  top_directors: Person[];
}

const screenWidth = Dimensions.get('window').width;

const TasteAnalysisCard: React.FC<{ analysis: TasteAnalysisResponse | null }> = ({ analysis }) => {
  const router = useRouter(); // Initialize router

  if (!analysis || analysis.total_ratings < 3) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <FontAwesome name="bar-chart" size={24} color={Colors.light.textSecondary} style={styles.icon} />
          <Text style={styles.title}>나의 영화 취향 분석</Text>
        </View>
        <Text style={styles.noDataText}>아직 취향을 분석할 데이터가 부족해요!{"\n"}영화 3편 이상에 평점을 매겨주세요.</Text>
      </View>
    );
  }

  const { total_ratings, analysis_title, top_genres, rating_distribution, top_actors, top_directors } = analysis;

  // --- Data Transformation for Pie Chart ---
  const ratingColors = ['#FEE2E2', '#FDE68A', '#A7F3D0', '#A5B4FC', '#F59E0B'];
  const pieChartData = rating_distribution
    .filter(item => item.count > 0) // Show only ratings that have been used
    .map((item, index) => {
      const percentage = total_ratings > 0 ? (item.count / total_ratings) * 100 : 0;
      return {
        name: `${item.rating}점`,
        population: item.count,
        percentage: percentage,
        color: ratingColors[item.rating - 1] || '#D1D5DB',
        legendFontColor: Colors.light.textSecondary,
        legendFontSize: 14,
      };
    })
    .sort((a, b) => b.population - a.population); // Sort by count descending
  
  const handlePersonPress = (personId: string) => {
    router.push(`/person/${personId}`);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <FontAwesome name="bar-chart" size={24} color={Colors.light.primary} style={styles.icon} />
        <Text style={styles.title}>나의 영화 취향 분석</Text>
      </View>

      <Text style={styles.tasteTitle}>{analysis_title}</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>총 평가한 영화</Text>
        <Text style={styles.totalRatingsText}>{total_ratings}편</Text>
      </View>

      {top_genres.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>선호 장르 TOP 3</Text>
          <View style={styles.tagContainer}>
            {top_genres.map((genre, index) => (
              <View key={index} style={styles.genreTag}>
                <Text style={styles.tagText}>#{genre}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {top_directors.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>선호 감독</Text>
          <View style={styles.tagContainer}>
            {top_directors.map((director) => (
              <TouchableOpacity key={director.id} style={styles.directorTag} onPress={() => handlePersonPress(director.id)}>
                <Text style={styles.personText}>{director.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {top_actors.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>선호 배우</Text>
          <View style={styles.tagContainer}>
            {top_actors.map((actor) => (
              <TouchableOpacity key={actor.id} style={styles.actorTag} onPress={() => handlePersonPress(actor.id)}>
                <Text style={styles.personText}>{actor.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>별점 분포 <Text style={styles.chartSubtitle}>(단위: 편)</Text></Text>
        <PieChart
          data={pieChartData}
          width={screenWidth - 40}
          height={220}
          chartConfig={{
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          }}
          accessor={"population"}
          backgroundColor={"transparent"}
          paddingLeft={"15"}
          center={[10, 0]}
          hasLegend={false} // Hide default legend
        />
        <View style={styles.legendContainer}>
          {pieChartData.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: item.color }]} />
              <Text style={styles.legendText}>
                {item.percentage.toFixed(1)}%
                <Text style={styles.legendDetailText}> | {item.name} ({item.population}편)</Text>
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 15,
  },
  icon: {
    marginRight: 12,
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
    marginBottom: 25,
    lineHeight: 30,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    marginBottom: 12,
  },
  totalRatingsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  genreTag: {
    backgroundColor: '#FEF3C7', // amber-100
    borderRadius: 15,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: '#92400E', // amber-800
    fontSize: 14,
    fontWeight: '600',
  },
  directorTag: {
    backgroundColor: '#DBEAFE', // blue-100
    borderRadius: 15,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  actorTag: {
    backgroundColor: '#D1FAE5', // green-100
    borderRadius: 15,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  personText: {
    color: '#1E40AF', // blue-800
    fontSize: 14,
    fontWeight: '500',
  },
  noDataText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    paddingVertical: 30,
    lineHeight: 24,
  },
  chartSubtitle: {
    fontSize: 14,
    fontWeight: 'normal',
    color: Colors.light.textSecondary,
  },
  legendContainer: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  legendText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  legendDetailText: {
    fontWeight: 'normal',
    color: Colors.light.textSecondary,
  }
});

export default TasteAnalysisCard;
