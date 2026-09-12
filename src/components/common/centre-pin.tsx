import { Icon, type IconColor } from '@/components/ui/icon';
import { View } from '@/components/ui/view';

/**
 * How far a `map-pin` glyph's TIP sits above the bottom of its own icon box,
 * as a fraction of that box.
 *
 * ⚠️ Lucide's `map-pin` path bottoms out at y≈22 of a 24 viewBox, not at 24 —
 * it is a teardrop with a rounded point, not a glyph that fills its box. So
 * anything that centres the icon BOX aims the pin high by 1/12th of its size:
 * 4pt on the 48pt placer crosshair, and the same again on the 32pt preview.
 *
 * The maths: the path ends at (12.601, 21.799) and closes with an `a1 1 0 0 1
 * -1.202 0` arc, whose sagitta is 1 - √(1 - 0.601²) ≈ 0.201 — so the lowest
 * point is y ≈ 22.0.
 */
const TIP_INSET_RATIO = 2 / 24;

export type CentrePinProps = {
  size: number;
  color: IconColor;
};

/**
 * A pin whose TIP — not its bounding box — sits on the centre of its parent.
 *
 * Both map surfaces that mark a single point need this and neither can import
 * the other: the placer is a route under `src/app/**` and the submit form's
 * preview is under `src/features/**`, so `components/common/` is the only home
 * they share. Worth the file regardless, because getting it wrong is invisible
 * — the pin looks fine and points at a coordinate a few metres from the one
 * that gets saved, with nothing for typecheck, lint or a test to catch.
 *
 * Caller supplies the absolutely-positioned, centred box; this is only the
 * glyph and its offset. `pointerEvents` belongs on that box, not here — on the
 * placer the map has to receive every drag that starts on the pin.
 */
export function CentrePin({ size, color }: CentrePinProps) {
  const tipInset = size * TIP_INSET_RATIO;

  /*
    Lifts the glyph by half its own height so the icon box's BOTTOM edge lands
    on the centre line, then drops it back by the tip inset so it is the tip
    that sits there. Algebraically: the margin box is `size + margin` tall and
    centred, so the icon box bottom ends up at `centre + (size - margin) / 2`,
    and `margin = size - 2 * tipInset` puts the tip exactly on `centre`.
  */
  return (
    <View style={{ marginBottom: size - 2 * tipInset }}>
      <Icon name="map-pin" size={size} color={color} />
    </View>
  );
}
