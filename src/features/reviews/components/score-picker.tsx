import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';

const MAX = 5;

export type ScorePickerProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
};

/**
 * The interactive 1–5 control, used twice in the composer.
 *
 * Five fixed items, so a plain `.map()` in a `View` is correct — the
 * LegendList rule targets data lists, and this is chrome (`join-benefits.tsx`
 * documents the same carve-out).
 *
 * ⚠️ **State is never signalled by fill alone** (AGENTS.md §3). Each step
 * carries its own `accessibilityLabel` and `selected` state, and the chosen
 * value is rendered as text beside the label — so the control is usable by
 * someone who cannot distinguish a filled star from an empty one.
 *
 * Tapping the current value does NOT clear it, unlike the amenity chips. A
 * rating is required by the rules (`isValidScore` is 1–5, with no null), so
 * "unset" is not a state a saved review can be in.
 */
export function ScorePicker({ label, value, onChange }: ScorePickerProps) {
  return (
    <View className="gap-2">
      <View className="flex-row items-baseline justify-between">
        <Text type="body" weight="semibold">
          {label}
        </Text>
        <Text type="body-sm" color="muted">
          {value > 0 ? `${value} of ${MAX}` : 'Not rated'}
        </Text>
      </View>

      <View className="flex-row gap-2">
        {Array.from({ length: MAX }, (_, i) => {
          const step = i + 1;
          const on = step <= value;
          return (
            <Pressable
              key={step}
              onPress={() => onChange(step)}
              accessibilityRole="button"
              accessibilityLabel={`${label}: ${step} out of ${MAX}`}
              accessibilityState={{ selected: on }}
              hitSlop={8}
              className="h-11 w-11 items-center justify-center"
            >
              <Icon name="star" size={26} filled={on} color={on ? 'accent' : 'field-placeholder'} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
