import { LegendList } from '@legendapp/list/react-native';

/**
 * The ONLY list in the app. ScrollView + .map() is banned even for short lists —
 * virtualisation is what keeps the feed and per-building restroom lists smooth.
 *
 * Swapping to FlashList later is a change to this file alone, which is the whole
 * point of routing every list through the design system.
 */
export const List = LegendList;
export type ListProps<T> = React.ComponentProps<typeof LegendList<T>>;
