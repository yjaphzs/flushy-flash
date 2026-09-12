import { View } from '@/components/view';
import { ScrollView } from '@/components/scroll-view';

/** Full-bleed screen container — use for the map, which is not a ScrollView. */
export function Screen({ children, className }: { children: React.ReactNode; className?: string }) {
  return <View className={className ?? 'flex-1 bg-background'}>{children}</View>;
}

/**
 * Scrolling screen. Safe-area insets come from the platform via
 * contentInsetAdjustmentBehavior, not manual padding.
 */
export function ScreenScrollView({
  children,
  contentContainerClassName,
}: {
  children: React.ReactNode;
  contentContainerClassName?: string;
}) {
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName={contentContainerClassName ?? 'px-4 py-3 gap-3'}
    >
      {children}
    </ScrollView>
  );
}
