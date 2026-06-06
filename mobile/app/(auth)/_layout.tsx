import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="registerClientes" />
      <Stack.Screen name="home" />
      <Stack.Screen name="registerChoice" />

    </Stack>
  );
}
