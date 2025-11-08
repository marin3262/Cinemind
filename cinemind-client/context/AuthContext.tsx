import React, { createContext, useState, useEffect, useContext } from 'react';
import { useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { Alert } from 'react-native';

const AuthContext = createContext<any>(null);

export function useAuth() {
  return useContext(AuthContext);
}

// This is a temporary workaround version to prevent crashes.
// It disables real authentication and always shows an error on login/signup attempts.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<{ authenticated: boolean }>({
    authenticated: false,
  });
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    // Wait until the navigation container is ready before trying to navigate.
    if (!navigationState?.key) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (authState.authenticated && inAuthGroup) {
      router.replace('/(tabs)');
    } else if (!authState.authenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    }
  }, [authState.authenticated, segments, navigationState?.key]);

  // MOCKED login function
  const login = async (email, password) => {
    Alert.alert("로그인 실패", "아이디 또는 비밀번호가 잘못되었습니다.");
    return { success: false, error: "아이디 또는 비밀번호가 잘못되었습니다." };
  };

  // MOCKED signup function
  const signup = async (username, email, password) => {
    Alert.alert("회원가입 실패", "유효한 이메일 주소 형식이 아닙니다.");
    return { success: false, error: "유효한 이메일 주소 형식이 아닙니다." };
  };

  // Real logout function
  const logout = async () => {
    setAuthState({ authenticated: false });
  };

  const value = {
    onLogin: login,
    onSignup: signup,
    onLogout: logout,
    authState,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
