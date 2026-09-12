import { Stack } from 'expo-router';

import { useAuthGateResume } from '@/features/auth/use-auth-gate';
import { useCampusData } from '@/hooks/use-campus-data';
import { useMyLikes } from '@/hooks/use-my-likes';
import { UpdateDialog } from '@/features/updates/components/update-dialog';
import { useUpdateCheck } from '@/features/updates/use-update-check';

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

  // Here rather than on a screen: (app) is permanently mounted, so a download
  // in flight survives navigation and the dialog never remounts mid-transfer.
  useUpdateCheck();

  return (
    /*
      Headers OFF for the whole group, matching `(auth)`.

      This used to be a bare <Stack>, which meant `headerShown` defaulted to
      TRUE and every pushed screen got a platform header carrying a duplicate of
      the heading it already rendered. Screens draw their own chevron and H1
      through @/components/layouts/form-screen instead, which can be tinted,
      aligned to the content edge and given a real 44pt touch target.

      Each `title` below is deliberately KEPT. It no longer draws anything, but
      it still feeds the route title and the accessibility tree, and Android
      hardware back is unaffected either way.
    */
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="building/[id]" options={{ title: 'Building' }} />
        <Stack.Screen name="restroom/[id]" options={{ title: 'Restroom' }} />
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
        {/*
          fullScreenModal, not a push — and the distinction is not cosmetic.

          `/submit` is itself `presentation: 'modal'`, which on iOS is a page
          sheet with a gap at the top. A default push lands INSIDE that sheet,
          so the "full-screen" placer would be a 90%-height card with the map's
          top edge cut off — the exact problem it exists to fix.

          It is also a SIBLING route rather than anything that replaces
          `/submit`, so the form stays mounted underneath and keeps its picked
          photos (local file URIs) across the round trip.
        */}
        <Stack.Screen
          name="pick-location"
          options={{ presentation: 'fullScreenModal', title: 'Where is it?' }}
        />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
      <UpdateDialog />
    </>
  );
}
