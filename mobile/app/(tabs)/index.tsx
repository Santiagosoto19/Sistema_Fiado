import { Redirect } from 'expo-router';

export default function HomeScreen() {
  // Redirigimos el index (entrada principal) directamente a la vistaUsuario
  return <Redirect href="/vistaUsuario" />;
}
