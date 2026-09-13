import { useEffect, useState } from 'react';
import { router } from 'expo-router';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { fetchRatingSummary } from '@/features/restrooms/api';
import {
  AccessChip,
  AmenityGrid,
  StatRow,
  StatusChip,
} from '@/features/restrooms/components/restroom-detail';
import { PhotoStrip } from '@/features/restrooms/components/photo-strip';
import { ScoreBar } from '@/features/restrooms/components/score-bar';
import { TrustRow } from '@/features/restrooms/components/trust-row';
import { useBuildings } from '@/stores/campus-store';
import type { LatLng } from '@/lib/campus';
import { distanceM } from '@/lib/geo';
import type { Building, Restroom } from '@/lib/types';

export type RestroomSheetProps = {
  /**
   * Controlled, and it must genuinely transition false → true. See the docblock:
   * mounting this component with `isOpen` already true does nothing at all.
   */
  isOpen: boolean;
  restroom: Restroom | null;
  /** The viewer's last fix, for the distance tile. */
  origin: LatLng | null;
  onClose: () => void;
};

/**
 * The detail sheet a map pin opens.
 *
 * Deliberately NOT a replacement for `/restroom/[id]`: a deep link and a
 * notification tap need somewhere to land, and a long review list inside a sheet
 * is a worse read than a page.
 *
 * ## ⚠️ This tree must stay MOUNTED. Never early-return null.
 *
 * heroui's sheet seeds `prevIsOpenRef = useRef(isOpen)` and calls
 * `snapToIndex()` only on a false → true transition. A component mounted with
 * `isOpen` already true therefore has `wasOpen === true` on its first effect,
 * never snaps, and the underlying gorhom sheet sits at `index: -1` forever.
 *
 * That was this component's own bug: it returned null when nothing was selected
 * and hardcoded `isOpen`, so every open was a fresh mount. The symptom was NOT
 * "the sheet looks wrong" — it was **"tapping a pin does nothing"**, because the
 * overlay still mounts at `pointerEvents: 'auto'` with opacity 0 and silently
 * eats the next tap on the map.
 *
 * So: the sheet stays mounted for the life of the screen and `isOpen` is a prop.
 * The body is what unmounts, inside `.Content`. `searching-dialog.tsx` is the
 * same shape and is why that one always worked.
 */
export function RestroomSheet({ isOpen, restroom, origin, onClose }: RestroomSheetProps) {
  const buildings = useBuildings();
  /**
   * Keyed by restroom id and derived during render, for the same reason as
   * usePhotoUrl: clearing in the effect body is a synchronous setState the
   * React Compiler lint rejects, and it would show the PREVIOUS restroom's
   * review count for a frame when the sheet switches pins.
   */
  const [counted, setCounted] = useState<{ id: string; count: number } | null>(null);
  const restroomId = restroom?.id;

  // Ratings are computed server-side (getAggregateFromServer) rather than
  // denormalised, so this is a read per open rather than a field on the doc.
  useEffect(() => {
    if (!restroomId) return;
    let live = true;
    fetchRatingSummary(restroomId)
      .then((s) => {
        if (live) setCounted({ id: restroomId, count: s.count });
      })
      .catch(() => {
        // The tile shows an em dash; a failed count is not worth an error state.
      });
    return () => {
      live = false;
    };
  }, [restroomId]);

  const reviews = restroomId && counted?.id === restroomId ? counted.count : null;

  return (
    <BottomSheet isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content>
          {/*
            Only the BODY unmounts. Keeping it mounted while closed would mean
            rendering a stale restroom behind the overlay; unmounting the sheet
            itself is what breaks it entirely (see the docblock).
          */}
          {restroom ? (
            <SheetBody
              restroom={restroom}
              origin={origin}
              reviews={reviews}
              buildings={buildings}
              onClose={onClose}
            />
          ) : null}
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}

/**
 * The contents, split out so the sheet above can stay mounted with nothing
 * selected — and so every value below can be derived from a non-null restroom
 * without a guard on each one.
 */
function SheetBody({
  restroom,
  origin,
  reviews,
  buildings,
  onClose,
}: {
  restroom: Restroom;
  origin: LatLng | null;
  reviews: number | null;
  buildings: Building[];
  onClose: () => void;
}) {
  const building = buildings.find((b) => b.id === restroom.buildingId);
  const title = restroom.landmark || building?.name || 'Restroom';
  const away =
    origin === null
      ? null
      : distanceM(origin, {
          lat: restroom.location.latitude,
          lng: restroom.location.longitude,
        });

  return (
    <View className="gap-5 px-5 pb-8 pt-2">
      <View className="gap-2">
        {/* Bold to match /restroom/[id]'s heading — same restroom, same emphasis. */}
        <Text type="h3" weight="bold">
          {title}
        </Text>
        <View className="flex-row flex-wrap items-center gap-2">
          <StatusChip status={restroom.status} />
          <AccessChip genderedAs={restroom.amenities.genderedAs} />
          {building ? (
            <Text type="body-sm" color="muted">
              {building.name}
            </Text>
          ) : null}
        </View>
      </View>

      <StatRow distanceM={away} updatedAt={restroom.updatedAt} reviewCount={reviews} />

      <PhotoStrip photoIds={restroom.photoIds} />

      {restroom.locationNote ? (
        <View className="gap-1">
          <Text type="body-xs" weight="semibold" color="muted">
            HOW TO GET THERE
          </Text>
          <Text type="body-sm">{restroom.locationNote}</Text>
        </View>
      ) : null}

      <AmenityGrid amenities={restroom.amenities} />

      <ScoreBar restroomId={restroom.id} />

      {/*
        Above the reviews button rather than below it: whether the place
        exists at all is a more basic question than what it is like, and a
        reader who cannot find it will not care about its rating.
      */}
      <TrustRow restroom={restroom} />

      <Button
        variant="secondary"
        size="lg"
        className="rounded-full"
        onPress={() => {
          onClose();
          router.push(`/restroom/${restroom.id}`);
        }}
      >
        {/*
          Count-aware, using the number the sheet already fetched. The zero case
          matters most: a button saying "See reviews" that lands on an empty
          state is the exact thing this codebase avoids elsewhere — and `null`
          is "still loading or the read failed", which must NOT collapse into
          zero (restroom/[id] already refuses that conflation).
        */}
        <Button.Label>
          {reviews === null
            ? 'See reviews'
            : reviews === 0
              ? 'Be the first to review'
              : `See ${reviews} review${reviews === 1 ? '' : 's'}`}
        </Button.Label>
      </Button>
    </View>
  );
}
