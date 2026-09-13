import { Field } from '@/components/forms/field';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { View } from '@/components/ui/view';
import { filterCount, type RestroomFilters } from '@/features/restrooms/filters';

export type MapSearchBarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  filters: RestroomFilters;
  onOpenFilters: () => void;
  /** Fired on the keyboard's search key — moves the camera to the first match. */
  onSubmit: () => void;
};

/** Matches the other floating discs on a map — the back and locate buttons. */
const DISC = 48;

/**
 * The row across the top of the map: filter on the left, search filling the rest.
 *
 * ⚠️ **Opaque, never glass.** `map-status.tsx` and `pick-location.tsx` both
 * reached this independently and wrote it down: heroui's translucent tones read
 * as a smear over roads and buildings, and contrast over arbitrary map tiles
 * cannot be verified at all. Anything that has to be READ on top of tiles gets
 * `bg-background` and a shadow.
 *
 * ⚠️ **This row now owns the top band, which the status banners used to have to
 * themselves.** They still appear — they stack underneath it in the same
 * absolute column on the map screen — so anything added here pushes them
 * further down the map.
 */
export function MapSearchBar({
  query,
  onQueryChange,
  filters,
  onOpenFilters,
  onSubmit,
}: MapSearchBarProps) {
  const active = filterCount(filters);

  return (
    <View className="flex-row items-center gap-2">
      <Pressable
        onPress={onOpenFilters}
        accessibilityRole="button"
        // The dot alone says nothing to a screen reader, so the count is spoken.
        accessibilityLabel={active > 0 ? `Filters, ${active} active` : 'Filters'}
        className="items-center justify-center rounded-full bg-accent shadow-md"
        style={{ width: DISC, height: DISC }}
        testID="map-filter-button"
      >
        {/*
          `on-accent` is the token for a glyph this app paints on an accent fill
          it drew itself. White measures 4.65:1 on the darkened accent (§14), so
          a label would be fine here too — it is a glyph only because the sheet
          it opens is what explains it.
        */}
        <Icon name="filter" size={20} color="on-accent" />
        {/*
          A dot, not a number. A legible numeral needs a ~16pt badge on a 48pt
          disc, which crowds the glyph it is meant to annotate — and the count
          is already stated twice: the accessibilityLabel above says it, and the
          status line below the row says what it produced. It was briefly a
          `text-[7px]` numeral, which rendered as an illegible smudge AND relied
          on an arbitrary-value class uniwind can fail to compile with no error.
        */}
        {/*
          White, not accent: the button is now an accent fill, so an accent dot
          on it would be invisible. Same token as the glyph above.
        */}
        {active > 0 ? (
          <View className="absolute right-3 top-3 size-2.5 rounded-full bg-on-accent" />
        ) : null}
      </Pressable>

      {/*
        `Field.Input` rather than a bespoke control: it already owns the leading
        glyph slot, the tappable trailing slot, and the two non-obvious chrome
        props (`variant="primary"` because Input silently downgrades inside a
        Surface, and a null background because heroui's glass layer is opaque on
        Android).
      */}
      {/*
        ⚠️ No `overflow-hidden`. It clipped the focus ring: Android draws focus
        as a `border-accent` on the input at `--field-radius` (12px), and a
        pill-shaped parent with overflow hidden cut its corners off, which read
        as a glow breaking at the ends. The input carries `rounded-full` below
        so the ring follows the pill instead of fighting it.
      */}
      <View className="flex-1 rounded-full bg-background shadow-md">
        <Field.Input
          value={query}
          onChangeText={onQueryChange}
          placeholder="Search restrooms"
          leading="search"
          /*
            Transparent, not white: `--color-field` is a 14%-alpha wash, so over
            the white pill above it renders as the grey this used to be. Letting
            the pill show through is what makes it white. `rounded-full` matches
            the parent so the focus ring is a pill too.
          */
          className="rounded-full bg-transparent"
          returnKeyType="search"
          onSubmitEditing={onSubmit}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search restrooms"
          testID="map-search-input"
          trailing={
            query === '' ? undefined : (
              <Pressable
                onPress={() => onQueryChange('')}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                hitSlop={13}
                testID="map-search-clear"
              >
                <Icon name="x" size={18} color="muted" />
              </Pressable>
            )
          }
        />
      </View>
    </View>
  );
}
