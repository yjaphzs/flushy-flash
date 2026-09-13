import { Link, Stack } from 'expo-router';

import { ScreenScrollView } from '@/components/layouts/screen';
import { Text } from '@/components/ui/text';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <ScreenScrollView contentContainerClassName="px-5 pt-24 gap-3 items-center">
        <Text className="text-lg font-semibold">This screen does not exist.</Text>
        <Link href="/">
          <Text className="text-link">Go to the map</Text>
        </Link>
      </ScreenScrollView>
    </>
  );
}
