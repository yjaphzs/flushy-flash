import { Chip } from '@/components/ui/chip';
import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { formatDistance } from '@/lib/geo';
import type { Amenities, GenderedAs, Restroom, RestroomStatus } from '@/lib/types';

/**
 * The presentational pieces a restroom renders as, shared by the map sheet and
 * the full `/restroom/[id]` page.
 *
 * Shared deliberately: two surfaces showing the same entity is exactly how they
 * drift, and "the sheet says Clean but the page says Out of order" is the kind
 * of bug nobody files.
 *
 * Everything here reads from data that exists. The reference design also carried
 * a "Trust 63%" band and drive/walk times — both dropped on purpose: there is no
 * source for either, and a heuristic rendered as a percentage looks like a
 * measurement.
 */

const STATUS: Record<RestroomStatus, { label: string; color: 'success' | 'warning' | 'danger' }> = {
  ok: { label: 'Open', color: 'success' },
  out_of_order: { label: 'Out of order', color: 'danger' },
  closed: { label: 'Closed', color: 'warning' },
};

const ACCESS: Record<GenderedAs, string> = {
  male: 'Men',
  female: 'Women',
  unisex: 'Anyone',
  accessible_only: 'Accessible only',
};

/** Only the amenities with a glyph that reads at 18px. */
const AMENITIES: { key: keyof Omit<Amenities, 'genderedAs'>; label: string; icon: IconName }[] = [
  { key: 'isFree', label: 'Free', icon: 'badge-check' },
  { key: 'hasWater', label: 'Water', icon: 'droplet' },
  { key: 'hasTissue', label: 'Tissue', icon: 'scroll-text' },
  { key: 'hasBidet', label: 'Bidet', icon: 'shower-head' },
  { key: 'accessible', label: 'Accessible', icon: 'accessibility' },
  { key: 'babyChanging', label: 'Baby changing', icon: 'baby' },
];

export function StatusChip({ status }: { status: RestroomStatus }) {
  const { label, color } = STATUS[status];
  return (
    <Chip color={color} variant="soft">
      <Chip.Label>{label}</Chip.Label>
    </Chip>
  );
}

/** One of the stat tiles across the top. */
export function StatTile({
  icon,
  value,
  caption,
}: {
  icon: IconName;
  value: string;
  caption: string;
}) {
  return (
    <View
      className="flex-1 items-center gap-1 rounded-2xl bg-surface-secondary px-2 py-3"
      style={{ borderCurve: 'continuous' }}
    >
      <Icon name={icon} size={16} color="accent" />
      <Text type="body" weight="bold" align="center">
        {value}
      </Text>
      <Text type="body-xs" color="muted" align="center">
        {caption}
      </Text>
    </View>
  );
}

export function StatRow({
  distanceM,
  updatedAt,
  reviewCount,
}: {
  distanceM: number | null;
  updatedAt: Restroom['updatedAt'];
  reviewCount: number | null;
}) {
  return (
    <View className="flex-row gap-2">
      <StatTile
        icon="map-pin"
        value={distanceM === null ? '—' : formatDistance(distanceM)}
        caption="away"
      />
      <StatTile icon="clock" value={relativeTime(updatedAt)} caption="updated" />
      <StatTile
        icon="star"
        value={reviewCount === null ? '—' : String(reviewCount)}
        caption={reviewCount === 1 ? 'review' : 'reviews'}
      />
    </View>
  );
}

/**
 * Amenities as a two-column grid of present/absent chips.
 *
 * A null amenity means UNKNOWN, not absent — the submitter did not say. It is
 * rendered dimmed with no mark rather than as a cross, because claiming a
 * restroom has no water when nobody checked is worse than saying nothing.
 */
export function AmenityGrid({ amenities }: { amenities: Amenities }) {
  return (
    <View className="gap-2">
      <Text type="body-xs" weight="semibold" color="muted">
        AMENITIES
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {AMENITIES.map(({ key, label, icon }) => {
          const present = amenities[key] === true;
          const unknown = amenities[key] === null;
          return (
            <View
              key={key}
              className={`flex-row items-center gap-2 rounded-xl px-3 py-2.5 ${
                present ? 'bg-accent-soft' : 'bg-surface-secondary'
              }`}
              style={{ borderCurve: 'continuous', width: '48%' }}
            >
              <Icon name={icon} size={17} color={present ? 'accent' : 'muted'} />
              <Text type="body-sm" className="flex-1" color={present ? 'default' : 'muted'}>
                {label}
              </Text>
              {unknown ? null : (
                <Icon name={present ? 'check' : 'x'} size={14} color={present ? 'accent' : 'muted'} />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function AccessChip({ genderedAs }: { genderedAs: GenderedAs | null }) {
  if (!genderedAs) return null;
  return (
    <Chip variant="secondary">
      <Chip.Label>{ACCESS[genderedAs]}</Chip.Label>
    </Chip>
  );
}

/**
 * "22 min ago", from a Firestore Timestamp.
 *
 * Tolerates a null: `serverTimestamp()` resolves to null in the local snapshot
 * that fires before the write reaches the server, so a just-added restroom would
 * otherwise crash the sheet that opens on top of it.
 */
export function relativeTime(at: Restroom['updatedAt'] | null): string {
  const date = at?.toDate?.();
  if (!date) return 'just now';

  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days}d ago` : 'a while ago';
}
