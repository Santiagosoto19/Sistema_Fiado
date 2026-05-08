import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const TIMEOUT_DURATION = 1 * 60 * 1000; 
const SESSION_KEYS = ['token', 'usuario', 'tendero', 'lastActive'] as const;

export const useSessionTimeout = () => {
  const router = useRouter();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    let cancelled = false;

    // Cold start: si la app fue cerrada con sesión abierta, forzamos cierre de sesión
    // (cumple el requisito de que al reabrir la app no quede la sesión activa).
    const coldStartCheck = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const lastActive = await AsyncStorage.getItem('lastActive');

        if (token && lastActive) {
          await AsyncStorage.multiRemove([...SESSION_KEYS]);
          if (!cancelled) router.replace('/login');
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
          const elapsed = Date.now() - parseInt(lastActive);
          if (elapsed > TIMEOUT_DURATION) {
            await AsyncStorage.multiRemove([...SESSION_KEYS]);
            router.replace('/login');
            return;
          }
        }
      }

      if (nextAppState.match(/inactive|background/)) {
        // La app entra en segundo plano, guardamos el tiempo actual
        await AsyncStorage.setItem('lastActive', Date.now().toString());
      }
      
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [router]);
};
