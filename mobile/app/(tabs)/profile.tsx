import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { AppFonts, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'].palette ?? Colors.light.palette;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.surface }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: palette.text }]}>Perfil</Text>
        <Text style={[styles.subtitle, { color: palette.textMuted }]}>
          Pantalla en construcción.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  title: { fontSize: 18, fontWeight: '900', fontFamily: AppFonts.extraBold },
  subtitle: { marginTop: 8, fontSize: 12, fontWeight: '700', fontFamily: AppFonts.regular },
});
