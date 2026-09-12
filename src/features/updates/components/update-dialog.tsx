import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { formatBytes } from '@/features/updates/api';
import { openInstallPermissionSettings } from '@/features/updates/install';
import { useUpdateDownload } from '@/features/updates/use-update-check';
import {
  useUpdateError,
  useUpdateOffer,
  useUpdatePhase,
  useUpdateProgress,
  useUpdateStore,
} from '@/stores/update-store';

/**
 * The update prompt.
 *
 * ⚠️ **Mounted once and left mounted**, with `isOpen` toggled — heroui's dialog
 * seeds `prevIsOpenRef = useRef(isOpen)` and only opens on a false → true
 * transition, so a dialog that mounts already-open never opens at all. That bug
 * cost a day on the restroom sheet; see `restroom-sheet.tsx`.
 *
 * Lives in `(app)/_layout.tsx` beside `useCampusData()`, because that subtree is
 * permanently mounted and this must not remount on navigation mid-download.
 */
export function UpdateDialog() {
  const phase = useUpdatePhase();
  const offer = useUpdateOffer();
  const progress = useUpdateProgress();
  const error = useUpdateError();
  const { start, cancel } = useUpdateDownload();
  const snooze = useUpdateStore((s) => s.snooze);
  const dismiss = useUpdateStore((s) => s.dismiss);

  const open = phase === 'available' || phase === 'downloading' || phase === 'installing';
  const busy = phase === 'downloading';

  return (
    <Dialog
      isOpen={open}
      // A download in flight must not be dismissible by a stray tap outside —
      // the bytes are already being paid for.
      onOpenChange={(next) => {
        if (!next && !busy) snooze();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content>
          <View className="gap-5 px-5 pb-8 pt-4">
            <View className="gap-1">
              <Text type="h3">
                {phase === 'installing' ? 'Ready to install' : 'A new version is out'}
              </Text>
              <Text type="body-sm" color="muted">
                {phase === 'installing'
                  ? 'Android will ask you to confirm. If nothing appeared, allow installs from this app and try again.'
                  : offer
                    ? `Version ${offer.version} · ${formatBytes(offer.bytes)}`
                    : ''}
              </Text>
            </View>

            {offer?.notes && phase === 'available' ? (
              <Text type="body-sm">{offer.notes}</Text>
            ) : null}

            {busy ? (
              /*
                A byte count rather than a progress bar. There is no progress
                primitive in components/ui, and on a slow campus link "18 of
                68 MB" tells you more than a bar creeping along does.
              */
              <Text type="body-sm" color="muted">
                {offer
                  ? `${formatBytes(Math.round(progress * offer.bytes))} of ${formatBytes(offer.bytes)}`
                  : 'Downloading…'}
              </Text>
            ) : null}

            {error ? (
              <Text type="body-sm" className="text-danger">
                {error}
              </Text>
            ) : null}

            <View className="gap-2">
              {phase === 'installing' ? (
                <Button size="lg" className="rounded-full" onPress={openInstallPermissionSettings}>
                  <Button.Label>Install didn&apos;t start?</Button.Label>
                </Button>
              ) : (
                <Button size="lg" className="rounded-full" onPress={start} isDisabled={busy}>
                  <Button.Label>{busy ? 'Downloading…' : 'Update now'}</Button.Label>
                </Button>
              )}

              <Button
                variant="secondary"
                size="lg"
                className="rounded-full"
                onPress={busy ? cancel : phase === 'installing' ? dismiss : snooze}
              >
                <Button.Label>
                  {busy ? 'Cancel' : phase === 'installing' ? 'Done' : 'Not now'}
                </Button.Label>
              </Button>
            </View>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
