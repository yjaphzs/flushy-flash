import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { MIN_PASSWORD_LENGTH, STRENGTH_LABEL, type PasswordScore } from '@/features/auth/password';

const BAR_COLOR = { weak: 'bg-danger', fair: 'bg-warning', strong: 'bg-success' } as const;

/**
 * Three bars plus a requirement line.
 *
 * The text and the check icon carry the same information as the colour, on
 * purpose — strength encoded only as red/amber/green is invisible to a
 * red-green colourblind user, and this is the one control on the form that
 * would otherwise rely on hue alone.
 */
export function PasswordStrength({ score }: { score: PasswordScore }) {
  return (
    <View className="gap-2 pt-1">
      <View className="flex-row gap-1.5" accessibilityRole="progressbar">
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            className={`h-1 flex-1 rounded-full ${i < score.filled ? BAR_COLOR[score.strength] : 'bg-default'}`}
            style={{ borderCurve: 'continuous' }}
          />
        ))}
      </View>
      <View className="flex-row items-center gap-1.5">
        <Icon
          name={score.meetsMinimum ? 'check' : 'x'}
          size={14}
          color={score.meetsMinimum ? 'success' : 'muted'}
        />
        <Text type="body-xs" color="muted">
          {score.meetsMinimum
            ? `${STRENGTH_LABEL[score.strength]} password`
            : `At least ${MIN_PASSWORD_LENGTH} characters`}
        </Text>
      </View>
    </View>
  );
}
