import { Chip } from '@/components/ui/chip';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import type { Amenities, GenderedAs } from '@/lib/types';

/**
 * The two chip groups the add and edit forms share.
 *
 * Extracted from `submit.tsx` when it hit the 200-line cap, and immediately
 * earning it: the edit screen renders the identical controls, and two
 * hand-rolled copies of a tri-state toggle is exactly how the two screens would
 * come to disagree about what "unknown" looks like.
 *
 * ⚠️ **A plain `.map()` in a `View`, not `@/components/common/list`.** AGENTS.md
 * §3 bans `ScrollView` + `.map()` for DATA lists; a fixed set of five toggles is
 * chrome, and virtualising it would cost more than it saves.
 */

const TOGGLES: { key: keyof Omit<Amenities, 'genderedAs'>; label: string }[] = [
  { key: 'isFree', label: 'Free' },
  { key: 'hasWater', label: 'Has water' },
  { key: 'hasTissue', label: 'Has tissue' },
  { key: 'hasBidet', label: 'Has bidet' },
  { key: 'accessible', label: 'Accessible' },
];

/** Who may use it. Was in the type from the start and never had a control. */
const ACCESS: { value: GenderedAs; label: string }[] = [
  { value: 'male', label: 'Men' },
  { value: 'female', label: 'Women' },
  { value: 'unisex', label: 'Anyone' },
  { value: 'accessible_only', label: 'Accessible only' },
];

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text type="body" weight="semibold">
        {title}
      </Text>
      <View className="flex-row flex-wrap gap-2">{children}</View>
    </View>
  );
}

export type AccessChipsProps = {
  value: GenderedAs | null;
  onChange: React.Dispatch<React.SetStateAction<GenderedAs | null>>;
};

export function AccessChips({ value, onChange }: AccessChipsProps) {
  return (
    <Group title="Who can use it?">
      {ACCESS.map(({ value: option, label }) => (
        <Chip
          key={option}
          variant={value === option ? 'primary' : 'secondary'}
          // Tapping the selected one clears it: "unknown" is a real answer and
          // the amenity toggles already work this way.
          onPress={() => onChange((prev) => (prev === option ? null : option))}
        >
          <Chip.Label>{label}</Chip.Label>
        </Chip>
      ))}
    </Group>
  );
}

export type AmenityChipsProps = {
  value: Amenities;
  onChange: React.Dispatch<React.SetStateAction<Amenities>>;
};

export function AmenityChips({ value, onChange }: AmenityChipsProps) {
  return (
    <Group title="Amenities">
      {TOGGLES.map(({ key, label }) => (
        <Chip
          key={key}
          variant={value[key] === true ? 'primary' : 'secondary'}
          onPress={() => onChange((prev) => ({ ...prev, [key]: prev[key] === true ? null : true }))}
        >
          <Chip.Label>{label}</Chip.Label>
        </Chip>
      ))}
    </Group>
  );
}
