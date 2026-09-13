import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { hasFilters, type RestroomFilters } from '@/features/restrooms/filters';

export type MapFilterStatusProps = {
  query: string;
  filters: RestroomFilters;
  /** How many restrooms survive the query and the filters. */
  matches: number;
  onClear: () => void;
};

/**
 * What the search and filters did, said out loud.
 *
 * ⚠️ **This exists because a filtered map and a broken map look identical.**
 * `CampusStatus` already makes that argument for the empty campus — "a working
 * map with no pins is indistinguishable from a broken one" — and a query that
 * matches nothing reproduces it exactly, except the user now has a reason to
 * suspect the app rather than the data.
 *
 * It is also the only place the count appears. The pins themselves cannot say
 * "3 matches" when all three are off-screen, because `visiblePins` culls to the
 * viewport before anything is drawn.
 *
 * Renders nothing when nothing is asked for, so the map is unobstructed in the
 * common case.
 */
export function MapFilterStatus({ query, filters, matches, onClear }: MapFilterStatusProps) {
  const asked = query.trim() !== '' || hasFilters(filters);
  if (!asked) return null;

  const none = matches === 0;

  return (
    <View
      className="flex-row items-center justify-between gap-3 rounded-2xl bg-background px-4 py-2.5 shadow-md"
      style={{ borderCurve: 'continuous' }}
      testID="map-filter-status"
    >
      <Text type="body-sm" color={none ? 'default' : 'muted'} className="flex-1">
        {none
          ? 'Nothing matches that.'
          : `${matches} ${matches === 1 ? 'restroom' : 'restrooms'}`}
      </Text>
      <Button variant="secondary" size="sm" className="rounded-full" onPress={onClear}>
        <Button.Label>Clear</Button.Label>
      </Button>
    </View>
  );
}
