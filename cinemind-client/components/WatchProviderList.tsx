import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { ThemedText } from './themed-text';
import { Colors } from '@/constants/theme';

interface Provider {
  provider_name: string;
  logo_url: string;
}

interface Props {
  providers: Provider[];
  watchLink?: string | null;
}

const WatchProviderList: React.FC<Props> = ({ providers, watchLink }) => {
  const handlePress = async () => {
    if (watchLink) {
      try {
        const supported = await Linking.canOpenURL(watchLink);
        if (supported) {
          await Linking.openURL(watchLink);
        } else {
          Alert.alert("오류", `이 링크를 열 수 없습니다: ${watchLink}`);
        }
      } catch (error) {
        console.error("URL 열기 중 오류 발생:", error);
        Alert.alert("오류", "링크를 여는 중 문제가 발생했습니다.");
      }
    }
  };

  if (!providers || providers.length === 0) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.title}>볼 수 있는 곳</ThemedText>
        <ThemedText style={styles.noProviderText}>현재 스트리밍 중인 플랫폼 정보가 없습니다.</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <ThemedText style={styles.title}>볼 수 있는 곳</ThemedText>
        {watchLink && (
          <TouchableOpacity style={styles.watchButton} onPress={handlePress}>
            <Text style={styles.watchButtonText}>보러 가기</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.list}>
        {providers.map((provider) => (
          <View key={provider.provider_name} style={styles.provider}>
            <Image source={{ uri: provider.logo_url }} style={styles.logo} />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  provider: {
    alignItems: 'center',
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  noProviderText: {
    color: '#888',
    fontStyle: 'italic',
  },
  watchButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  watchButtonText: {
    color: Colors.light.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default WatchProviderList;
