import { Chip } from '@/components/ui/chip';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { MAP_THEMES, type MapTheme } from '@/lib/map-theme-storage';
import { useMapTheme, useMapThemeStore } from '@/stores/map-theme-store';

/**
 * The map's light/dark choice, in Settings.
 *
 * ⚠️ **Chips rather than an `ActionRow` + dialog**, which is the other house
 * pattern for a setting (`delete-account-row.tsx` carries its own). Three
 * mutually exclusive options all fit on one line, so a dialog would add a tap
 * and hide the current answer behind it — and the whole complaint this
 * addresses was about the map being hard to read, which is not improved by
 * burying the fix. `AccessChips` is the shape being followed.
 *
 * ⚠️ **Unlike the amenity chips, tapping the selected one does NOT clear it.**
 * There is no "unknown" here: the map draws with something, always, and
 * `system` is already the "I have no preference" answer.
 *
 * Deliberately says "Map theme" and not "Theme". The app's own chrome still
 * follows the OS, so somebody choosing a dark map under a light app has made a
 * choice rather than found a bug — see `map-theme-store.ts`.
 */

const LABELS: Record<MapTheme, string> = {
  system: 'Follow system',
  light: 'Light',
  dark: 'Dark',
};

export function MapThemeRow() {
  const theme = useMapTheme();
  const setTheme = useMapThemeStore((s) => s.setTheme);

  return (
    <View className="gap-2">
      <Text type="body" weight="semibold">
        Map theme
      </Text>
      <Text type="body-sm" color="muted">
        The app follows your phone either way — this is just the map.
      </Text>

      <View className="flex-row flex-wrap gap-2 pt-1">
        {MAP_THEMES.map((option) => (
          <Chip
            key={option}
            variant={theme === option ? 'primary' : 'secondary'}
            onPress={() => setTheme(option)}
            // `radio`, not `button`: these are one choice with three answers,
            // and a screen reader should say which one is taken.
            accessibilityRole="radio"
            accessibilityState={{ selected: theme === option }}
            testID={`map-theme-${option}`}
          >
            <Chip.Label>{LABELS[option]}</Chip.Label>
          </Chip>
        ))}
      </View>
    </View>
  );
}
