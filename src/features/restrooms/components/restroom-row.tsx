import { router } from 'expo-router';

import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Pressable } from '@/components/ui/pressable';
import { View } from '@/components/ui/view';
import { AccessChip, StatusChip } from '@/features/restrooms/components/restroom-detail';
import { RestroomThumbnail } from '@/features/restrooms/components/restroom-thumbnail';
import type { Building, Restroom } from '@/lib/types';

export type RestroomRowProps = {
  restroom: Restroom;
  buildings: Building[];
  /**
   * A short state chip on the right, e.g. "Verified". Omitted on surfaces where
   * every row would carry the same one, which is noise rather than signal.
   */
  badge?: { label: string; color: 'success' | 'warning' | 'default' } | null;
  /**
   * An extra line under a hairline, for something only one surface cares about
   * — "Your restrooms" puts the confirmation count here. Omit and no rule is
   * drawn, so the Likes tab is unaffected.
   */
  footer?: React.ReactNode;
};

/** Square photo tile. 72 keeps the row near 104pt including Card.Body's padding. */
const THUMB = 72;

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
 *
 * ## ⚠️ The status chip renders only when the restroom is NOT open
 *
 * "Open" on every row of a list is decoration: it is the overwhelmingly common
 * case, so it carries no information and costs a chip's width on every entry.
 * The exception is the signal. `building/[id].tsx` reached the same conclusion
 * independently, which is some evidence it is the right one.
 *
 * That is the opposite of `/restroom/[id]`, where the chip is always drawn —
 * correctly, because a single restroom in full should state its condition
 * rather than leave the reader to infer it from an absence.
 *
 * ## The secondary line is the PLACE, not the directions
 *
 * It used to read `Floor N · locationNote` — "Floor 1 · Walk inside the main
 * gate". Directions are what you need once you have arrived and are looking for
 * a door; in a list you are still choosing, and the question is which building
 * this is in. So the line is `building · Floor N`, matching what the map sheet
 * and `/restroom/[id]` put under their titles. `locationNote` is still on both
 * of those, one tap away.
 *
 * The building is omitted when there is no landmark, because the title is then
 * the building name and printing it twice is noise.
 *
 * ## ⚠️ No rating, and that is not an oversight
 *
 * `ratingSum` / `ratingCount` are on the document but are rules-pinned to 0
 * with no Cloud Function maintaining them. `building/[id].tsx` records the bug
 * that caused: a card reading "No reviews yet" on a restroom with forty. A real
 * average needs `fetchRatingSummary`, which is `getAggregateFromServer` — one
 * network round trip PER ROW. A list is exactly where that is unaffordable.
 */
export function RestroomRow({ restroom, buildings, badge, footer }: RestroomRowProps) {
  const buildingName = restroom.buildingId
    ? (buildings.find((b) => b.id === restroom.buildingId)?.name ?? 'Unknown building')
    : 'On campus';
  const placeName = restroom.landmark || buildingName;

  return (
    <Pressable
      onPress={() => router.push(`/restroom/${restroom.id}`)}
      accessibilityRole="button"
    >
      <Card>
        <Card.Body>
          <View className="flex-row items-center gap-3">
            <RestroomThumbnail path={restroom.photoIds[0]} size={THUMB} />

            <View className="flex-1 gap-1">
              <View className="flex-row items-start gap-2">
                <View className="flex-1">
                  <Card.Title>{placeName}</Card.Title>
                  <Card.Description>
                    {restroom.landmark
                      ? `${buildingName} · Floor ${restroom.floor}`
                      : `Floor ${restroom.floor}`}
                  </Card.Description>
                </View>
                {badge ? (
                  <Chip color={badge.color} variant="soft">
                    <Chip.Label>{badge.label}</Chip.Label>
                  </Chip>
                ) : null}
              </View>

              {/*
                `AccessChip` returns null on a null `genderedAs`, so it drops in
                unguarded — but the ROW has to collapse too, or an unknown
                gender on an open restroom leaves an empty 8pt gap.
              */}
              {restroom.status !== 'ok' || restroom.amenities.genderedAs ? (
                <View className="flex-row flex-wrap items-center gap-1.5">
                  {restroom.status !== 'ok' ? <StatusChip status={restroom.status} /> : null}
                  <AccessChip genderedAs={restroom.amenities.genderedAs} />
                </View>
              ) : null}
            </View>
          </View>

          {footer ? (
            <View className="mt-3 gap-2 border-t border-border pt-3">{footer}</View>
          ) : null}
        </Card.Body>
      </Card>
    </Pressable>
  );
}

/** The row's own height, so a list's `estimatedItemSize` cannot drift from it. */
export const RESTROOM_ROW_HEIGHT = 108;
