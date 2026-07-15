import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { CONFIG } from '@/config/config';
import { COLORS } from '@/constants/colors';
import { profileStyles as styles } from '@/constants/profile.styles';
import { ChevronLeft, Bell, User, ShieldCheck, LogOut, Camera } from 'lucide-react-native';

const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  // Modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  // Form states
  const [profileForm, setProfileForm] = useState({
    email: '',
    nombre: '',
    nombre_tienda: '',
    telefono: '',
    direccion: '',
    nombre_completo: '',
    foto_perfil: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const applyProfileData = (profileData: any) => {
    setUser(profileData);
    setProfileForm({
      email: profileData.email || '',
      nombre: profileData.nombre || '',
      nombre_tienda: profileData.nombre_tienda || '',
      telefono: profileData.telefono || '',
      direccion: profileData.direccion || '',
      nombre_completo: profileData.nombre_completo || '',
      foto_perfil: profileData.foto_perfil || '',
    });
  };

  const updateStoredProfile = async (partialData: any) => {
    const userRaw = await AsyncStorage.getItem('usuario');
    const currentUser = userRaw ? JSON.parse(userRaw) : {};
    const nextUser = { ...currentUser, ...(user || {}), ...partialData };

    await AsyncStorage.setItem('usuario', JSON.stringify(nextUser));

    if (Number(nextUser.id_rol) === 1) {
      const tenderoRaw = await AsyncStorage.getItem('tendero');
      const parsedTendero = tenderoRaw ? JSON.parse(tenderoRaw) : {};
      const currentTendero = parsedTendero || {};
      await AsyncStorage.setItem('tendero', JSON.stringify({
        ...currentTendero,
        id_tendero: nextUser.id_tendero ?? currentTendero.id_tendero,
        nombre: nextUser.nombre ?? currentTendero.nombre,
        nombre_tienda: nextUser.nombre_tienda ?? currentTendero.nombre_tienda,
      }));
    }

    setUser(nextUser);
  };

  const saveProfileData = async (payload: any, successMessage: string, closeModal = true) => {
    const activeToken = token || await AsyncStorage.getItem('token');
    if (!activeToken) {
      router.replace('/(auth)/login');
      return false;
    }

    try {
      const response = await fetch(`${CONFIG.API_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${activeToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        Alert.alert('Error', err.error || 'No se pudo actualizar el perfil');
        return false;
      }

      await updateStoredProfile(payload);
      Alert.alert('Éxito', successMessage);
      if (closeModal) setEditModalVisible(false);
      return true;
    } catch {
      Alert.alert('Error', 'Error de conexión con el servidor');
      return false;
    }
  };

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userRaw = await AsyncStorage.getItem('usuario');
        const storedToken = await AsyncStorage.getItem('token');
        setToken(storedToken);

        if (storedToken) {
          const response = await fetch(`${CONFIG.API_URL}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${storedToken}` },
          });

          if (response.ok) {
            const profileData = await response.json();
            applyProfileData(profileData);
            const currentUser = userRaw ? JSON.parse(userRaw) : {};
            await AsyncStorage.setItem('usuario', JSON.stringify({ ...currentUser, ...profileData }));
            return;
          }
        }

        if (userRaw) {
          applyProfileData(JSON.parse(userRaw));
        }
      } catch (e) {
        console.error('Error loading user data', e);
      }
    };
    loadUserData();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(`${CONFIG.API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
    } catch (e) {
      console.error('Logout API error', e);
    } finally {
      await AsyncStorage.multiRemove(['token', 'usuario', 'tendero', 'lastActive']);
      router.replace('/(auth)/login');
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisos necesarios', 'Necesitamos acceso a tu galería para cambiar la foto de perfil.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const imageValue = asset.base64
        ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`
        : asset.uri;

      setProfileForm(prev => ({ ...prev, foto_perfil: imageValue }));
      await saveProfileData({ foto_perfil: imageValue }, 'Foto de perfil actualizada correctamente', false);
    }
  };

  const handleUpdateProfile = async () => {
    const isOnlyImageSave = profileForm.foto_perfil && !profileForm.email && !profileForm.nombre && !profileForm.nombre_completo;

    if (!isOnlyImageSave && (!profileForm.email || (Number(user?.id_rol) === 1 && !profileForm.nombre) || (Number(user?.id_rol) === 2 && !profileForm.nombre_completo))) {
      Alert.alert('Error', 'Por favor, completa los campos obligatorios.');
      return;
    }

    Alert.alert(
      'Confirmar Cambios',
      '¿Estás seguro de que deseas actualizar tu información personal?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Guardar',
          onPress: async () => {
            await saveProfileData(profileForm, 'Perfil actualizado correctamente');
          }
        }
      ]
    );
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert('Error', 'Las nuevas contraseñas no coinciden');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      Alert.alert('Error', 'La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }

    Alert.alert(
      'Confirmar Cambio',
      '¿Estás seguro de que deseas cambiar tu contraseña?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Actualizar',
          onPress: async () => {
            try {
              const response = await fetch(`${CONFIG.API_URL}/auth/change-password`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  currentPassword: passwordForm.currentPassword,
                  newPassword: passwordForm.newPassword
                }),
              });

              if (response.ok) {
                Alert.alert('Éxito', 'Contraseña actualizada correctamente');
                setPasswordModalVisible(false);
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
              } else {
                const err = await response.json();
                Alert.alert('Error', err.error || 'Error al cambiar la contraseña');
              }
            } catch {
              Alert.alert('Error', 'Error de conexión con el servidor');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perfil</Text>
        <TouchableOpacity style={styles.bellBtn}>
          <Bell size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.profileContent}>
        <TouchableOpacity onPress={() => setEditModalVisible(true)}>
          <Image
            source={{ uri: user?.foto_perfil || DEFAULT_AVATAR }}
            style={styles.profileImage}
          />
          <View style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            backgroundColor: COLORS.primary,
            borderRadius: 15,
            padding: 5,
            borderWidth: 2,
            borderColor: COLORS.white
          }}>
            <Camera size={18} color={COLORS.white} />
          </View>
        </TouchableOpacity>
        <Text style={styles.userName}>
          {user?.nombre_completo || user?.nombre || user?.email || 'Cargando...'}
        </Text>
        <Text style={styles.userId}>
          ID: {user?.id_cliente || user?.id_tendero || user?.id_usuario || '...'}
        </Text>
      </View>

      <View style={styles.menuContainer}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setEditModalVisible(true)}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#BFEBC4' }]}>
            <User size={24} color={COLORS.primary} />
          </View>
          <Text style={styles.menuText}>Editar Perfil</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setPasswordModalVisible(true)}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#BFEBC4' }]}>
            <ShieldCheck size={24} color={COLORS.primary} />
          </View>
          <Text style={styles.menuText}>Cambiar Contraseña</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setLogoutModalVisible(true)}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#BFEBC4' }]}>
            <LogOut size={24} color={COLORS.primary} />
          </View>
          <Text style={styles.menuText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Editar Perfil</Text>
            <ScrollView>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, justifyContent: 'center', gap: 10 }}>
                <Image
                  source={{ uri: profileForm.foto_perfil || DEFAULT_AVATAR }}
                  style={[styles.profileImage, { width: 60, height: 60, borderRadius: 30 }]}
                />
                <TouchableOpacity onPress={pickImage} style={{ backgroundColor: COLORS.primary, padding: 8, borderRadius: 10 }}>
                  <Camera size={20} color={COLORS.white} />
                </TouchableOpacity>
              </TouchableOpacity>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Correo Electrónico</Text>
                <TextInput
                  style={styles.input}
                  value={profileForm.email}
                  onChangeText={(t) => setProfileForm({ ...profileForm, email: t })}
                  keyboardType="email-address"
                />
              </View>

              {Number(user?.id_rol) === 1 ? (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Nombre Completo</Text>
                    <TextInput
                      style={styles.input}
                      value={profileForm.nombre}
                      onChangeText={(t) => setProfileForm({ ...profileForm, nombre: t })}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Nombre de la Tienda</Text>
                    <TextInput
                      style={styles.input}
                      value={profileForm.nombre_tienda}
                      onChangeText={(t) => setProfileForm({ ...profileForm, nombre_tienda: t })}
                    />
                  </View>
                </>
              ) : (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nombre Completo</Text>
                  <TextInput
                      style={styles.input}
                      value={profileForm.nombre_completo}
                      onChangeText={(t) => setProfileForm({ ...profileForm, nombre_completo: t })}
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Teléfono</Text>
                <TextInput
                  style={styles.input}
                  value={profileForm.telefono}
                  onChangeText={(t) => setProfileForm({ ...profileForm, telefono: t })}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Dirección</Text>
                <TextInput
                  style={styles.input}
                  value={profileForm.direccion}
                  onChangeText={(t) => setProfileForm({ ...profileForm, direccion: t })}
                />
              </View>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalBtnCancel}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={styles.modalBtnTextCancel}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalBtnConfirm}
                  onPress={handleUpdateProfile}
                >
                  <Text style={styles.modalBtnTextConfirm}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Cambiar Contraseña</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contraseña Actual</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={passwordForm.currentPassword}
                onChangeText={(t) => setPasswordForm({ ...passwordForm, currentPassword: t })}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nueva Contraseña</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={passwordForm.newPassword}
                onChangeText={(t) => setPasswordForm({ ...passwordForm, newPassword: t })}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirmar Nueva Contraseña</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={passwordForm.confirmPassword}
                onChangeText={(t) => setPasswordForm({ ...passwordForm, confirmPassword: t })}
              />
            </View>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setPasswordModalVisible(false)}
              >
                <Text style={styles.modalBtnTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnConfirm}
                onPress={handleChangePassword}
              >
                <Text style={styles.modalBtnTextConfirm}>Actualizar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Cerrar Sesión</Text>
            <Text style={styles.confirmText}>
              ¿Estás seguro de que deseas salir de tu cuenta?
            </Text>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.modalBtnTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnConfirm}
                onPress={handleLogout}
              >
                <Text style={styles.modalBtnTextConfirm}>Cerrar Sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
