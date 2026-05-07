import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const TIMEOUT_DURATION = 1 * 60 * 1000; 

export const useSessionTimeout = () => {
  const router = useRouter();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        const lastActive = await AsyncStorage.getItem('lastActive');
        if (lastActive) {
          const elapsed = Date.now() - parseInt(lastActive);
          if (elapsed > TIMEOUT_DURATION) {
            await AsyncStorage.multiRemove(['token', 'user', 'lastActive']);
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
      subscription.remove();
    };
  }, []);
};
