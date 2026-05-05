import { Redirect } from 'expo-router';

export default function WalletScreen() {
  // Redirigimos automáticamente de la pestaña 'Cartera' a la pantalla de 'Vista Usuario'
  // Esto asegura que el usuario vea la implementación completa de la Vista Usuario
  return <Redirect href="/vistaUsuario" />;
}
