import { router } from 'expo-router';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { ScreenScrollView } from '@/components/screen';
import { Text } from '@/components/text';
import { View } from '@/components/view';
import { signOut } from '@/features/auth/api';
import { CLSU_EMAIL_DOMAIN } from '@/lib/campus';
import { useAuthStore, useIsVerifiedStudent } from '@/stores/auth-store';

export default function ProfileScreen() {
  const displayName = useAuthStore((s) => s.displayName);
  const email = useAuthStore((s) => s.email);
  const photoURL = useAuthStore((s) => s.photoURL);
  const verified = useIsVerifiedStudent();

  return (
    <ScreenScrollView contentContainerClassName="px-5 py-6 gap-6">
      <View className="items-center gap-3">
        <Avatar size="lg">
          {photoURL ? <Avatar.Image source={{ uri: photoURL }} /> : null}
          <Avatar.Fallback />
        </Avatar>
        <View className="items-center gap-1">
          <Text className="text-xl font-semibold">{displayName ?? 'Student'}</Text>
          <Text className="text-sm text-muted-foreground">{email}</Text>
        </View>
        {verified ? (
          <Chip color="success">
            <Chip.Label>Verified CLSU student</Chip.Label>
          </Chip>
        ) : (
          <View className="items-center gap-2">
            <Chip variant="secondary">
              <Chip.Label>Unverified</Chip.Label>
            </Chip>
            <Text className="text-center text-xs text-muted-foreground">
              Verify a @{CLSU_EMAIL_DOMAIN} address to edit shared entries.
            </Text>
          </View>
        )}
      </View>

      <View className="gap-3">
        <Button variant="secondary" onPress={() => router.push('/settings')}>
          <Button.Label>Settings</Button.Label>
        </Button>
        <Button variant="danger-soft" onPress={() => signOut()}>
          <Button.Label>Sign out</Button.Label>
        </Button>
      </View>
    </ScreenScrollView>
  );
}
