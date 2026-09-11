import { Stack } from 'expo-router';

export default function AppLayout() {
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
