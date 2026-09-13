import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { likeRestroom, unlikeRestroom } from '@/features/likes/api';
import { useRequestWrite } from '@/features/auth/use-auth-gate';
import { useIsLiked } from '@/stores/likes-store';

export type LikeButtonProps = {
  restroomId: string;
  uid: string | null;
  canWrite: boolean;
  /**
   * Where the auth gate should return the viewer after they finish signing up.
   * The map sheet is not a route, so it sends them to the restroom's page
   * rather than back to a sheet that no longer exists.
   */
  href: string;
};

/**
 * Save / unsave one restroom.
 *
 * Lived as a private function at the bottom of `/restroom/[id]` until the map
 * sheet needed it too. Two surfaces drawing their own heart is how they end up
 * disagreeing about what "saved" looks like — the same reason
 * `restroom-detail.tsx` exists.
 *
 * ## Two behaviours that look like omissions
 *
 * Saving is **optimistic-free on purpose**: the listener in `useMyLikes` owns
 * the state, so the heart reflects what Firestore actually accepted rather than
 * what we hoped it would. One extra round trip, no lying UI.
 *
 * The filled heart **never carries the meaning alone** — the accessibility
 * label says which state it is in, for both screen readers and anyone who
 * cannot distinguish the fill.
 *
 * ⚠️ **The size is not configurable, and `sm` is not an option.** heroui gives
 * `isIconOnly` an `aspect-ratio: 1`, so the button is a square of its size's
 * HEIGHT: `sm` is 40pt, under the 44pt minimum touch target (AGENTS.md §4). The
 * default `md` is 48. The map sheet wanted a smaller one; it does not get one.
 */
export function LikeButton({ restroomId, uid, canWrite, href }: LikeButtonProps) {
  const requestWrite = useRequestWrite();
  const liked = useIsLiked(restroomId);

  function onPress() {
    if (!canWrite || !uid) {
      requestWrite({ href, reason: 'like' });
      return;
    }
    const run = liked ? unlikeRestroom : likeRestroom;
    // Fire and forget: a failure leaves the heart where it was, which is the
    // honest outcome, and the listener is the source of truth either way.
    void run(uid, restroomId).catch(() => {});
  }

  return (
    <Button
      isIconOnly
      variant="secondary"
      onPress={onPress}
      accessibilityLabel={liked ? 'Remove from saved' : 'Save this restroom'}
      testID="like-restroom"
    >
      <Icon name="heart" color={liked ? 'danger' : 'muted'} filled={liked} />
    </Button>
  );
}
