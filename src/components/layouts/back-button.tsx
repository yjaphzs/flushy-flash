import type { IconColor } from '@/components/ui/icon';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';

export type BackButtonProps = {
  onPress: () => void;
  /**
   * `on-brand` over the auth gradient, `foreground` over a plain surface. There
   * is no sensible default that reads on both, so it is always explicit.
   */
  color: IconColor;
  /**
   * Whether to pull the glyph out to the screen's CONTENT edge.
   *
   * True for a chevron at the top of a padded screen, which is every case but
   * one. Pass false when the button sits in a box of its own — a floating
   * disc over the map — where there is no content edge to align to and the
   * negative margin only shoves the glyph off centre. See the docblock.
   */
  edgeAligned?: boolean;
  testID?: string;
};

/**
 * The in-screen back affordance, shared by `AuthScreen` and `FormScreen`.
 *
 * Both groups turn native headers off — `(auth)` so the brand gradient can run
 * full-bleed, `(app)` so a form is not topped by a duplicate of the title it
 * already renders as its own H1 — so the chevron has to be drawn by the screen.
 *
 * ## Why 44×44 and a negative margin
 *
 * The glyph is 24px, which is nowhere near a touch target. The box is 44 square
 * because that is the documented floor, and `hitSlop` widens the *interactive*
 * area a further 12 without changing layout. The `-ml-3` then pulls the padded
 * box back so the chevron itself lines up with the screen's content edge rather
 * than sitting inset from it — otherwise a 44px box inside a `px-5` screen puts
 * the glyph 30px in and it reads as misaligned against everything below it.
 *
 * ⚠️ **Vertical position is NOT this component's job.** It used to be, as a
 * hardcoded `pt-3` in auth-screen.tsx, which put the chevron 12px from the top
 * of the window on Android — `(auth)` is a full-screen modal there — and left it
 * half under the status bar and barely tappable. The top inset now comes from
 * `Screen`/`ScreenScrollView`; this only ever adds spacing below it.
 *
 * ⚠️ **That negative margin is wrong inside a floating disc, and it looks
 * like a broken border-radius rather than a margin bug.** With no content
 * edge to align to it simply drags the 44pt box 12pt left of its parent's own
 * left edge: the chevron ends up off-centre in the circle, and the parent can
 * measure 32pt wide instead of 44, so `rounded-full` paints an ELLIPSE. That
 * is what `edgeAligned={false}` is for — `pick-location.tsx` is the only
 * caller that needs it, and the three padded-screen call sites depend on the
 * default staying true.
 */
export function BackButton({ onPress, color, edgeAligned = true, testID }: BackButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={12}
      className={
        edgeAligned
          ? '-ml-3 h-11 w-11 items-center justify-center'
          : 'h-11 w-11 items-center justify-center'
      }
      testID={testID}
    >
      <Icon name="chevron-left" size={24} color={color} />
    </Pressable>
  );
}
