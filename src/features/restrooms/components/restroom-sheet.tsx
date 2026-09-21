import { useEffect, useState } from 'react';
import { router } from 'expo-router';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useBottomInset } from '@/components/layouts/tab-bar-metrics';
import { LikeButton } from '@/features/likes/components/like-button';
import { fetchRatingSummary } from '@/features/restrooms/api';
import {
  AccessChip,
  AmenityIcons,
  StatLine,
  StatusChip,
} from '@/features/restrooms/components/restroom-detail';
import { openPhotos } from '@/features/restrooms/photo-viewer';
import { RestroomThumbnail } from '@/features/restrooms/components/restroom-thumbnail';
import { useCanWrite, useUid } from '@/stores/auth-store';
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
  /** The viewer's last fix, for the distance in the stat line. */
  origin: LatLng | null;
  onClose: () => void;
};

/** The square thumbnail in the header row. */
const THUMB = 88;

/**
 * The PREVIEW a map pin opens — a glance, not the record.
 *
 * ## ⚠️ It is sized by its content, so content is the only height control
 *
 * Nothing here passes `snapPoints`, so gorhom runs in dynamic-sizing mode and
 * the sheet is simply as tall as this body measures. There is no height prop to
 * reach for, and the content does not scroll: a `BottomSheetView` that overflows
 * is CLIPPED, silently, from the bottom.
 *
 * That is exactly what this used to do. It stacked eight sections — stat tiles,
 * a photo strip, the amenity grid, a score bar, the trust row — measured around
 * 980pt, and on a phone the last thing in it rendered behind the navigation bar
 * with the primary button off-screen entirely. A preview whose action you cannot
 * reach.
 *
 * So the rule for this file is: **four blocks, all of bounded height.** The
 * compact variants exist for it (`StatLine`, `AmenityIcons` in
 * `restroom-detail.tsx`), the title is clamped, and free text — the location
 * note, the review list — belongs on `/restroom/[id]`. Anything added here has
 * to earn its pixels against something already present.
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
   * rating for a frame when the sheet switches pins.
   */
  const [counted, setCounted] = useState<RatingSummary | null>(null);
  const restroomId = restroom?.id;

  /**
   * Ratings are computed server-side (`getAggregateFromServer`) rather than read
   * off the document, so this is one read per open.
   *
   * It used to be TWO: this effect fetched the count for the button label while
   * `ScoreBar` independently fetched the same summary for its track. `ScoreBar`
   * has moved to the page, so this is now the sheet's only call — and it keeps
   * the average as well as the count, because `StatLine` shows both.
   */
  useEffect(() => {
    if (!restroomId) return;
    let live = true;
    fetchRatingSummary(restroomId)
      .then((s) => {
        if (live) setCounted({ id: restroomId, count: s.count, average: s.average });
      })
      .catch(() => {
        // The stat line shows an em dash; a failed count is not worth an error state.
      });
    return () => {
      live = false;
    };
  }, [restroomId]);

  const summary = restroomId && counted?.id === restroomId ? counted : null;

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
              summary={summary}
              buildings={buildings}
              onClose={onClose}
            />
          ) : null}
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}

type RatingSummary = { id: string; count: number; average: number | null };

/**
 * The contents, split out so the sheet above can stay mounted with nothing
 * selected — and so every value below can be derived from a non-null restroom
 * without a guard on each one.
 */
function SheetBody({
  restroom,
  origin,
  summary,
  buildings,
  onClose,
}: {
  restroom: Restroom;
  origin: LatLng | null;
  summary: RatingSummary | null;
  buildings: Building[];
  onClose: () => void;
}) {
  const uid = useUid();
  const canWrite = useCanWrite();
  const bottomInset = useBottomInset();
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
    /*
      No `px-*`: heroui's own content container already applies 20pt on all four
      sides (`.bottom-sheet__content-container`). This body used to add
      `px-5 pb-8` on top of that, which is where the doubled padding came from.

      ⚠️ The BOTTOM is different, and it is the one number heroui gets wrong
      here. Its container class is `pb-safe-offset-3`, which should be the
      safe-area inset plus 12 — but measured on a three-button Android device
      the primary button sat ~15dp off the navigation bar rather than ~60, so
      that class is not resolving to anything under uniwind. An unresolved class
      produces no style and no error, which is why this was invisible until
      somebody looked at a screenshot.

      So the inset is applied here, explicitly. `useBottomInset()` and not
      `useScreenBottomClearance()`: heroui's own 20pt padding is already the
      breathing room the gap constant would otherwise add.
    */
    <View className="gap-4 pt-1" style={{ paddingBottom: bottomInset }}>
      <View className="flex-row items-center gap-3">
        <RestroomThumbnail
          path={restroom.photoIds[0]}
          size={THUMB}
          onPress={() => openPhotos(restroom.photoIds, 0)}
        />

        <View className="flex-1 gap-0.5">
          {/*
            Clamped, because this is the one piece of user text left in the
            sheet and a long landmark is the only thing that could still push
            the layout past a glance.
          */}
          <Text type="h3" weight="bold" numberOfLines={2}>
            {title}
          </Text>
          {/*
            Two lines, because one truncated "Science and Technology Centru…"
            and took the floor with it — and the floor is the half a stranger
            standing in the building actually needs.
          */}
          <Text type="body-sm" color="muted" numberOfLines={2}>
            {building ? `${building.name} · Floor ${restroom.floor}` : `Floor ${restroom.floor}`}
          </Text>
        </View>

        <LikeButton
          restroomId={restroom.id}
          uid={uid}
          canWrite={canWrite}
          href={`/restroom/${restroom.id}`}
        />
      </View>

      {/*
        The verified state is all that survives of TrustRow here. Confirming or
        reporting means you walked there and checked — a considered action that
        belongs on the page, next to the reviews, not on a sheet someone opened
        to decide whether to walk at all.
      */}
      <View className="flex-row flex-wrap items-center gap-2">
        <StatusChip status={restroom.status} />
        <AccessChip genderedAs={restroom.amenities.genderedAs} />
        {restroom.verified ? (
          <Chip color="success" variant="soft">
            <Chip.Label>Verified</Chip.Label>
          </Chip>
        ) : null}
      </View>

      <StatLine
        distanceM={away}
        updatedAt={restroom.updatedAt}
        reviewCount={summary?.count ?? null}
        rating={summary?.average ?? null}
      />

      <AmenityIcons amenities={restroom.amenities} />

      <Button
        size="lg"
        className="rounded-full"
        onPress={() => {
          onClose();
          router.push(`/restroom/${restroom.id}`);
        }}
      >
        {/*
          Primary, and no longer count-aware. It used to read "See N reviews",
          which described the least of what is through it — the photos, the
          directions, the amenities and the confirm/report buttons all live
          there now. The review count moved to the stat line, where it is a fact
          rather than a promise about a destination.
        */}
        <Button.Label>View details</Button.Label>
      </Button>
    </View>
  );
}
