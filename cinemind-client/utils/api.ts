import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'cinemind-token';

export const getAuthHeader = async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) {
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }
    return {
        'Content-Type': 'application/json',
    };
};

export const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const headers = await getAuthHeader();
    const response = await fetch(url, {
        ...options,
        headers: {
            ...headers,
            ...options.headers,
        },
    });
    return response;
};
