import { Link, Stack } from 'expo-router';

import { ScreenScrollView } from '@/components/screen';
import { Text } from '@/components/text';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <ScreenScrollView contentContainerClassName="px-5 py-24 gap-3 items-center">
        <Text className="text-lg font-semibold">This screen does not exist.</Text>
        <Link href="/">
          <Text className="text-primary">Go to the map</Text>
        </Link>
      </ScreenScrollView>
    </>
  );
}
