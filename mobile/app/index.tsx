import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const [isLogged, setIsLogged] = useState<boolean | null>(null);

  useEffect(() => {
    const checkLogin = async () => {
      
      await AsyncStorage.clear();


      const token = await AsyncStorage.getItem('token'); // 👈 AQUÍ
      console.log('TOKEN:', token); // 👈 Y AQUÍ

      setIsLogged(!!token);
    };

    checkLogin();
  }, []);

  if (isLogged === null) return null;

  return isLogged ? (
    <Redirect href="/(tabs)/dashboard" />
  ) : (
     <Redirect href="/login" />
  );
}