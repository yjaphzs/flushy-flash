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
import { useBuildings } from '@/stores/campus-store';
import type { LatLng } from '@/lib/campus';
import { distanceM } from '@/lib/geo';
import type { Restroom } from '@/lib/types';

export type RestroomSheetProps = {
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
 * is a worse read than a page. Both render the same components from
 * `restroom-detail.tsx`, so the two surfaces cannot drift.
 */
export function RestroomSheet({ restroom, origin, onClose }: RestroomSheetProps) {
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

  if (!restroom) return null;

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
    <BottomSheet isOpen onOpenChange={(open) => !open && onClose()}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content>
          <View className="gap-5 px-5 pb-8 pt-2">
            <View className="gap-2">
              <Text type="h3">{title}</Text>
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

            <Button
              variant="secondary"
              size="lg"
              className="rounded-full"
              onPress={() => {
                onClose();
                router.push(`/restroom/${restroom.id}`);
              }}
            >
              <Button.Label>See reviews</Button.Label>
            </Button>
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
