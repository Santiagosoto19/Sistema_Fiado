import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const TIMEOUT_DURATION = 1 * 60 * 1000;
const SESSION_KEYS = ['token', 'usuario', 'tendero', 'lastActive'] as const;
const LOGIN_ROUTE = '/(auth)/login';

export const useSessionTimeout = () => {
  const router = useRouter();
  const appState = useRef(AppState.currentState);

  const clearSession = useCallback(async () => {
    await AsyncStorage.multiRemove([...SESSION_KEYS]);
    router.replace(LOGIN_ROUTE as any);
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    const coldStartCheck = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const lastActive = await AsyncStorage.getItem('lastActive');

        if (token && lastActive && !cancelled) {
          await AsyncStorage.multiRemove([...SESSION_KEYS]);
          router.replace(LOGIN_ROUTE as any);
        }
      } catch {
        // No-op
      }
    };

    coldStartCheck();

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        const lastActive = await AsyncStorage.getItem('lastActive');
        if (lastActive) {
          const elapsed = Date.now() - parseInt(lastActive, 10);
          if (elapsed > TIMEOUT_DURATION) {
            await clearSession();
            return;
          }
        }
      }

      if (nextAppState.match(/inactive|background/)) {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          await AsyncStorage.setItem('lastActive', Date.now().toString());
        }
      }

      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [router, clearSession]);
};
