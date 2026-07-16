import { Tabs } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Banknote, Bot } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';

import { HapticTab } from '@/components/haptic-tab';
import { AppFonts, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { COLORS } from '@/constants/colors';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'].palette ?? Colors.light.palette;
  const [isTendero, setIsTendero] = useState<boolean | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const checkRole = async () => {
        try {
          const [tenderoRaw, usuarioRaw] = await Promise.all([
            AsyncStorage.getItem('tendero'),
            AsyncStorage.getItem('usuario'),
          ]);

          if (!active) return;

          if (usuarioRaw) {
            const user = JSON.parse(usuarioRaw);
            if (user.id_rol == 2) {
              setIsTendero(false);
              return;
            }
            if (user.id_rol == 1) {
              setIsTendero(true);
              return;
            }
          }

          if (tenderoRaw && tenderoRaw !== 'null') {
            setIsTendero(true);
            return;
          }

          setIsTendero(false);
        } catch {
          if (active) setIsTendero(false);
        }
      };

      checkRole();
      return () => { active = false; };
    }, [])
  );

  if (isTendero === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary }}>
        <ActivityIndicator size="large" color={COLORS.white} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textMuted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: palette.tabBarBg ?? palette.surface,
          borderTopWidth: 0,
          elevation: 0,
          height: 72,
          paddingTop: 10,
          paddingBottom: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          marginTop: 6,
          fontFamily: AppFonts.regular,
        },
      }}>

      {/* Solo para Tenderos */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Movs',
          href: isTendero ? undefined : null,
          tabBarIcon: ({ color }) => <MaterialIcons size={26} name="bar-chart" color={color} />,
        }}
      />
      <Tabs.Screen
        name="clientes"
        options={{
          title: 'Clientes',
          href: isTendero ? undefined : null,
          tabBarIcon: ({ color }) => <MaterialIcons size={26} name="people" color={color} />,
        }}
      />
      <Tabs.Screen
        name="pagos"
        options={{
          title: 'Pagos',
          href: isTendero ? undefined : null,
          tabBarIcon: ({ color }) => <Banknote size={24} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="Asistenteia"
        options={{
          title: 'Asistente',
          href: isTendero ? undefined : null,
          tabBarIcon: ({ color }) => <Bot size={24} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="vistaUsuario"
        options={{
          title: 'Inicio',
          href: !isTendero ? undefined : null,
          tabBarIcon: ({ color }) => <MaterialIcons size={26} name="home" color={color} />,
        }}
      />

      
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Cartera',
          href: !isTendero ? undefined : null,
          tabBarIcon: ({ color }) => <MaterialIcons size={26} name="layers" color={color} />,
        }}
      />

    {/* Comunes */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <MaterialIcons size={26} name="person-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="logout"
        options={{
          title: 'Salir',
          tabBarIcon: ({ color }) => <MaterialIcons size={26} name="logout" color={color} />,
        }}
      />

      {/* Ocultamos pestañas técnicas que no queremos en el menú */}
      <Tabs.Screen name="transfer" options={{ href: null }} />
      <Tabs.Screen name="perfilCliente" options={{ href: null }} />
    </Tabs>
  );
}
