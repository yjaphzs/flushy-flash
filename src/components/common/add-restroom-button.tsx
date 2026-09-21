import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';

/**
 * "Add a restroom", as a compact labelled pill rather than the raised centre FAB
 * it used to be.
 *
 * The centre slot went to "find the nearest restroom" when it became a
 * `sparkles` button, and this was the only GLOBAL entry point to /submit — the
 * other two are CTAs buried inside building/[id].tsx. Demoting it to a corner
 * button is deliberate; deleting it would have quietly removed the app's
 * contribution path.
 *
 * Accent-filled, deliberately — this comment used to argue the opposite.
 *
 * The old reasoning was that `secondary` picks up the floating bar's glass and
 * "the accent stays reserved for the one primary action on screen". Over map
 * tiles that translucent material simply disappears; the button was a faint ring
 * nobody could find. And the premise was wrong anyway: on a map with ZERO pins,
 * adding one IS the primary action. The tab bar's centre button is the only
 * other accent element and it is chrome, not a peer competing for the same
 * decision.
 *
 * Icon-only, so `accessibilityLabel` is REQUIRED rather than nice to have: the
 * Button wrapper derives nothing from `Button.Label` and warns about nothing, so
 * dropping the visible text is exactly the moment the control would otherwise go
 * unlabelled for a screen reader.
 *
 * `size="md"`, not `sm`. With `isIconOnly` heroui applies `aspect-ratio: 1`, so
 * the button is a square of the size's height: sm is 40pt, which is UNDER the
 * 44pt minimum touch target, while md is 48pt. The label used to make `sm` wide
 * enough to hide that.
 *
 * It owns no positioning — the map screen stacks it with the status callouts in
 * a single bottom-anchored column, because two independently-positioned
 * overlays over one map is how things end up on top of each other.
 *
 * It deliberately knows nothing about auth: `onPress` is handed in, and a guest
 * sees the button and meets the gate at the route. Hiding it would make the app
 * look broken to someone who is simply browsing.
 */
/**
 * The rendered square, in points.
 *
 * Not a style — it is the CONSEQUENCE of `size="md"` plus `isIconOnly`, which
 * heroui turns into `aspect-ratio: 1` on a 48pt-high button. Exported because
 * the map screen stacks the compass directly above this button and would
 * otherwise carry a bare 48 with nothing linking it to the size that produced
 * it. If the size prop changes, this must change with it.
 */
export const ADD_BUTTON_SIZE = 48;

export function AddRestroomButton({ onPress }: { onPress: () => void }) {
  return (
    <Button
      size="md"
      isIconOnly
      className="rounded-full shadow-md"
      accessibilityLabel="Add a restroom"
      onPress={onPress}
      testID="add-restroom"
    >
      <Icon name="plus" size={20} color="on-accent" />
    </Button>
  );
}
