import { Stack } from 'expo-router';

import { useAuthGateResume } from '@/features/auth/use-auth-gate';
import { useCampusData } from '@/hooks/use-campus-data';
import { useMyLikes } from '@/hooks/use-my-likes';

export default function AppLayout() {
  // Mounted here rather than on the map tab. (app) is now permanently mounted
  // and no longer tied to the map's lifecycle, so a deep link straight to
  // /building/x or /restroom/y gets data without the map ever having rendered —
  // which is what makes "This restroom is no longer listed." an honest message
  // instead of a race.
  useCampusData();

  // Picks up where the user was going before the gate interrupted them.
  useAuthGateResume();

  // Keyed on uid: clears on sign-out, re-opens on sign-in.
  useMyLikes();

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="building/[id]" options={{ title: '', headerBackButtonDisplayMode: 'minimal' }} />
      <Stack.Screen name="restroom/[id]" options={{ title: '', headerBackButtonDisplayMode: 'minimal' }} />
      {/* Screen-level modals use native presentations, not a JS bottom sheet. */}
      <Stack.Screen
        name="submit"
        options={{ presentation: 'modal', title: 'Add a restroom', sheetGrabberVisible: true }}
      />
      <Stack.Screen
        name="review/[restroomId]"
        options={{
          presentation: 'formSheet',
          title: 'Write a review',
          sheetAllowedDetents: [0.6, 1],
          sheetGrabberVisible: true,
        }}
      />
      <Stack.Screen name="settings" options={{ title: 'Settings', headerLargeTitle: true }} />
    </Stack>
  );
}
