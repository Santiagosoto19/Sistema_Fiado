import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Linking,
  Platform,
  Pressable,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { AppFonts, Colors } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';

// Configuración de la API
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:3000/api' : 'http://localhost:3000/api');
const API_TOKEN = process.env.EXPO_PUBLIC_API_TOKEN || '';

  const VistaUsuario = () => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [movements, setMovements] = useState<any[]>([]);

  const CLIENTE_ID = '1';

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      if (!API_TOKEN) {
        Alert.alert(
          'Falta configurar el token',
          'Define EXPO_PUBLIC_API_TOKEN (JWT) para poder consumir /api/clientes.',
        );
        return;
      }
      const userResponse = await axios.get(`${API_BASE_URL}/clientes/${CLIENTE_ID}`, {
        headers: { Authorization: `Bearer ${API_TOKEN}` }
      });
      const user = userResponse.data;

      const historyResponse = await axios.get(`${API_BASE_URL}/clientes/${CLIENTE_ID}/historial`, {
        headers: { Authorization: `Bearer ${API_TOKEN}` }
      });

      const processedMovements: any[] = [];
      historyResponse.data.historial.forEach((item: any) => {
        processedMovements.push({
          id: `cred-${item.credito.id_credito}`,
          tipo: 'CARGO',
          descripcion: item.credito.descripcion || 'Compra en Tienda',
          fecha: `${item.credito.fecha_credito}`,
          monto: item.credito.monto_total
        });
        item.abonos.forEach((abono: any) => {
          processedMovements.push({
            id: `abono-${abono.id_abono}`,
            tipo: 'ABONO',
            descripcion: `Abono a ${item.credito.descripcion || 'Crédito'}`,
            fecha: abono.fecha_abono,
            monto: abono.monto
          });
        });
      });

      const sortedMovements = processedMovements.sort((a, b) =>
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      );

      setUserData({
        nombreUsuario: user.nombre_completo,
        nombreTienda: "Mi Viejo San Roque",
        totalDeuda: user.totales.total_deuda,
        fechaLimite: "Sujeto a crédito",
        nivelConfianza: user.scoring?.puntaje || 0,
        telefonoTienda: user.telefono,
      });
      setMovements(sortedMovements);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const data = error.response?.data;
        console.error('Error fetching user data:', { status, data });
        Alert.alert(
          'Error cargando datos',
          status ? `La API respondió ${status}.` : 'No se pudo conectar con la API.',
        );
      } else {
        console.error('Error fetching user data:', error);
        Alert.alert('Error', 'No se pudieron cargar los datos de la cuenta.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContactStore = () => {
    const url = `whatsapp://send?phone=${userData?.telefonoTienda || '+573000000000'}&text=Hola, quiero consultar mi estado de cuenta.`;
    Linking.openURL(url).catch(() => alert('No se pudo abrir WhatsApp'));
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: Colors.light.palette.surface }]}>
        <ActivityIndicator color={Colors.light.palette.primary} size="large" />
      </View>
    );
  }

  const palette = Colors.light.palette;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.surface }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header - Design and Colors from index.tsx */}
      <View style={[styles.header, { backgroundColor: palette.primary, paddingTop: insets.top }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {}}
          hitSlop={10}
          style={styles.headerIconButton}>
          <MaterialIcons name="chevron-left" size={28} color={palette.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Hola, {userData?.nombreUsuario}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {}}
          hitSlop={10}
          style={styles.headerIconButton}>
          <MaterialIcons name="notifications-none" size={24} color={palette.text} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Card Principal - Design and Colors from index.tsx */}
        <View style={[styles.debtCard, { backgroundColor: palette.card }]}>
          <View style={styles.cardTop}>
            <Text style={[styles.cardSubtitle, { color: palette.text }]}>Tu Cuenta En La Tienda {userData?.nombreTienda}</Text>
            <View style={styles.totalRow}>
              <View style={[styles.dot, { backgroundColor: palette.successSoft2 }]} />
              <Text style={[styles.totalLabel, { color: palette.textMuted }]}>Total A Pagar</Text>
            </View>
            <Text style={[styles.debtAmount, { color: palette.text }]}>${userData?.totalDeuda.toLocaleString()}</Text>
            <Text style={[styles.debtDate, { color: palette.textMuted }]}>Sujeto a condiciones de crédito</Text>
          </View>

          {/* Nivel de Confianza - Design and Colors from index.tsx */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: palette.text }]}>Nivel De Confianza</Text>
            <View style={styles.progressWrap}>
              <View style={[styles.progressPill, { backgroundColor: palette.primary }]}>
                <Text style={[styles.progressPillText, { color: palette.text }]}>{userData?.nivelConfianza}%</Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: palette.track }]}>
                <View style={[styles.progressFillBase, { backgroundColor: palette.primary, width: `${userData?.nivelConfianza}%` }]}>
                  <View style={[styles.progressFillAccent, { backgroundColor: palette.successSoft2 }]} />
                </View>
              </View>
            </View>
            <Text style={[styles.confidenceBadge, { backgroundColor: palette.successSoft2, color: palette.text }]}>
              ¡Excelente Cliente!
            </Text>
            <Text style={[styles.motivationalText, { color: palette.textMuted }]}>
              Paga A Tiempo Para Mantener Tu Crédito
            </Text>
          </View>

          {/* Últimos Movimientos - Design and Colors from index.tsx */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: palette.text }]}>Ultimos Movimientos</Text>
            <View style={styles.movements}>
              {movements.map((item) => (
                <View key={item.id} style={styles.movementRow}>
                  <View style={[styles.iconCircle, { backgroundColor: item.tipo === 'ABONO' ? palette.highlight : palette.primary }]}>
                    <Text style={[styles.iconText, { color: palette.text }]}>{item.tipo === 'ABONO' ? '+' : '−'}</Text>
                  </View>
                  <View style={styles.movementTextColumn}>
                    <Text style={[styles.movementDesc, { color: palette.text }]}>{item.descripcion}</Text>
                    <Text style={[styles.movementDate, { color: palette.textMuted }]}>{item.fecha}</Text>
                  </View>
                  <Text style={[styles.movementAmount, { color: palette.text }]}>${item.monto.toLocaleString()}</Text>
                </View>
              ))}
            </View>
          </View>

