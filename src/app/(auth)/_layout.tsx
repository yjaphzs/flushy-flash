import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useAuthGateStore } from '@/stores/auth-gate-store';
import { useAuthStatus } from '@/stores/auth-store';

/**
 * Everything between "browsing as a guest" and "can actually contribute", in ONE
 * group: sign in or up, confirm the address, pick a handle.
 *
 * ## Why this is one group and not two
 *
 * These stages used to live in a separate `(onboarding)` group, presented by a
 * second `Stack.Protected` in the root layout. That could never work, and the
 * reason is worth stating because the fix is not obvious:
 *
 * **`Stack.Protected` only ever REMOVES routes. It cannot present one.**
 * `expo-router/build/react-navigation/routers/StackRouter.js` →
 * `getStateForRouteNamesChange` filters the existing stack to the routes still
 * permitted, and pushes something only when `routes.length === 0`. A
 * newly-permitted route name is never navigated to.
 *
 * So a first-time Google user hit this: sign-in succeeds, `status` leaves
 * 'guest', the whole `(auth)` group is filtered out of the ROOT stack and the
 * modal tears itself down — which is the "it sent me back to the login screen"
 * — and `(onboarding)` becomes available with nothing to present it.
 *
 * It regressed when the app went guest-first. While `(app)` was guarded,
 * removing `(auth)` emptied the root stack, so that fallback-insert fired and
 * did the presenting. `(app)` is unguarded now, so it never can again.
 *
 * With one group the root modal stays mounted for the whole flow and the swap
 * happens HERE, in the child stack — where removing the current screen genuinely
 * does empty `routes`, so the fallback-insert works as designed.
 *
 * `initialRouteName` is deliberately relied on being IGNORED mid-flow: the
 * fallback only honours it when `routeNames.includes(it)`, which is false once
 * the guest screens are filtered out. It then falls through to `routeNames[0]`,
 * the one permitted stage.
 *
 * Declaration order is therefore load-bearing — the stages must be declared in
 * the order a user passes through them.
 */
export const unstable_settings = { initialRouteName: 'join' };

export default function AuthLayout() {
  const status = useAuthStatus();

  // A write intent is only live while this flow is on screen. Clearing the flag
  // on unmount is how useAuthGateResume tells "they finished" from "they backed
  // out" — without it, signing in later from somewhere else would drop the user
  // into a composer they had already walked away from.
  //
  // One group also fixes a bug here: this used to fire the moment status left
  // 'guest', i.e. mid-flow, discarding the intent before onboarding had even
  // happened. It now fires when the account is finished, where `canWrite` is
  // true and useAuthGateResume can actually resume.
  useEffect(() => () => useAuthGateStore.getState().setGateOpen(false), []);

  return (
    <>
      {/*
        The root layout uses `style="auto"`, which picks light/dark from the
        colour scheme rather than from what is actually behind the bar. The auth
        gradient's top stop is dark in BOTH schemes, so the bar needs light
        content either way. The last mounted StatusBar wins.
      */}
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          // Headers are off so the gradient can run full-bleed. A large
          // transparent title would duplicate each screen's own H1 and inflate
          // the scroll inset. `title` is kept per screen: it still feeds the
          // route title and accessibility, and Android hardware back is
          // unaffected.
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
        }}
      >
        {/*
          `|| status === 'checking'` is load-bearing twice over, and removing it
          breaks two different things:

          1. `checking` is the async profile read after a credential lands. The
             user is looking at the sign-in screen with its spinner running;
             filtering it out mid-request tears that screen down under them.
          2. It keeps `routeNames` NON-EMPTY. At `checking` no other stage is
             permitted, so without this the fallback-insert would push
             `routeNames[0]` where that is `undefined`.
        */}
        <Stack.Protected guard={status === 'guest' || status === 'checking'}>
          <Stack.Screen name="join" options={{ title: 'Join Flushy Flash' }} />
          <Stack.Screen name="sign-in" options={{ title: 'Sign in' }} />
          <Stack.Screen name="sign-up" options={{ title: 'Create account' }} />
          <Stack.Screen
            name="forgot-password"
            options={{
              title: 'Reset password',
              // A one-field sub-task: the sheet keeps sign-in visible behind it.
              presentation: 'formSheet',
              sheetGrabberVisible: true,
              sheetAllowedDetents: [0.55, 1],
              sheetCornerRadius: 28,
            }}
          />
        </Stack.Protected>

        {/*
          Only a PASSWORD account can reach this: a federated address arrives
          verified, and statusForUser() skips the stage for it entirely. A
          Google user with an unconfirmed address would have no password to
          reset and would be stranded here.
        */}
        <Stack.Protected guard={status === 'needsVerification'}>
          <Stack.Screen name="verify-email" options={{ title: 'Confirm your email' }} />
        </Stack.Protected>

        {/*
          Authenticated with no users/{uid}. firestore.rules requires a handle to
          create that document and Google supplies none, so this is where a
          first-time Google account lands.
        */}
        <Stack.Protected guard={status === 'needsProfile'}>
          <Stack.Screen name="complete-profile" options={{ title: 'Finish setting up' }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
