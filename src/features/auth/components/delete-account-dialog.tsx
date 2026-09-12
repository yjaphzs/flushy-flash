import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { TextField, TextFieldInput, TextFieldLabel } from '@/components/forms/text-field';
import { deleteAccount, deleteMethod } from '@/features/auth/delete-account';
import { authErrorMessage } from '@/features/auth/errors';

export type DeleteAccountDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

/**
 * The confirmation before an account is deleted.
 *
 * ⚠️ **Mounted once and left mounted**, with `isOpen` toggled. heroui's dialog
 * seeds `prevIsOpenRef = useRef(isOpen)` and only opens on a false → true
 * transition, so one that mounts already-open never opens — the bug that made
 * the restroom sheet look like a dead map pin.
 *
 * Password accounts get a field, federated accounts just confirm. That is not
 * cosmetic: `reauthenticateWithCredential` needs a credential either way, and
 * for Google that comes from a silent re-sign-in rather than a prompt.
 */
export function DeleteAccountDialog({ isOpen, onClose }: DeleteAccountDialogProps) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const method = deleteMethod();

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(method === 'password' ? password : undefined);
      // No navigation and no success state: signOut() inside deleteAccount
      // flips the store to guest and the root guard swaps the tree out from
      // under this dialog.
    } catch (e) {
      setError(authErrorMessage(e, 'delete'));
      setBusy(false);
    }
  }

  const ready = method === 'google' || password.length > 0;

  return (
    <Dialog
      isOpen={isOpen}
      // Not dismissible mid-request: the account may already be half gone, and
      // the server is the only thing that can finish it.
      onOpenChange={(next) => {
        if (!next && !busy) {
          setPassword('');
          setError(null);
          onClose();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content>
          <View className="gap-5 px-5 pb-8 pt-4">
            <View className="gap-2">
              <Text type="h3">Delete your account?</Text>
              <Text type="body-sm" color="muted">
                Your profile, saved restrooms and @handle are deleted, and your @handle becomes
                free for someone else to take.
              </Text>
              <Text type="body-sm" color="muted">
                The restrooms and reviews you added stay on the map under a new name — other
                students rely on them — but they will no longer be linked to you. This cannot be
                undone.
              </Text>
            </View>

            {method === 'password' ? (
              <TextField>
                <TextFieldLabel>Confirm your password</TextFieldLabel>
                <TextFieldInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  placeholder="Your password"
                />
              </TextField>
            ) : null}

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
                onPress={confirm}
                isDisabled={busy || !ready}
              >
                <Button.Label>{busy ? 'Deleting…' : 'Delete my account'}</Button.Label>
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="rounded-full"
                onPress={onClose}
                isDisabled={busy}
              >
                <Button.Label>Cancel</Button.Label>
              </Button>
            </View>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
