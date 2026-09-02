import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resolveClienteHomeRoute } from '@/hooks/Usetiendasasociadas';

export default function Index() {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    const checkLogin = async () => {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        setTarget('/(auth)/home');
        return;
      }

      const tenderoRaw = await AsyncStorage.getItem('tendero');
      const usuarioRaw = await AsyncStorage.getItem('usuario');

      let isTendero = false;
      if (usuarioRaw) {
        try {
          const user = JSON.parse(usuarioRaw);
          isTendero = user.id_rol == 1;
        } catch {}
      } else if (tenderoRaw && tenderoRaw !== 'null') {
        isTendero = true;
      }

      if (isTendero) {
        setTarget('/(tabs)/dashboard');
        return;
      }

      try {
        const clienteRoute = await resolveClienteHomeRoute(token);
        setTarget(clienteRoute);
      } catch {
        setTarget('/(tabs)/vistaUsuario');
      }
    };

    checkLogin();
  }, []);

  if (target === null) return null;

  return <Redirect href={target as any} />;
}
