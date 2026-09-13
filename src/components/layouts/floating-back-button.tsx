import { BackButton } from '@/components/layouts/back-button';
import { View } from '@/components/ui/view';

export type FloatingBackButtonProps = {
  onPress: () => void;
  /** Distance from the top of the WINDOW, so callers pass a clearance, not a gap. */
  top: number;
  testID?: string;
};

/**
 * A back chevron on an opaque disc, for screens whose top is not a surface —
 * map tiles under the pin placer, a photograph under the restroom hero.
 *
 * ## Why the disc, rather than a tinted chevron
 *
 * A bare glyph over arbitrary content has no contrast that can be verified. Map
 * tiles and user photographs are both "arbitrary": a white chevron vanishes on
 * a bright tiled roof and a dark one vanishes on asphalt, and there is no token
 * that survives both. The disc puts a known background behind the glyph, so
 * `foreground` on `background/95` is the same measured pair it is everywhere
 * else in the app. `map-status.tsx` reached the same conclusion for its banners
 * and rejected `GlassSurface` for the same reason.
 *
 * ⚠️ **`edgeAligned={false}` is load-bearing, and getting it wrong looks like a
 * border-radius bug.** `BackButton` carries a `-ml-3` to pull its glyph out to a
 * screen's content edge. There is no content edge here, so the margin instead
 * drags the 44pt box left of the disc's own left edge — the chevron sits
 * off-centre and the parent measures 32pt wide, so `rounded-full` paints an
 * ellipse.
 *
 * The disc is 48 rather than 44 so it matches the other floating controls it
 * sits beside (the locate button on the pin placer) instead of being 4pt
 * smaller than its neighbour. The 44pt target inside it is unaffected.
 */
export function FloatingBackButton({ onPress, top, testID }: FloatingBackButtonProps) {
  return (
    <View className="absolute left-4" style={{ top }} testID={testID}>
      <View className="h-12 w-12 items-center justify-center rounded-full bg-background/95 shadow-md">
        <BackButton onPress={onPress} color="foreground" edgeAligned={false} />
      </View>
    </View>
  );
}
