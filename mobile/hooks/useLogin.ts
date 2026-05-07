import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '@/config/config';

const API_URL = CONFIG.API_URL;

type Usuario = {
  id_usuario: number;
  email: string;
  id_rol: number;
};

type Tendero = {
  id_tendero: number;
  nombre: string;
  nombre_tienda: string;
} | null;

type LoginResponse = {
  token: string;
  usuario: Usuario;
  tendero: Tendero;
};

export const useLogin = () => {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);

  const togglePassword = () => setShowPassword(prev => !prev);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Campos vacíos', 'Por favor completa todos los campos');
      return;
    }
    if (!email.includes('@')) {
      Alert.alert('Email inválido', 'Ingresa un email válido');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const json: LoginResponse = await res.json();

      // Error del servidor
      if (!res.ok) {
        const err = json as any;
        throw new Error(err.error || 'No se pudo iniciar sesión');
      }


    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('tendero');

    await AsyncStorage.setItem('token', json.token);
    await AsyncStorage.setItem('tendero', JSON.stringify(json.tendero));
    
    router.replace('/(tabs)/dashboard' as any);


      const nombre = json.tendero?.nombre ?? json.usuario.email;
      Alert.alert('¡Bienvenido!', `Hola ${nombre} 👋`);

    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    // TODO: router.push('/auth/forgot-password');
    Alert.alert('Próximamente', 'Recuperación de contraseña en desarrollo');
  };

  const handleRegister = () => {
    // TODO: router.push('/auth/register');
  };

  const handleGoogleLogin = () => {
    Alert.alert('Próximamente', 'Login con Google en desarrollo');
  };

  return {
    email, password, showPassword, loading,
    setEmail, setPassword,
    togglePassword,
    handleLogin,
    handleForgotPassword,
    handleRegister,
    handleGoogleLogin,
  };
};