import { Icon, type IconName } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';

export type ProfileRowTone = 'accent' | 'danger';

export type ProfileRowProps = {
  icon: IconName;
  label: string;
  /** Sub-label under the row's title. Omit where there is nothing true to say. */
  hint?: string;
  tone?: ProfileRowTone;
  /** Terminal actions get no chevron: nothing comes after signing out. */
  terminal?: boolean;
  onPress: () => void;
};

/**
 * One row of the account list: a tinted icon tile, a label, and a chevron.
 *
 * ⚠️ **The reference gives every tile its own pastel and this cannot.**
 * `IconColor` is a closed union of theme tokens, and inventing five hues would
 * contradict §14's single-hue discipline and its "never set `--color-*`" rule.
 * So the tiles use the two semantic tints that already exist — accent-soft for
 * everything that goes somewhere, danger-soft for the one thing that ends a
 * session. That is variety carrying meaning rather than variety for its own
 * sake, which is the better version of the idea anyway.
 *
 * `--color-accent-soft` is a `color-mix(…, transparent)`, and that branch is
 * the ONE uniwind preserves alpha through (§14), so the tint really is 15%
 * rather than a flat opaque swatch.
 */
export function ProfileRow({
  icon,
  label,
  hint,
  tone = 'accent',
  terminal = false,
  onPress,
}: ProfileRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="flex-row items-center gap-3 px-4 py-3"
    >
      <View
        className={
          tone === 'danger'
            ? 'h-11 w-11 items-center justify-center rounded-2xl bg-danger-soft'
            : 'h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft'
        }
        style={{ borderCurve: 'continuous' }}
      >
        <Icon name={icon} size={20} color={tone} />
      </View>

      <View className="flex-1 gap-0.5">
        <Text type="body" weight="medium">
          {label}
        </Text>
        {hint ? (
          <Text type="body-xs" color="muted">
            {hint}
          </Text>
        ) : null}
      </View>

      {terminal ? null : <Icon name="chevron-right" size={18} color="muted" />}
    </Pressable>
  );
}
