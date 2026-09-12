import { Separator as HeroSeparator } from 'heroui-native';

import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';

export type SeparatorProps = Pick<
  React.ComponentProps<typeof HeroSeparator>,
  'orientation' | 'variant' | 'thickness' | 'className' | 'testID'
>;

export const Separator = HeroSeparator;

/**
 * A rule with a caption through it — "Or continue with", or a group heading on a
 * long form. The label is a string here rather than a node because this
 * component *is* the text node; there is nothing else it could be.
 */
export function LabeledSeparator({ label, className }: { label: string; className?: string }) {
  return (
    <View className={className ?? 'flex-row items-center gap-3'}>
      <Separator className="flex-1" />
      <Text type="body-sm" color="muted">
        {label}
      </Text>
      <Separator className="flex-1" />
    </View>
  );
}
