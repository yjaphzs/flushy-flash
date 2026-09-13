import { router } from 'expo-router';

import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Pressable } from '@/components/ui/pressable';
import { View } from '@/components/ui/view';
import type { Building, Restroom } from '@/lib/types';

export type RestroomRowProps = {
  restroom: Restroom;
  buildings: Building[];
  /**
   * A short state chip on the right, e.g. "Verified". Omitted on surfaces where
   * every row would carry the same one, which is noise rather than signal.
   */
  badge?: { label: string; color: 'success' | 'warning' | 'default' } | null;
};

/**
 * One restroom in a list.
 *
 * Extracted when a third surface needed it. The Likes tab and `building/[id]`
 * had each inlined their own `Pressable > Card`, and they had already drifted —
 * different secondary lines for the same entity. A third copy is how a fourth
 * appears, so this is the shared one.
 *
 * `building/[id].tsx` deliberately still has its own: it shows a photo count
 * and a live status chip, and folding it in here would change what that screen
 * communicates rather than merely how it looks.
 *
 * The landmark comes first because it is what the submitter chose as
 * recognisable; the building name is the fallback, and `buildingId` is nullable
 * — a pin beside the lagoon belongs to no building at all.
 */
export function RestroomRow({ restroom, buildings, badge }: RestroomRowProps) {
  const buildingName = restroom.buildingId
    ? (buildings.find((b) => b.id === restroom.buildingId)?.name ?? 'Unknown building')
    : 'On campus';
  const placeName = restroom.landmark || buildingName;

  return (
    <Pressable onPress={() => router.push(`/restroom/${restroom.id}`)}>
      <Card>
        <Card.Body>
          <View className="flex-row items-start gap-3">
            <View className="flex-1">
              <Card.Title>{placeName}</Card.Title>
              <Card.Description>
                Floor {restroom.floor}
                {restroom.locationNote ? ` · ${restroom.locationNote}` : ''}
              </Card.Description>
            </View>
            {badge ? (
              <Chip color={badge.color} variant="soft">
                <Chip.Label>{badge.label}</Chip.Label>
              </Chip>
            ) : null}
          </View>
        </Card.Body>
      </Card>
    </Pressable>
  );
}
