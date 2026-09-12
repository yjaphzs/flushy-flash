import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';

const MAX = 5;

/**
 * A read-only 1–5 score.
 *
 * Distinct from `score-picker.tsx`, which is the interactive control. They look
 * similar and behave nothing alike, and merging them would mean a display
 * component carrying press handlers it must never fire.
 *
 * ⚠️ **The fill never carries the meaning alone** (AGENTS.md §3). The number is
 * rendered beside the glyphs and the row is labelled, so this reads correctly
 * to a screen reader and to anyone who cannot separate the two fill states.
 */
export function Stars({ value, label }: { value: number; label: string }) {
  const score = Math.max(0, Math.min(MAX, Math.round(value)));

  return (
    <View
      className="flex-row items-center gap-1"
      accessible
      accessibilityLabel={`${label}: ${score} out of ${MAX}`}
    >
      {/* Fixed chrome — five items — so a plain .map() in a View is correct
          here and the LegendList rule does not apply. */}
      {Array.from({ length: MAX }, (_, i) => (
        <Icon
          key={i}
          name="star"
          size={14}
          filled={i < score}
          color={i < score ? 'accent' : 'field-placeholder'}
        />
      ))}
      <Text type="body-xs" color="muted" className="ml-1">
        {label}
      </Text>
    </View>
  );
}
