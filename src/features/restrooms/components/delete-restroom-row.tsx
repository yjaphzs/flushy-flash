import { useState } from 'react';
import { router } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { deleteRestroom } from '@/features/restrooms/api';
import { firestoreErrorMessage } from '@/lib/firestore-errors';
import { useUid } from '@/stores/auth-store';
import type { Restroom } from '@/lib/types';

export type DeleteRestroomRowProps = {
  restroom: Restroom;
};

/**
 * "Remove this restroom", for the author, while it is still theirs to remove.
 *
 * The trigger and its dialog live in one file for the reason
 * `delete-account-row.tsx` gives: keeping them together is what makes "mounted
 * once, `isOpen` toggled" the obvious shape rather than something a later edit
 * accidentally undoes — and heroui's Dialog only opens on a false → true
 * transition, so one that mounts already-open never opens at all.
 *
 * ⚠️ **Renders nothing once anyone else has engaged with the entry.** The rules
 * refuse the delete at that point (`ratingCount == 0 && confirmCount == 0`), so
 * showing the button would be offering an action that can only fail. A restroom
 * someone has reviewed or vouched for has stopped being the author's alone.
 *
 * No re-authentication, unlike account deletion. That flow needs a fresh
 * credential because a stolen session must not be able to destroy an account;
 * this removes one pin that nobody else has touched, and the author can simply
 * add it again.
 */
export function DeleteRestroomRow({ restroom }: DeleteRestroomRowProps) {
  const uid = useUid();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mine = uid !== null && restroom.createdBy === uid;
  const untouched = restroom.ratingCount === 0 && restroom.confirmCount === 0;
  if (!mine || !untouched) return null;

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await deleteRestroom(restroom.id);
      // Back, not replace: the map or the list the user came from is still
      // mounted behind this, and its listener drops the pin on its own.
      router.back();
    } catch (e) {
      setError(firestoreErrorMessage(e));
      setBusy(false);
    }
  }

  return (
    <View className="gap-2 pt-2">
      <Text type="body-xs" color="muted">
        You added this one, and nobody has reviewed or confirmed it yet, so you can still take
        it down. That frees one of your 3 pending slots.
      </Text>
      <Button variant="danger-soft" onPress={() => setOpen(true)}>
        <Button.Label>Remove this restroom</Button.Label>
      </Button>

      <Dialog
        isOpen={open}
        // Not dismissible mid-request: the document may already be gone and the
        // photo cleanup is still running behind it.
        onOpenChange={(next) => {
          if (!next && !busy) {
            setError(null);
            setOpen(false);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content>
            <View className="gap-5 px-5 pb-8 pt-4">
              <View className="gap-2">
                <Text type="h3">Remove this restroom?</Text>
                <Text type="body-sm" color="muted">
                  It disappears from the map for everyone, and the photos you uploaded with it
                  are deleted. This cannot be undone.
                </Text>
                <Text type="body-sm" color="muted">
                  If it is real but hard to find, editing the directions helps more than
                  removing it.
                </Text>
              </View>

              {error ? (
                <Text type="body-sm" className="text-danger">
                  {error}
                </Text>
              ) : null}

              <View className="gap-2">
                <Button
                  variant="danger"
                  size="lg"
                  className="rounded-full"
                  isDisabled={busy}
                  onPress={() => void confirm()}
                >
                  <Button.Label>{busy ? 'Removing…' : 'Remove it'}</Button.Label>
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="rounded-full"
                  isDisabled={busy}
                  onPress={() => setOpen(false)}
                >
                  <Button.Label>Keep it</Button.Label>
                </Button>
              </View>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </View>
  );
}
