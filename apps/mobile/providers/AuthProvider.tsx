import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter, useSegments } from 'expo-router';
import { mobileTokenStorage } from '@lms/auth/storage/mobile';
import { unauthorizedEvent } from '@lms/events';
import { login as apiLogin, getCurrentUser, User } from '@/services/api';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  biometricLogin: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  // Handle 401 unauthorized events from API client
  const handleUnauthorized = useCallback(async () => {
    console.log('[Auth] Unauthorized event received, signing out');
    setUser(null);
    await mobileTokenStorage.clearSession();
    // Only redirect if we're not already on auth screens
    const inAuthGroup = segments[0] === '(auth)';
    if (!inAuthGroup) {
      router.replace('/(auth)/login');
    }
  }, [router, segments]);

  useEffect(() => {
    const unsubscribe = unauthorizedEvent.on(handleUnauthorized);
    return () => { unsubscribe(); };
  }, [handleUnauthorized]);

  useEffect(() => {
    const loadStored = async () => {
      try {
        const storedToken = await mobileTokenStorage.getAccessToken();
        if (storedToken) {
          // Try to validate token with backend
          const currentUser = await getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
            await mobileTokenStorage.setUser(currentUser);
          } else {
            // Token invalid, try to load cached user for offline mode
            const storedUser = await mobileTokenStorage.getUser<User>();
            if (storedUser) {
              setUser(storedUser);
            }
          }
        }
      } catch (error) {
        console.warn('[Auth] Failed to load stored auth:', error);
        // Try cached user for offline mode
        const storedUser = await mobileTokenStorage.getUser<User>();
        if (storedUser) {
          setUser(storedUser);
        }
      } finally {
        setLoading(false);
      }
    };
    loadStored();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const result = await apiLogin(email, password);
      if (!result) return false;

      setUser(result.user);
      await mobileTokenStorage.setAccessToken(result.token);
      await mobileTokenStorage.setUser(result.user);
      return true;
    } catch (error) {
      console.error('[Auth] Sign in failed:', error);
      return false;
    }
  };

  const signOut = async () => {
    setUser(null);
    await mobileTokenStorage.clearSession();
  };

  const biometricLogin = async () => {
    if (Platform.OS === 'web') return false;

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) return false;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Biyometrik doğrulama',
        cancelLabel: 'İptal',
        fallbackLabel: 'Şifre kullan',
      });

      if (result.success) {
        // Check if we have a stored token and user
        const storedToken = await mobileTokenStorage.getAccessToken();
        const storedUser = await mobileTokenStorage.getUser<User>();

        if (storedToken && storedUser) {
          setUser(storedUser);
          return true;
        }
      }
    } catch (error) {
      console.warn('[Auth] Biometric login failed:', error);
    }

    return false;
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      signIn,
      signOut,
      biometricLogin,
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
