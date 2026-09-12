import { Icon, type IconName } from '@/components/ui/icon';
import { Illustration, type IllustrationName } from '@/components/ui/illustration';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';

export type EmptyStateProps = {
  icon: IconName;
  /**
   * 3D artwork in place of the glyph. Additive rather than a replacement for
   * `icon`: it takes precedence when present, so the several callers that
   * legitimately want a small muted icon keep working unchanged.
   */
  illustration?: IllustrationName;
  title: string;
  description: string;
  /** Optional call to action, e.g. a button that opens the auth gate. */
  action?: React.ReactNode;
  testID?: string;
};

/**
 * The "there is nothing here" state, as a component rather than a copy-paste.
 *
 * Worth centralising because the app has several and they are easy to write
 * badly: an empty state that says "no reviews yet" when the real cause was a
 * failed read tells the user something false about the world. Callers pass the
 * copy that matches their actual cause.
 */
export function EmptyState({
  icon,
  illustration,
  title,
  description,
  action,
  testID,
}: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center gap-3 px-8 py-12" testID={testID}>
      {illustration ? (
        <Illustration name={illustration} />
      ) : (
        <Icon name={icon} size={32} color="muted" />
      )}
      <View className="items-center gap-1.5">
        <Text type="h4" align="center">
          {title}
        </Text>
        <Text type="body-sm" color="muted" align="center">
          {description}
        </Text>
      </View>
      {action ? <View className="w-full pt-2">{action}</View> : null}
    </View>
  );
}
