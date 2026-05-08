import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { vistaUsuarioStyles as styles } from '@/constants/vistaUsuario.styles';
import { Colors } from '@/constants/theme';
import { useVistaUsuario } from '@/hooks/useVistaUsuario';

const VistaUsuario = () => {
  const [token, setToken] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('token').then(t => setToken(t));
    }, [])
  );

  const { loading, userData, movements, handleContactStore } = useVistaUsuario(token);

  if (token === null || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.light.palette.primary} size="large" />
      </View>
    );
  }

  const palette = Colors.light.palette;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.debtCard}>
          <View style={styles.cardTop}>
            <Text style={styles.cardSubtitle}>
              Tu Cuenta En La Tienda {userData?.nombreTienda}
            </Text>
            <View style={styles.totalRow}>
              <View style={styles.dot} />
              <Text style={styles.totalLabel}>Total A Pagar</Text>
            </View>
            <Text style={styles.debtAmount}>
              ${userData?.totalDeuda.toLocaleString()}
            </Text>
            <Text style={styles.debtDate}>Sujeto a condiciones de crédito</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Nivel De Confianza</Text>
            <View style={styles.progressWrap}>
              <View style={styles.progressPill}>
                <Text style={styles.progressPillText}>
                  {userData?.nivelConfianza}%
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFillBase,
                    { width: `${userData?.nivelConfianza ?? 0}%` },
                  ]}
                >
                  <View style={styles.progressFillAccent} />
                </View>
              </View>
            </View>
            <Text style={styles.confidenceBadge}>¡Excelente Cliente!</Text>
            <Text style={styles.motivationalText}>
              Paga A Tiempo Para Mantener Tu Crédito
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Ultimos Movimientos</Text>
            <View style={styles.movements}>
              {movements.map(item => (
                <View key={item.id} style={styles.movementRow}>
                  <View
                    style={[
                      styles.iconCircle,
                      {
                        backgroundColor:
                          item.tipo === 'ABONO' ? palette.highlight : palette.primary,
                      },
                    ]}
                  >
                    <Text style={styles.iconText}>
                      {item.tipo === 'ABONO' ? '+' : '−'}
                    </Text>
                  </View>
                  <View style={styles.movementTextColumn}>
                    <Text style={styles.movementDesc}>{item.descripcion}</Text>
                    <Text style={styles.movementDate}>{item.fecha}</Text>
                  </View>
                  <Text style={styles.movementAmount}>
                    ${item.monto.toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleContactStore}
          >
            <Text style={styles.ctaButtonText}>Contactar A La Tienda</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default VistaUsuario;
