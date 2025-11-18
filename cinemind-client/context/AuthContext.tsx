import React, { createContext, useState, useEffect, useContext } from 'react';
import { useRouter, useSegments, useRootNavigationState } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import API_BASE_URL from '@/constants/config';
import { Platform }
from 'react-native';

import { TOKEN_KEY } from '@/utils/api';

const USER_DATA_KEY = 'cinemind-user';
const AuthContext = createContext<any>(null);

// Helper function to translate backend errors into Korean
const translateError = (detail: any): string => {
  const errorMap: { [key: string]: string } = {
    "Invalid login credentials": "아이디 또는 비밀번호가 잘못되었습니다.",
    "User already registered": "이미 가입된 이메일입니다.",
    "이미 사용중인 이메일입니다.": "이미 사용중인 이메일입니다.",
    "이미 사용중인 아이디입니다.": "이미 사용중인 아이디입니다.",
  };

  // If the detail is a validation error array, return a generic helpful message.
  if (Array.isArray(detail)) {
    return "입력한 정보가 올바르지 않습니다. 이메일 형식 등을 확인해주세요.";
  }

  // If the detail is a known string, translate it.
  if (typeof detail === 'string' && errorMap[detail]) {
    return errorMap[detail];
  }
  
  // If it's an unknown string, return it as is.
  if (typeof detail === 'string') {
      return detail;
  }

  return '알 수 없는 오류가 발생했습니다.';
};


export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [authState, setAuthState] = useState<{
      token: string | null;
      authenticated: boolean;
      user: any | null;
    }> ({
      token: null,
      authenticated: false,
      user: null,
    });
  
    const [isReady, setIsReady] = useState(false);
    const router = useRouter();
    const segments = useSegments();
    const navigationState = useRootNavigationState();
  
    useEffect(() => {
      const loadAuthData = async () => {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        const userJson = await SecureStore.getItemAsync(USER_DATA_KEY);
        
        if (token && userJson) {
          setAuthState({
            token,
            authenticated: true,
            user: JSON.parse(userJson),
          });
        }
        setIsReady(true);
      };
  
      loadAuthData();
    }, []);
  
    useEffect(() => {
      if (!isReady || !navigationState?.key) return;
  
      const inAuthGroup = segments[0] === '(auth)';
  
      if (authState.authenticated && inAuthGroup) {
        router.replace('/(tabs)');
      } else if (!authState.authenticated && !inAuthGroup) {
        router.replace('/(auth)/login');
      }
    }, [authState.authenticated, segments, navigationState?.key, isReady]);

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = translateError(data.detail || '로그인에 실패했습니다.');
        return { success: false, error: errorMessage };
      }

      await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
      await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(data.user));

      setAuthState({
        token: data.access_token,
        authenticated: true,
        user: data.user,
      });
      return { success: true };
    } catch (e: any) {
      // Log the full error to the console for debugging
      console.error('Login failed:', e);
      // Return a more informative error message
      return { success: false, error: `네트워크 오류: ${e.message || '알 수 없는 오류'}` };
    }
  };

  const signup = async (username, email, password, likedMovieIds: number[] = []) => {
    try {
      const response = await fetch(`${API_BASE_URL}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password, liked_movie_ids: likedMovieIds }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = translateError(data.detail || '회원가입에 실패했습니다.');
        return { success: false, error: errorMessage };
      }
      
      // Directly log in after successful signup
      return await login(email, password);

    } catch (e: any) {
      // Log the full error to the console for debugging
      console.error('Signup failed:', e);
      // Return a more informative error message
      return { success: false, error: `네트워크 오류: ${e.message || '알 수 없는 오류'}` };
    }
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_DATA_KEY);
    setAuthState({
      token: null,
      authenticated: false,
      user: null,
    });
  };

  const value = {
    onLogin: login,
    onSignup: signup,
    onLogout: logout,
    authState,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}