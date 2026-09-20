import { router } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useUid } from '@/stores/auth-store';
import type { Restroom } from '@/lib/types';

export type EditRestroomRowProps = {
  restroom: Restroom;
};

/**
 * "Edit this restroom", for the author.
 *
 * ⚠️ **Unlike `DeleteRestroomRow`, this does NOT disappear once other people
 * engage with the entry.** Deleting stops being the author's alone the moment a
 * stranger reviews or vouches for it — the rules refuse it, so the button could
 * only ever fail. Editing is the opposite: an entry other people rely on is
 * exactly the one worth keeping accurate, and `firestore.rules` permits the
 * author to update it for as long as it exists.
 *
 * It is the only route to `status`, which has been rendered on the building list
 * and the detail page since those screens were written and settable nowhere — so
 * a restroom that broke stayed marked working forever.
 */
export function EditRestroomRow({ restroom }: EditRestroomRowProps) {
  const uid = useUid();
  if (uid === null || restroom.createdBy !== uid) return null;

  return (
    <Button
      variant="secondary"
      className="rounded-full"
      onPress={() => router.push(`/edit-restroom?id=${restroom.id}`)}
      testID="edit-restroom"
    >
      <Icon name="pencil" size={16} color="accent-soft-foreground" />
      <Button.Label>Edit this restroom</Button.Label>
    </Button>
  );
}
