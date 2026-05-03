import { useState } from 'react';
import { Alert } from 'react-native';

const API_URL = 'http://192.168.X.X:3000/api';

export const useLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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
      const json = await res.json();
      if (!json.ok) throw new Error(json.message);

      // TODO: guardar token
      // await SecureStore.setItemAsync('token', json.data.token);
      // TODO: navegar
      // router.replace('/(tabs)');

      Alert.alert('¡Bienvenido!', `Hola ${json.data.usuario.email}`);
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
    // TODO: implementar Google OAuth
    Alert.alert('Próximamente', 'Login con Google en desarrollo');
  };

  return {
    email, password, showPassword, loading,
    setEmail, setPassword,
    togglePassword,
    handleLogin, handleForgotPassword, handleRegister, handleGoogleLogin,
  };
};