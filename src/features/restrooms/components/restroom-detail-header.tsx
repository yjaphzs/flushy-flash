import { router } from 'expo-router';

import { ActionGroup, ActionRow } from '@/components/common/action-row';
import { FloatingBackButton } from '@/components/layouts/floating-back-button';
import { useScreenTopClearance } from '@/components/layouts/tab-bar-metrics';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useRequestWrite } from '@/features/auth/use-auth-gate';
import { LikeButton } from '@/features/likes/components/like-button';
import { DeleteRestroomRow } from '@/features/restrooms/components/delete-restroom-row';
import { PhotoStrip } from '@/features/restrooms/components/photo-strip';
import {
  AccessChip,
  AmenityGrid,
  StatRow,
  StatusChip,
} from '@/features/restrooms/components/restroom-detail';
import { RestroomHero } from '@/features/restrooms/components/restroom-hero';
import { ScoreBar } from '@/features/restrooms/components/score-bar';
import { TrustRow } from '@/features/restrooms/components/trust-row';
import { useCanWrite, useUid } from '@/stores/auth-store';
import { lastKnownPoint } from '@/lib/location';
import { distanceM } from '@/lib/geo';
import type { Building, Restroom } from '@/lib/types';

export type RestroomDetailHeaderProps = {
  restroom: Restroom;
  building: Building | undefined;
  /** From the same server aggregate the reviews come from; null while loading. */
  reviewCount: number | null;
};

/** How far the content overlaps the hero's lower edge. */
const OVERLAP = 24;

/**
 * Everything on `/restroom/[id]` above the reviews.
 *
 * ## Why this is a component and not JSX in the route
 *
 * Two reasons, and the second is the load-bearing one.
 *
 * The route is a `List` whose `ListHeaderComponent` is the entire detail — it
 * inverts rather than nesting because a `List` inside a `ScreenScrollView` is a
 * banned nested VirtualizedList. That already made the route file unusually
 * large, and `eslint.config.js` caps every file under `src/` at 200 CODE lines.
 * The route was sitting at roughly 180 before this, so the redesign could not
 * have been written inline at all.
 *
 * ## This page used to draw its own everything
 *
 * `restroom-detail.tsx` opens by saying its pieces are shared with this page
 * precisely so "the sheet says Clean but the page says Out of order" cannot
 * happen. That had stopped being true: the page imported two of the six, and
 * hand-rolled the rest — including a SECOND amenity-label map that said "Has
 * water" where the shared one says "Water".
 *
 * The concrete bug that fixed: **`restroom.status` was never rendered here at
 * all**, so an out-of-order restroom looked open on the only screen that shows
 * its reviews. `genderedAs` was invisible too. Both arrive with `StatusChip`
 * and `AccessChip` below, which is why adopting the shared kit is a correctness
 * change and not a tidy-up.
 */
export function RestroomDetailHeader({
  restroom,
  building,
  reviewCount,
}: RestroomDetailHeaderProps) {
  const uid = useUid();
  const canWrite = useCanWrite();
  const requestWrite = useRequestWrite();
  const topClearance = useScreenTopClearance();

  const title = restroom.landmark || building?.name || 'Restroom';

  /**
   * `lastKnownPoint()` never prompts — it returns the fix this session already
   * has, or null. Asking for location because someone opened a page would be
   * the opposite of the rule the rest of the app keeps: the only two prompts
   * are the nearest-restroom button and the pin placer's locate control.
   */
  const origin = lastKnownPoint();
  const away =
    origin === null
      ? null
      : distanceM(origin, {
          lat: restroom.location.latitude,
          lng: restroom.location.longitude,
        });

  return (
    <View>
      <RestroomHero photoIds={restroom.photoIds} title={title} />
      <FloatingBackButton onPress={() => router.back()} top={topClearance} />

      {/*
        Pulled up over the hero's lower edge with its own rounded top, so the
        page reads as one sheet lifted over the photograph rather than two
        stacked bands. The same move Profile makes with the avatar straddling
        its brand band.
      */}
      <View
        className="gap-4 rounded-t-3xl bg-background px-5 pt-5"
        style={{ marginTop: -OVERLAP, borderCurve: 'continuous' }}
      >
        <View className="gap-2">
          {/*
            The LANDMARK, matching the map sheet's `landmark || building.name ||
            'Restroom'`. `weight="bold"` because h2 is only semibold by default
            and this is the one line on the page that has to carry.
          */}
          <View className="gap-1">
            <Text type="h2" weight="bold" accessibilityRole="header">
              {title}
            </Text>
            <Text type="body-sm" color="muted">
              {building ? `${building.name} · Floor ${restroom.floor}` : `Floor ${restroom.floor}`}
            </Text>
          </View>

          <View className="flex-row flex-wrap items-center gap-2">
            <StatusChip status={restroom.status} />
            <AccessChip genderedAs={restroom.amenities.genderedAs} />
          </View>
        </View>

        <StatRow distanceM={away} updatedAt={restroom.updatedAt} reviewCount={reviewCount} />

        {/*
          Replaces a `Card` that rendered "4.2 out of 5 · 12 reviews" as a
          sentence — the shape settings.tsx's own docblock calls out as the one
          that "read as plain beside the redesigned Profile". ScoreBar owns its
          own read, which is why this page no longer runs a fetchRatingSummary
          effect of its own.
        */}
        <ScoreBar restroomId={restroom.id} />

        {restroom.locationNote ? (
          <ActionGroup>
            {/*
              No `onPress`, so ActionRow draws no chevron — an informational row
              rather than a destination. Directions were a bare uppercase eyebrow
              before, which is the one piece of typography on the page that
              belonged to no system.
            */}
            <ActionRow icon="map-pin" label="How to get there" hint={restroom.locationNote} />
          </ActionGroup>
        ) : null}

        <AmenityGrid amenities={restroom.amenities} />

        {/*
          The hero already showed the first one, so this is the remainder. A
          strip of one photo that is also the 260pt image directly above it
          reads as a bug.
        */}
        {restroom.photoIds.length > 1 ? (
          <PhotoStrip photoIds={restroom.photoIds.slice(1)} />
        ) : null}

        {/*
          Confirm and report live here and only here now. The map sheet carries
          the verified STATE as a chip, but voting means you walked there and
          checked, which is not a thing to do from a preview.
        */}
        <TrustRow restroom={restroom} />

        <View className="flex-row gap-3">
          <Button
            className="flex-1"
            onPress={() => requestWrite({ href: `/review/${restroom.id}`, reason: 'review' })}
          >
            <Button.Label>Write a review</Button.Label>
          </Button>
          <LikeButton
            restroomId={restroom.id}
            uid={uid}
            canWrite={canWrite}
            href={`/restroom/${restroom.id}`}
          />
        </View>

        {/*
          Last, below everything constructive. Renders nothing unless the viewer
          is the author AND nobody else has engaged — see its docblock.
        */}
        <DeleteRestroomRow restroom={restroom} />
      </View>
    </View>
  );
}
