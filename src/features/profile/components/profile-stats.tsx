import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { router } from 'expo-router';

import { useLikedIds } from '@/stores/likes-store';
import { useRestrooms } from '@/stores/campus-store';

export type ProfileStatsProps = {
  uid: string | null;
};

/**
 * Saved and Added, counted from data already in memory.
 *
 * ⚠️ **`reviewCount` is NOT here, and that is the point.** The field exists on
 * the user document and the rules pin it to 0 forever — no client may write an
 * aggregate and no Cloud Function maintains it yet (§7). Rendering it would
 * ship the bug `building/[id].tsx` already had once: a card reading "0 reviews"
 * for someone with forty. A stat that is always zero is worse than an absent
 * one, because it looks like a measurement.
 *
 * Both numbers below are derived from live stores rather than stored counters,
 * so they cost no read and cannot go stale: `likes-store` is the same snapshot
 * the Likes tab renders, and `campus-store` already holds every restroom
 * because the whole app is one campus (§6).
 */
export function ProfileStats({ uid }: ProfileStatsProps) {
  const saved = useLikedIds().length;
  const restrooms = useRestrooms();
  const added = uid ? restrooms.filter((r) => r.createdBy === uid).length : 0;

  return (
    <View
      className="flex-row items-center rounded-3xl border border-border bg-surface px-2 py-4"
      style={{ borderCurve: 'continuous' }}
    >
      {/*
        Both tiles navigate, not just one. A strip where half the numbers are
        tappable and half are not teaches people that numbers here do nothing.
      */}
      <Stat value={saved} label="Saved" onPress={() => router.push('/likes')} />
      <View className="h-8 w-px bg-border" />
      <Stat value={added} label="Added" onPress={() => router.push('/my-restrooms')} />
    </View>
  );
}

function Stat({
  value,
  label,
  onPress,
}: {
  value: number;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${value} ${label}`}
      className="flex-1 items-center gap-0.5 py-1"
    >
      <Text type="h3" weight="bold">
        {value}
      </Text>
      <Text type="body-xs" color="muted">
        {label}
      </Text>
    </Pressable>
  );
}
