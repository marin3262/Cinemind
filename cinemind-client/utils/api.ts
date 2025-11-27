import * as SecureStore from 'expo-secure-store';
import API_BASE_URL from '../constants/config';

// Define the Movie type for reuse
export interface Movie {
  id: string | number;
  title: string;
  poster_url: string | null;
  release_date?: string;
  overview?: string;
  vote_average?: number;
  // Add other fields if necessary
}

export const TOKEN_KEY = 'cinemind-token';

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
        } as HeadersInit,
    });
    return response;
};

/**
 * Fetches a list of movies from a given API endpoint with pagination.
 * @param apiUrl The API endpoint to fetch movies from (e.g., '/movies/trending').
 * @param page The page number to fetch.
 * @returns A promise that resolves to an array of Movie objects.
 */
export const getMoviesByApi = async (apiUrl: string, page: number): Promise<Movie[]> => {
    try {
        const url = `${API_BASE_URL}${apiUrl}?page=${page}`;
        const response = await authenticatedFetch(url);
        if (!response.ok) {
            console.error(`Error fetching movies from ${apiUrl}: ${response.statusText}`);
            return [];
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Failed to fetch movies from ${apiUrl}:`, error);
        return [];
    }
};

export const getSimilarMovies = async (movieId: string | number): Promise<Movie[]> => {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/movies/${movieId}/similar`);
        if (!response.ok) {
            console.error(`Error fetching similar movies: ${response.statusText}`);
            return [];
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Failed to fetch similar movies:', error);
        return [];
    }
};
