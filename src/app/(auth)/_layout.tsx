import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerLargeTitle: true, headerTransparent: true }}>
      <Stack.Screen name="sign-in" options={{ title: 'Sign in' }} />
      <Stack.Screen name="sign-up" options={{ title: 'Create account' }} />
      <Stack.Screen
        name="forgot-password"
        options={{ title: 'Reset password', presentation: 'formSheet' }}
      />
    </Stack>
  );
}