/* Buenas Noches.*/

          {/* CTA */}
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: palette.primary }]}
            onPress={handleContactStore}
          >
            <Text style={[styles.ctaButtonText, { color: palette.text }]}>Contactar A La Tienda</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Navigation Bar - UI Spec 3-icons with index.tsx colors */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="home" size={24} color={palette.primary} />
          <Text style={[styles.navText, { color: palette.primary, fontFamily: AppFonts.bold }]}>Inicio</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="person-outline" size={24} color="#9E9E9E" />
          <Text style={[styles.navText, { color: '#9E9E9E', fontFamily: AppFonts.regular }]}>Perfil</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="notifications-outline" size={24} color="#9E9E9E" />
          <Text style={[styles.navText, { color: '#9E9E9E', fontFamily: AppFonts.regular }]}>Alertas</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default VistaUsuario;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontFamily: AppFonts.semiBold,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 100,
  },
  debtCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTop: {
    alignItems: 'center',
    gap: 8,
  },
  cardSubtitle: {
    textAlign: 'center',
    fontSize: 13,
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
    borderRadius: 5,
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: AppFonts.semiBold,
  },
  debtAmount: {
    fontSize: 28,
    fontFamily: AppFonts.black,
    marginTop: 2,
  },
  debtDate: {
    fontSize: 11,
    fontFamily: AppFonts.regular,
    marginTop: -2,
  },
  section: {
    marginTop: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: AppFonts.extraBold,
    marginBottom: 10,
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
    fontFamily: AppFonts.extraBold,
  },
  motivationalText: {
    marginTop: 6,
    textAlign: 'center',
    fontSize: 11,
    fontFamily: AppFonts.regular,
    fontStyle: 'italic',
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
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 18,
    fontFamily: AppFonts.black,
  },
  movementTextColumn: {
    flex: 1,
  },
  movementDesc: {
    fontSize: 13,
    fontFamily: AppFonts.semiBold,
  },
  movementDate: {
    fontSize: 10,
    fontFamily: AppFonts.regular,
    marginTop: 2,
  },
  movementAmount: {
    fontSize: 12,
    fontFamily: AppFonts.semiBold,
    textAlign: 'right',
  },
  ctaButton: {
    marginTop: 18,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  ctaButtonText: {
    fontSize: 12,
    fontFamily: AppFonts.extraBold,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 65,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navText: {
    fontSize: 12,
    marginTop: 4,
  },
})
