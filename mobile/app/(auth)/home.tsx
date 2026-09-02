import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { welcomeStyles as styles } from '@/constants/home.styles';
import { COLORS } from '@/constants/colors';

export default function WelcomeScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

        <View style={styles.container}>

          {/* Logo y marca */}
          <View style={styles.logoSection}>
            <View style={styles.logoBox}>
              <Image
                source={require('@/assets/images/splash2.png')}
                style={styles.logoImage}
              />
            </View>
            <View style={styles.brandRow}>
              <Text style={styles.brandLight}>Fiado</Text>
              <Text style={styles.brandBold}>Check</Text>
            </View>
            <Text style={styles.tagline}>Gestiona tus créditos fácil y seguro</Text>
          </View>

          {/* Card con botones */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => router.push('/(auth)/login')}
              activeOpacity={0.85}
            >
              <Text style={styles.btnPrimaryText}>Iniciar Sesión</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnOutline}
              onPress={() => router.push('/(auth)/registerChoice')}
              activeOpacity={0.75}
            >
              <Text style={styles.btnOutlineText}>Registrarse</Text>
            </TouchableOpacity>

            <Text style={styles.footerText}>
              Al continuar aceptas nuestros Términos y Condiciones
            </Text>
          </View>

        </View>
      </SafeAreaView>
    </>
  );
}