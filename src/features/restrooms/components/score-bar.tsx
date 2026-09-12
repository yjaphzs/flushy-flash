import { useEffect, useState } from 'react';

import { Gradient } from '@/components/common/gradient';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { fetchRatingSummary } from '@/features/restrooms/api';

const TRACK = 10;
const KNOB = 20;

/**
 * Average OVERALL rating, as a value on a poor→great track.
 *
 * ⚠️ **This used to be docblocked as cleanliness, with a Dirty/Acceptable/Clean
 * axis, and the label was simply wrong.** `fetchRatingSummary` averages
 * `rating`, never `cleanliness` — so the component has always shown the overall
 * score under a cleanliness heading, contradicting its own "AVERAGE SCORE …
 * out of 5" title two lines below. The data was right and the words were not.
 *
 * It still reads `getAggregateFromServer` per open rather than the document's
 * `ratingSum` / `ratingCount`. That is now a round trip it could skip — the
 * `onReviewWritten` Function maintains those fields, and the map pin reads them
 * straight from `campus-store`. Left alone deliberately: the aggregate query is
 * authoritative for a restroom whose reviews predate the trigger, where the
 * document still says 0. Switching over is safe only once every restroom has
 * been recomputed at least once.
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
          overflow-hidden. The colours are the poor→great ramp and are NOT brand
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
          Poor
        </Text>
        <Text type="body-xs" color="muted">
          OK
        </Text>
        <Text type="body-xs" color="muted">
          Great
        </Text>
      </View>
    </View>
  );
}
