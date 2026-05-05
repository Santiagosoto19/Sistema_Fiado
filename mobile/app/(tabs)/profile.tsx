import React from 'react';
import { SafeAreaView, StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppFonts, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MaterialIcons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'].palette ?? Colors.light.palette;

  const handleLogout = async () => {
    Alert.alert(
      "Cerrar Sesión",
      "¿Estás seguro de que deseas salir?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Sí, salir", 
          onPress: async () => {
            await AsyncStorage.multiRemove(['token', 'user', 'lastActive']);
            router.replace('/login');
          },
          style: 'destructive'
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: palette.text }]}>Mi Perfil</Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.profileCard}>
            <MaterialIcons name="account-circle" size={80} color={palette.primary} />
            <Text style={[styles.userName, { color: palette.text }]}>Usuario de FiadoCheck</Text>
        </View>

        <TouchableOpacity 
          style={[styles.logoutButton, { borderColor: palette.primary }]} 
          onPress={handleLogout}
        >
          <MaterialIcons name="logout" size={20} color={palette.primary} />
          <Text style={[styles.logoutText, { color: palette.primary }]}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { padding: 20, paddingTop: 40 },
  content: { flex: 1, padding: 20, alignItems: 'center' },
  profileCard: { alignItems: 'center', marginBottom: 40 },
  userName: { fontSize: 20, fontWeight: 'bold', marginTop: 10, fontFamily: AppFonts.bold },
  title: { fontSize: 24, fontWeight: '900', fontFamily: AppFonts.extraBold },
  logoutButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderWidth: 1.5, 
    paddingVertical: 12, 
    paddingHorizontal: 24, 
    borderRadius: 12 
  },
  logoutText: { marginLeft: 10, fontSize: 16, fontWeight: '600', fontFamily: AppFonts.semiBold },
});
