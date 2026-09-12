import { Button } from '@/components/ui/button';
import { GoogleMark } from '@/components/common/google-mark';
import { View } from '@/components/ui/view';

export type GoogleButtonProps = {
  onPress: () => void;
  isDisabled?: boolean;
  label?: string;
  testID?: string;
};

/**
 * `variant="outline"` rather than a filled button: the primary CTA above it owns
 * the accent, and two solid buttons stacked would compete for the same decision.
 */
export function GoogleButton({
  onPress,
  isDisabled,
  label = 'Continue with Google',
  testID,
}: GoogleButtonProps) {
  return (
    <Button
      variant="outline"
      size="lg"
      className="rounded-full"
      onPress={onPress}
      isDisabled={isDisabled}
      testID={testID}
    >
      <View className="pr-1">
        <GoogleMark />
      </View>
      <Button.Label>{label}</Button.Label>
    </Button>
  );
}
