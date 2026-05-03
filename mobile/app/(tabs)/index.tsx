import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppFonts, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Movement = {
  id: string;
  title: string;
  subtitle: string;
  amount: string;
  tone: 'plus' | 'minus';
};

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'].palette ?? Colors.light.palette;
  const insets = useSafeAreaInsets();

  const movements = useMemo<Movement[]>(
    () => [
      {
        id: 'm1',
        title: 'Abono 15 De Marzo',
        subtitle: '19:56 - Marzo 15',
        amount: '$477.77',
        tone: 'plus',
      },
      {
        id: 'm2',
        title: 'Abono 10 De Abril',
        subtitle: '20:25 - Abril 10',
        amount: '$102,67',
        tone: 'minus',
      },
      {
        id: 'm3',
        title: 'Abono 11 De Enero',
        subtitle: '16:56 - Enero 11',
        amount: '$45.04',
        tone: 'minus',
      },
    ],
    []
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.surface }]}>
      <View style={[styles.header, { backgroundColor: palette.primary, paddingTop: 6 + insets.top }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => {}}
          hitSlop={10}
          style={styles.headerIconButton}>
          <MaterialIcons name="chevron-left" size={28} color={palette.text} />
        </Pressable>

        <Text style={[styles.headerTitle, { color: palette.text }]} numberOfLines={1}>
          Hola, Maria Ruiz
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notificaciones"
          onPress={() => {}}
          hitSlop={10}
          style={styles.headerIconButton}>
          <MaterialIcons name="notifications-none" size={24} color={palette.text} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 }]}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: palette.card }]}>
          <View style={styles.cardTop}>
            <Text style={[styles.cardTitle, { color: palette.text }]}>
              Tu Cuenta En La Tienda Mi{'\n'}Viejo San Roque
            </Text>

            <View style={styles.totalRow}>
              <View style={[styles.dot, { backgroundColor: palette.successSoft2 }]} />
              <Text style={[styles.totalLabel, { color: palette.textMuted }]}>Total A Pagar</Text>
            </View>

            <Text style={[styles.totalAmount, { color: palette.text }]}>$569,200</Text>
            <Text style={[styles.totalMeta, { color: palette.textMuted }]}>
              Pagar Antes Del 20 De Marzo
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Nivel De Confianza</Text>

            <View style={styles.progressWrap}>
              <View style={[styles.progressPill, { backgroundColor: palette.primary }]}>
                <Text style={[styles.progressPillText, { color: palette.text }]}>70%</Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: palette.track }]}>
                <View style={[styles.progressFillBase, { backgroundColor: palette.primary }]}>
                  <View style={[styles.progressFillAccent, { backgroundColor: palette.successSoft2 }]} />
                </View>
              </View>
            </View>

            <Text style={[styles.confidenceBadge, { backgroundColor: palette.successSoft2 }]}>
              ¡Excelente Cliente!
            </Text>
            <Text style={[styles.confidenceText, { color: palette.textMuted }]}>
              Paga A Tiempo Para Mantener Tu Credito
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Ultimos Movimientos</Text>

            <View style={styles.movements}>
              {movements.map((m) => (
                <View key={m.id} style={styles.movementRow}>
                  <View
                    style={[
                      styles.movementIcon,
                      {
                        backgroundColor: m.tone === 'plus' ? palette.highlight : palette.primary,
                      },
                    ]}>
                    <Text style={[styles.movementIconText, { color: palette.text }]}>
                      {m.tone === 'plus' ? '+' : '-'}
                    </Text>
                  </View>

                  <View style={styles.movementInfo}>
                    <Text style={[styles.movementTitle, { color: palette.text }]}>{m.title}</Text>
                    <Text style={[styles.movementSubtitle, { color: palette.textMuted }]}>
                      {m.subtitle}
                    </Text>
                  </View>

                  <Text style={[styles.movementAmount, { color: palette.text }]}>{m.amount}</Text>
                </View>
              ))}
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => {}}
            style={[styles.cta, { backgroundColor: palette.primary }]}>
            <Text style={[styles.ctaText, { color: palette.text }]}>Contactar A La Tienda</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: AppFonts.semiBold,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  card: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
  },
  cardTop: {
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: AppFonts.semiBold,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: AppFonts.semiBold,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: AppFonts.black,
    marginTop: 2,
  },
  totalMeta: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: AppFonts.regular,
    marginTop: -2,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: AppFonts.extraBold,
  },
  progressWrap: {
    marginTop: 10,
  },
  progressPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
  },
  progressPillText: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: AppFonts.black,
  },
  progressTrack: {
    height: 16,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  progressFillBase: {
    height: '100%',
    width: '70%',
    borderRadius: 999,
    overflow: 'hidden',
    padding: 2,
  },
  progressFillAccent: {
    height: '100%',
    width: '100%',
    borderRadius: 999,
  },
  confidenceBadge: {
    alignSelf: 'center',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: AppFonts.extraBold,
    color: '#0B2B2A',
  },
  confidenceText: {
    marginTop: 6,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: AppFonts.regular,
  },
  movements: {
    marginTop: 10,
    gap: 12,
  },
  movementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  movementIcon: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  movementIconText: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: AppFonts.black,
  },
  movementInfo: {
    flex: 1,
  },
  movementTitle: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: AppFonts.semiBold,
  },
  movementSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: AppFonts.regular,
    marginTop: 2,
  },
  movementAmount: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: AppFonts.semiBold,
  },
  cta: {
    marginTop: 18,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: AppFonts.extraBold,
  },
});
