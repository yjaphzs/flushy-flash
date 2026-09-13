import { Icon, type IconColor, type IconName } from '@/components/ui/icon';
import { View } from '@/components/ui/view';

export type CalloutTone = 'danger' | 'success' | 'info';

type ToneSpec = { icon: IconName; iconColor: IconColor; className: string };

const TONES: Record<CalloutTone, ToneSpec> = {
  danger: { icon: 'alert-circle', iconColor: 'danger', className: 'bg-danger-soft' },
  success: { icon: 'check', iconColor: 'success', className: 'bg-success-soft' },
  info: { icon: 'alert-circle', iconColor: 'accent', className: 'bg-accent-soft' },
};

export type CalloutProps = {
  tone: CalloutTone;
  /** Never a bare string — wrap copy in <Text>, per the compound-component rule. */
  children: Exclude<React.ReactNode, string | number>;
  /**
   * Overrides the tone's glyph, keeping its colour.
   *
   * For states the tone cannot express on its own: offline is `info`-toned but
   * an alert circle says "something is wrong here", where `wifi-off` says what
   * is actually true. Tone still owns the colour, so this cannot be used to
   * paint a danger message in a calm one.
   */
  icon?: IconName;
  className?: string;
  testID?: string;
};

/**
 * A form-level message: the thing that went wrong with the submit, as opposed to
 * what is wrong with one field.
 *
 * Keeping this separate from `Field.Error` is the point. Rendering a network or
 * credential failure inside the password field — as the auth screens used to —
 * attributes it to the wrong control and leaves the field itself un-highlighted.
 *
 * The live region matters: the message appears without focus moving, so without
 * it a screen-reader user submits the form and hears nothing at all.
 */
export function Callout({ tone, children, icon, className, testID }: CalloutProps) {
  const spec = TONES[tone];

  return (
    <View
      className={`flex-row items-start gap-2.5 rounded-2xl px-3.5 py-3 ${spec.className} ${className ?? ''}`}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      testID={testID}
    >
      <View className="pt-0.5">
        <Icon name={icon ?? spec.icon} size={18} color={spec.iconColor} />
      </View>
      <View className="flex-1">{children}</View>
    </View>
  );
}
