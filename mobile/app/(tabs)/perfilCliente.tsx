import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeft, Bell } from 'lucide-react-native';

import { perfilClienteStyles as styles } from '@/constants/perfilCliente.styles';
import { COLORS } from '@/constants/colors';
import { useClientePerfil, EstadoBadge } from '@/hooks/useClientePerfil';

const getBadgeStyles = (tipo: EstadoBadge) => {
  switch (tipo) {
    case 'mora':
      return { badge: styles.badgeMora, text: styles.badgeMoraText };
    case 'sin_deuda':
      return { badge: styles.badgeSinDeuda, text: styles.badgeSinDeudaText };
    default:
      return { badge: styles.badgeAlDia, text: styles.badgeAlDiaText };
  }
};

export default function PerfilClienteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [token, setToken] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('token').then(setToken);
    }, [])
  );

  const {
    perfil,
    loading,
    error,
    handleNuevoCredito,
    handleRegistrarPago,
  } = useClientePerfil(token, id);

  if (token === null || loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color={COLORS.white} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (error || !perfil) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error ?? 'Cliente no encontrado'}</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: COLORS.white, fontWeight: '600' }}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const badge = getBadgeStyles(perfil.estadoBadgeTipo);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={22} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Perfil Del Cliente</Text>
          <TouchableOpacity style={styles.bellBtn}>
            <Bell size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <View style={styles.nameBanner}>
              <View style={styles.nameBannerTop}>
                <Text style={styles.nameText}>{perfil.nombre}</Text>
                <View style={[styles.badge, badge.badge]}>
                  <Text style={[styles.badgeText, badge.text]}>{perfil.estadoBadge}</Text>
                </View>
              </View>
              <Text style={styles.clienteDesde}>{perfil.clienteDesde}</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Deuda Actual</Text>
                <Text style={styles.statValue}>{perfil.deudaActual}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Nivel de Confianza</Text>
                <Text style={[styles.statValue, styles.statValueSmall]}>
                  {perfil.nivelConfianza} / 100
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Historial de Créditos</Text>
            <View style={styles.historialCard}>
              {perfil.historial.length === 0 ? (
                <Text style={styles.historialEmpty}>Sin créditos registrados</Text>
              ) : (
                perfil.historial.map((item, idx) => (
                  <View
                    key={item.id_credito}
                    style={[
                      styles.historialRow,
                      idx < perfil.historial.length - 1 && styles.historialDivider,
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historialTitulo}>{item.titulo}</Text>
                      <Text
                        style={[
                          styles.historialSub,
                          item.estado === 'vencido' && styles.historialSubVencido,
                          item.estado === 'vigente' && styles.historialSubVigente,
                        ]}
                      >
                        {item.subtitulo}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.historialMontoBadge,
                        item.estado === 'vigente' && styles.historialMontoVencido,
                      ]}
                    >
                      <Text
                        style={[
                          styles.historialMontoText,
                          item.estado === 'vigente' && styles.historialMontoTextVencido,
                        ]}
                      >
                        {item.monto}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            <Text style={styles.sectionTitle}>Información de Contacto</Text>
            <View style={styles.contactoCard}>
              <Text style={styles.contactoLinea}>Teléfono: {perfil.telefono}</Text>
              <Text style={styles.contactoLinea}>Dirección: {perfil.direccion}</Text>
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.btnOutline} onPress={handleNuevoCredito}>
                <Text style={styles.btnOutlineText}>+ Nuevo Crédito</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnFill} onPress={handleRegistrarPago}>
                <Text style={styles.btnFillText}>Registrar Pago</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </>
  );
}
