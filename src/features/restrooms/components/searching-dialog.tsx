import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Lottie } from '@/components/ui/lottie';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useMapFocusStore, useNearestOutcome } from '@/stores/map-focus-store';

/**
 * Shown while "find the nearest restroom" is looking for the user.
 *
 * The state bracket is exhaustive by construction: `begin()` is the only entry
 * to `locating`, and every exit is a single `set()` — `fail()` or `succeed()` —
 * so gating on `outcome === 'locating'` closes on exactly one of
 * `found | denied | unavailable | none`, with no fallthrough.
 *
 * `campusLoading` deliberately never reaches here: that path short-circuits
 * before `begin()`, so pressing the button while the campus is still loading
 * shows its message without a dialog flashing first.
 *
 * ## Why it is cancellable
 *
 * `getCurrentFix()` is capped at 8 s, and indoors it often uses all of it — a
 * modal nobody can leave for eight seconds is the single most common complaint
 * about this pattern. `Dialog.Overlay` closes on press and `Dialog.Content`
 * supports drag-to-dismiss, both from heroui, so the only thing to add is the
 * explicit button.
 *
 * Cancelling cannot abort the request — expo-location takes no abort signal —
 * so `cancel()` bumps the attempt counter instead and the late result is
 * discarded by the store.
 */
export function SearchingDialog() {
  const outcome = useNearestOutcome();
  const open = outcome === 'locating';

  return (
    <Dialog
      isOpen={open}
      onOpenChange={(next) => {
        // Fires for the overlay press and the dismiss gesture as well as the
        // button, so this one handler covers every way out.
        if (!next) useMapFocusStore.getState().cancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content>
          <View className="items-center gap-4 px-6 py-6" testID="searching-dialog">
            <Lottie name="searching" size={168} />

            <View className="items-center gap-1">
              <Text type="h4" align="center">
                Finding you…
              </Text>
              <Text type="body-sm" color="muted" align="center">
                Looking for the nearest open restroom on campus.
              </Text>
            </View>

            <Button
              variant="secondary"
              size="md"
              className="rounded-full"
              onPress={() => useMapFocusStore.getState().cancel()}
            >
              <Button.Label>Cancel</Button.Label>
            </Button>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
