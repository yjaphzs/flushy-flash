import '../global.css';

import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import { AppProviders } from '@/components/layouts/app-providers';
import { LoadingScreen } from '@/components/common/loading-screen';
import { useAuthListener } from '@/hooks/use-auth-listener';
import { useSplashGate } from '@/hooks/use-splash-gate';
import { useAuthStatus } from '@/stores/auth-store';

// Both of these are fire-and-forget promises, and `hideAsync` rejects if the
// splash is already gone. Unhandled, that surfaces as a rejection warning in a
// code path that has nothing useful to say.
SplashScreen.preventAutoHideAsync().catch(() => {});
// Cross-fade into our own loading screen instead of cutting to it.
SplashScreen.setOptions({ fade: true, duration: 300 });

export default function RootLayout() {
  useAuthListener();
  const status = useAuthStatus();

  /**
   * The cold-start hold, which used to be `if (!hydrated) return null`.
   *
   * Returning null kept the native splash up, but it also meant AppProviders —
   * and therefore uniwind's theme context — did not exist, so nothing themed
   * could be drawn during the hold. The tree now mounts immediately and the
   * loading screen is an absolute layer ON TOP of it, which also lets the map
   * warm up behind the logo instead of starting cold afterwards.
   *
   * Mounting the Stack early is safe: at `status === 'loading'` neither
   * Stack.Protected guard matches, so only `(app)` mounts — the guest-first map,
   * which is where most cold starts land anyway.
   */
  const holding = useSplashGate();

  /**
   * Every state in which the account cannot yet write — guest, mid-check,
   * unconfirmed address, or no profile document. Named rather than inlined
   * because `react/jsx-no-leaked-render` rejects `&&` inside JSX, and because
   * the condition is easier to reason about with a name on it.
   */
  const accountUnfinished = status !== 'signedIn' && status !== 'loading';
  const [splashMounted, setSplashMounted] = useState(true);

  // Hand over from the native splash as soon as OUR screen can paint, not when
  // auth resolves — otherwise the native splash and the JS one both wait, and
  // the fade is wasted on an already-finished load.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <AppProviders>
      <StatusBar style="auto" />
      {/*
        The app is guest-first, so (app) is no longer behind a guard — everyone
        gets the map. Authentication is a modal presented *over* it.

        ONE guard for the whole account flow, not one per stage. Stack.Protected
        can only REMOVE routes — it never presents a newly-permitted one — so two
        sibling guards meant the first modal tore itself down mid-flow and the
        second was never shown. (auth)/_layout.tsx carries the full explanation
        and the stage guards; this one decides only whether the flow exists.

        Available is not the same as presented: a guest keeps browsing until
        something pushes to /join or /sign-in. What this buys is the dismissal —
        when the account becomes usable the group leaves the navigation state and
        the modal dismisses itself back onto the map, with (app) never unmounted,
        so the user returns to exactly the screen they left. No screen navigates
        after an auth action.
      */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(app)" />

        <Stack.Protected guard={accountUnfinished}>
          <Stack.Screen name="(auth)" options={{ presentation: 'modal' }} />
        </Stack.Protected>
      </Stack>

      {splashMounted ? (
        <LoadingScreen
          leaving={!holding}
          onFadedOut={() => setSplashMounted(false)}
          testID="loading-screen"
        />
      ) : null}
    </AppProviders>
  );
}
