import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    const checkLogin = async () => {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        setTarget('/login');
        return;
      }

      const tenderoRaw = await AsyncStorage.getItem('tendero');
      if (!tenderoRaw) {
        setTarget('/vistaUsuario');
        return;
      }

      try {
        const tendero = JSON.parse(tenderoRaw);
        setTarget(tendero ? '/(tabs)/dashboard' : '/vistaUsuario');
      } catch {
        setTarget('/vistaUsuario');
      }
    };

    checkLogin();
  }, []);

  if (target === null) return null;

  return <Redirect href={target as any} />;
}
