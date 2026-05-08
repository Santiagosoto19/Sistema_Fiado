import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LogoutScreen() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const run = async () => {
      await AsyncStorage.multiRemove(['token', 'usuario', 'tendero', 'lastActive']);
      setDone(true);
    };
    run();
  }, []);

  if (!done) return null;
  return <Redirect href="/login" />;
}

