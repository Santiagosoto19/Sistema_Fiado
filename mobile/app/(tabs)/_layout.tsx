import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { HapticTab } from '@/components/haptic-tab';
import { AppFonts, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'].palette ?? Colors.light.palette;
  const [isTendero, setIsTendero] = useState<boolean | null>(null);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const [tenderoRaw, usuarioRaw] = await Promise.all([
          AsyncStorage.getItem('tendero'),
          AsyncStorage.getItem('usuario')
        ]);

        console.log('DEBUG - tenderoRaw:', tenderoRaw);
        console.log('DEBUG - usuarioRaw:', usuarioRaw);

        // 1. Si existe el objeto tendero, es tendero fijo
        if (tenderoRaw && tenderoRaw !== 'null') {
          setIsTendero(true);
          return;
        }

        // 2. Si no hay tendero, verificamos el rol en el objeto usuario (id_rol 1 suele ser tendero/admin)
        if (usuarioRaw) {
          const user = JSON.parse(usuarioRaw);
          // Usamos == para que compare "1" y 1 por igual
          if (user.id_rol == 1) {
            setIsTendero(true);
            return;
          }
        }

        setIsTendero(false);
      } catch (e) {
        console.error('Error verificando rol:', e);
        setIsTendero(false);
      }
    };
    checkRole();
  }, []);

  // Mientras carga el rol, no mostramos nada para evitar saltos visuales
  if (isTendero === null) return null;

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

      {/* Solo para Clientes */}
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
    </Tabs>
  );
}
