import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { DeleteAccountDialog } from '@/features/auth/components/delete-account-dialog';

/**
 * The danger row at the bottom of Settings, and the dialog it opens.
 *
 * Both live here rather than in `settings.tsx`, which is close to the 200-line
 * cap — and keeping the trigger and the dialog together is what makes "mounted
 * once, `isOpen` toggled" the obvious shape rather than something a future edit
 * might accidentally undo.
 *
 * Rendered for every signed-in state including `needsVerification` and
 * `needsProfile`: someone who gave up halfway through signing up is exactly who
 * needs this, and they have no other way out.
 */
export function DeleteAccountRow() {
  const [open, setOpen] = useState(false);

  return (
    <View className="gap-2 pt-2">
      <Text type="body-xs" color="muted">
        Deleting your account removes your profile and frees your @handle. Restrooms and reviews
        you added stay on the map, under a new name.
      </Text>
      <Button variant="danger-soft" onPress={() => setOpen(true)}>
        <Button.Label>Delete account</Button.Label>
      </Button>

      <DeleteAccountDialog isOpen={open} onClose={() => setOpen(false)} />
    </View>
  );
}
