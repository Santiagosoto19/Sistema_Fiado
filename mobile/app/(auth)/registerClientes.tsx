import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { registerStyles as styles } from '@/constants/registerClientes.styles';
import { COLORS } from '@/constants/colors';
import { useRegister } from '@/hooks/useRegisterClientes';
import { Eye } from "lucide-react-native";
import { EyeOff } from "lucide-react-native";

export default function RegisterScreen() {
  const {
    nombre, setNombre,
    email, setEmail,
    telefono, setTelefono,
    cedula, setCedula,
    direccion, setDireccion,
    password, setPassword,
    confirmPassword, setConfirmPassword,
    showPassword, showConfirm,
    loading,
    togglePassword, toggleConfirm,
    handleRegister, handleLogin,
  } = useRegister();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          {/* Título sobre fondo verde */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Crea Tu Cuenta</Text>
            <Text style={styles.subtitle}>Como Cliente</Text>
          </View>

          {/* Card blanca con scroll */}
          <View style={styles.card}>
            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Nombre Completo */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nombre Completo</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Juan Pérez"
                  placeholderTextColor={COLORS.textMuted}
                  value={nombre}
                  onChangeText={setNombre}
                  autoCapitalize="words"
                />
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="example@example.com"
                  placeholderTextColor={COLORS.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Teléfono */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Teléfono</Text>
                <TextInput
                  style={styles.input}
                  placeholder="3001234567"
                  placeholderTextColor={COLORS.textMuted}
                  value={telefono}
                  onChangeText={setTelefono}
                  keyboardType="phone-pad"
                />
              </View>

              {/* Cédula */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Cédula</Text>
                <TextInput
                  style={styles.input}
                  placeholder="X.XXX.XXX.XXX"
                  placeholderTextColor={COLORS.textMuted}
                  value={cedula}
                  onChangeText={setCedula}
                  keyboardType="numeric"
                />
              </View>

              {/* Dirección */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Dirección</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Calle X # X-XX"
                  placeholderTextColor={COLORS.textMuted}
                  value={direccion}
                  onChangeText={setDireccion}
                />
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="••••••••"
                    placeholderTextColor={COLORS.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity style={styles.eyeBtn} onPress={togglePassword}>
                    <Text style={styles.eyeIcon}>{showPassword ? <Eye size={24} color="green" /> : <EyeOff size={24} color="green" />}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="••••••••"
                    placeholderTextColor={COLORS.textMuted}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirm}
                  />
                  <TouchableOpacity style={styles.eyeBtn} onPress={toggleConfirm}>
                    <Text style={styles.eyeIcon}>{showConfirm ? <Eye size={24} color="green" /> : <EyeOff size={24} color="green" />}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Botón */}
              <TouchableOpacity
                style={[styles.btnPrimary, loading && styles.btnPrimaryDisabled]}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color={COLORS.white} />
                  : <Text style={styles.btnPrimaryText}>Regístrarse</Text>
                }
              </TouchableOpacity>

              {/* Footer */}
              <TouchableOpacity style={styles.footer} onPress={handleLogin}>
                <Text style={styles.footerText}>Ya tienes una cuenta?</Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}