import { Children, Fragment, isValidElement } from 'react';

import { Icon, type IconName } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';

export type ActionRowTone = 'accent' | 'danger';

export type ActionRowProps = {
  icon: IconName;
  label: string;
  /**
   * Sub-label under the title. Omit where there is nothing true to say.
   *
   * ReactNode rather than string so a tinted run — an email address, the campus
   * domain — can sit inside it, the same reason `Card.Description` and
   * `join-benefits`' `detail` take one.
   */
  hint?: React.ReactNode;
  tone?: ActionRowTone;
  /** Terminal actions get no chevron: nothing comes after signing out. */
  terminal?: boolean;
  /**
   * Omit for an INFORMATIONAL row — no press target, no chevron, and nothing
   * announced as a button. Settings needs several of those ("Student
   * verification" is a state, not a destination), and a row that looks tappable
   * and is not is worse than one that plainly is not.
   */
  onPress?: () => void;
};

/**
 * One row of an action list: a tinted icon tile, a label, and a chevron.
 *
 * Promoted out of `features/profile/` when Settings needed the same vocabulary.
 * It is the app's answer to "a list of things you can do", and it is in
 * `common/` rather than `ui/` because it composes several primitives and
 * encodes this app's tinting rules rather than wrapping one vendor component.
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
export function ActionRow({
  icon,
  label,
  hint,
  tone = 'accent',
  terminal = false,
  onPress,
}: ActionRowProps) {
  const body = (
    <>
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

      {onPress && !terminal ? <Icon name="chevron-right" size={18} color="muted" /> : null}
    </>
  );

  if (!onPress) {
    return <View className="flex-row items-center gap-3 px-4 py-3">{body}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="flex-row items-center gap-3 px-4 py-3"
    >
      {body}
    </Pressable>
  );
}

/**
 * Hairline between rows, inset past the icon tiles so it reads as a list.
 *
 * The inset is a style rather than `ml-[68px]`: it is derived from ActionRow's
 * px-4 + 44pt tile + gap-3, which is arithmetic, not a spacing step — and an
 * arbitrary-value class that uniwind fails to compile produces no error, just a
 * divider that runs the full width.
 */
function Divider() {
  return <View className="h-px bg-border" style={{ marginLeft: 16 + 44 + 12 }} />;
}

/**
 * A group of rows in one rounded card, separated for you.
 *
 * The separators are inserted here rather than interleaved by the caller. That
 * is not only tidier: a caller writing `<Row/><Divider/><Row/>` by hand has to
 * remember to drop the divider when a row is conditional, and a conditional row
 * is exactly what Settings has. Filtering falsy children first means an absent
 * row leaves no stray hairline behind it.
 */
export function ActionGroup({ children }: { children: React.ReactNode }) {
  const rows = Children.toArray(children).filter(isValidElement);

  return (
    <View
      className="overflow-hidden rounded-3xl border border-border bg-surface"
      style={{ borderCurve: 'continuous' }}
    >
      {rows.map((row, i) => (
        <Fragment key={i}>
          {i > 0 ? <Divider /> : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}
