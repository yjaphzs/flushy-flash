import '../global.css';

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import { AppProviders } from '@/components/app-providers';
import { useAuthListener } from '@/hooks/use-auth-listener';
import { useAuthStatus } from '@/stores/auth-store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useAuthListener();
  const status = useAuthStatus();

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync();
  }, [status]);

  // Hold the native splash until Firebase has restored (or rejected) the session.
  // Returning null here is what stops the sign-in screen flashing on cold start.
  if (status === 'loading') return null;

  return (
    <AppProviders>
      <StatusBar style="auto" />
      {/*
        Stack.Protected is declarative and evaluated before any screen mounts, so
        there is no render-then-redirect flash, deep links into a protected route
        survive the sign-in round trip, and a protected route simply does not
        exist in the navigation state while signed out.
      */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={status === 'signedIn'}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={status === 'signedOut'}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </AppProviders>
  );
}
