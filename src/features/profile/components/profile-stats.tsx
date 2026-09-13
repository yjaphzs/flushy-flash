import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { router } from 'expo-router';

import { useLikedIds, useLikesLoading } from '@/stores/likes-store';
import { useCampusLoading, useRestrooms } from '@/stores/campus-store';
import { useIsOnline } from '@/stores/connection-store';

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
 *
 * ⚠️ **The same argument applies to a count that has not arrived, and used to
 * be ignored here.** Deriving from a store means an empty store renders `0` —
 * so a cold start with no signal told a contributor with a dozen restrooms on
 * the map that they had added none, in the same confident h3 as a real number.
 * `countable()` is what separates "counted, and it is zero" from "nothing to
 * count from": a filled cache is trusted offline, an empty one is not.
 */
const countable = (online: boolean, loading: boolean, source: unknown[]) =>
  !loading && (online || source.length > 0);

export function ProfileStats({ uid }: ProfileStatsProps) {
  const online = useIsOnline();
  const likedIds = useLikedIds();
  const likesLoading = useLikesLoading();
  const restrooms = useRestrooms();
  const campusLoading = useCampusLoading();

  const saved = countable(online, likesLoading, likedIds) ? likedIds.length : null;
  const mine = uid ? restrooms.filter((r) => r.createdBy === uid).length : 0;
  const added = countable(online, campusLoading, restrooms) ? mine : null;

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
  /** `null` is "not known right now", and renders as an em dash, never as 0. */
  value: number | null;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      // Spoken, the dash is silence. The count is the whole content of this
      // control, so its absence has to be said out loud.
      accessibilityLabel={value === null ? `${label}, not available yet` : `${value} ${label}`}
      className="flex-1 items-center gap-0.5 py-1"
    >
      <Text type="h3" weight="bold">
        {value ?? '—'}
      </Text>
      <Text type="body-xs" color="muted">
        {label}
      </Text>
    </Pressable>
  );
}
