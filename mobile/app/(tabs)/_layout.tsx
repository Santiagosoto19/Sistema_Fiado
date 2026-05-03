import { Tabs } from 'expo-router';
import React from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { HapticTab } from '@/components/haptic-tab';
import { AppFonts, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'].palette ?? Colors.light.palette;

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
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <MaterialIcons size={26} name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Movs',
          tabBarIcon: ({ color }) => <MaterialIcons size={26} name="bar-chart" color={color} />,
        }}
      />
      <Tabs.Screen
        name="transfer"
        options={{
          title: 'Pagar',
          tabBarIcon: ({ focused }) => (
            <React.Fragment>
              <MaterialIcons
                size={28}
                name="sync-alt"
                color={focused ? palette.text : palette.textMuted}
                style={{
                  backgroundColor: focused ? palette.primary : 'transparent',
                  padding: 10,
                  borderRadius: 999,
                  overflow: 'hidden',
                }}
              />
            </React.Fragment>
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Cartera',
          tabBarIcon: ({ color }) => <MaterialIcons size={26} name="layers" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <MaterialIcons size={26} name="person-outline" color={color} />,
        }}
      />
    </Tabs>
  );
}
