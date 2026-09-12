import { useEffect, useState } from 'react';

import { Gradient } from '@/components/common/gradient';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { fetchRatingSummary } from '@/features/restrooms/api';

const TRACK = 10;
const KNOB = 20;

/**
 * Average cleanliness, as a value on a dirty→clean track.
 *
 * The rating is computed server-side per open (`getAggregateFromServer`) rather
 * than denormalised onto the document, which is what keeps `ratingSum` /
 * `ratingCount` non-client-writable — a user cannot inflate their favourite.
 *
 * Renders nothing at all until there is at least one review. A 0.0 on an empty
 * scale reads as "this restroom scored zero" rather than "nobody has said", and
 * the review count beside it is not enough to undo that impression.
 */
export function ScoreBar({ restroomId }: { restroomId: string }) {
  const [summary, setSummary] = useState<{ average: number | null; count: number } | null>(null);

  useEffect(() => {
    let live = true;
    fetchRatingSummary(restroomId)
      .then((s) => live && setSummary(s))
      .catch(() => live && setSummary(null));
    return () => {
      live = false;
    };
  }, [restroomId]);

  if (!summary || summary.count === 0 || summary.average === null) return null;

  const average = summary.average;
  // 1–5 onto 0–1, clamped: the rules validate the range but a future aggregate
  // over mixed data should not push the knob off the end of the track.
  const fraction = Math.min(1, Math.max(0, (average - 1) / 4));

  return (
    <View className="gap-3">
      <Text type="body-xs" weight="semibold" color="muted">
        AVERAGE SCORE
      </Text>

      <View className="flex-row items-baseline gap-2">
        <Text type="h2" className="text-accent">
          {average.toFixed(1)}
        </Text>
        <Text type="body-sm" color="muted">
          {summary.count} {summary.count === 1 ? 'review' : 'reviews'} · out of 5
        </Text>
      </View>

      <View className="justify-center" style={{ height: KNOB }}>
        {/*
          Gradient fills its parent (absolute inset-0) and takes no style, so the
          track's shape lives on this wrapper and the clip comes from
          overflow-hidden. The colours are the dirty→clean ramp and are NOT brand
          tokens: red and amber have no equivalent in the palette, and the green
          end is the accent's hex so the scale lands on the brand rather than
          near it.
        */}
        <View
          className="overflow-hidden"
          style={{ height: TRACK, borderRadius: TRACK / 2, borderCurve: 'continuous' }}
        >
          <Gradient
            colors={['#D64545', '#E2A03F', '#00855E']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
          />
        </View>
        {/*
          Positioned as a percentage rather than from a measured width, so it
          needs no onLayout and cannot land wrong on the first frame. The
          translate keeps the knob's centre on the value at both ends instead of
          overhanging the track.
        */}
        <View
          className="absolute rounded-full border-2 border-accent bg-background"
          style={{
            left: `${fraction * 100}%`,
            width: KNOB,
            height: KNOB,
            marginLeft: -KNOB / 2,
            borderCurve: 'continuous',
          }}
        />
      </View>

      <View className="flex-row justify-between">
        <Text type="body-xs" color="muted">
          Dirty
        </Text>
        <Text type="body-xs" color="muted">
          Acceptable
        </Text>
        <Text type="body-xs" color="muted">
          Clean
        </Text>
      </View>
    </View>
  );
}
