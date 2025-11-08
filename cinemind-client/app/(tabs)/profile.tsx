import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

export default function ProfileScreen() {
    const { onLogout, authState } = useAuth();
    const user = authState.user;

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <Text style={styles.title}>내 정보</Text>
                
                {user && (
                    <View style={styles.profileInfo}>
                        <Text style={styles.label}>아이디</Text>
                        <Text style={styles.value}>{user.username}</Text>
                        <Text style={styles.label}>이메일</Text>
                        <Text style={styles.value}>{user.email}</Text>
                    </View>
                )}

                <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
                    <FontAwesome name="sign-out" size={20} color="white" />
                    <Text style={styles.logoutButtonText}>로그아웃</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    container: {
        flex: 1,
        padding: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.light.text,
        marginBottom: 24,
    },
    profileInfo: {
        width: '100%',
        backgroundColor: 'white',
        padding: 24,
        borderRadius: 12,
        marginBottom: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    label: {
        fontSize: 16,
        color: Colors.light.textSecondary,
    },
    value: {
        fontSize: 20,
        fontWeight: '500',
        color: Colors.light.text,
        marginBottom: 16,
        marginTop: 4,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.light.textSecondary,
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 8,
        alignSelf: 'center',
    },
    logoutButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18,
        marginLeft: 12,
    },
});