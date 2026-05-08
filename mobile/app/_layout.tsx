import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useRootNavigationState, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import { useEffect, useMemo, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  Poppins_900Black,
  useFonts,
} from '@expo-google-fonts/poppins';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';


export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useSessionTimeout();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const [authChecked, setAuthChecked] = useState(false);
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
    Poppins_900Black,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  const segmentKey = useMemo(() => segments.join('/'), [segments]);
  const segment0 = segments[0];

  useEffect(() => {
    if (!navigationState?.key) return;

    let cancelled = false;

    const run = async () => {
      try {
        const token = await AsyncStorage.getItem('token');

        const inAuthGroup = segment0 === '(auth)';
        const inTabsGroup = segment0 === '(tabs)';
        const inVistaUsuario = segment0 === 'vistaUsuario';
        const isProtected = inTabsGroup || inVistaUsuario;

        if (!token && isProtected) {
          router.replace('/login' as any);
          return;
        }

        if (token && inAuthGroup) {
          const [tenderoRaw, usuarioRaw] = await Promise.all([
            AsyncStorage.getItem('tendero'),
            AsyncStorage.getItem('usuario')
          ]);
          
          let isTendero = false;

          // 1. Verificar por objeto tendero
          if (tenderoRaw && tenderoRaw !== 'null') {
            isTendero = true;
          } 
          // 2. Verificar por id_rol en el usuario
          else if (usuarioRaw) {
            try {
              const user = JSON.parse(usuarioRaw);
              if (user.id_rol == 1) isTendero = true;
            } catch {}
          }

          const target = isTendero ? '/(tabs)/dashboard' : '/(tabs)/vistaUsuario';
          router.replace(target as any);
          return;
        }
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [navigationState?.key, router, segment0, segmentKey]);

  if (!fontsLoaded || !authChecked) return null;

return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
