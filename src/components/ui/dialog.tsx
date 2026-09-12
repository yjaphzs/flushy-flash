import { Dialog as HeroDialog } from 'heroui-native';

/**
 * Compound modal dialog:
 *
 *   <Dialog isOpen={open} onOpenChange={setOpen}>
 *     <Dialog.Portal>
 *       <Dialog.Overlay />
 *       <Dialog.Content>…</Dialog.Content>
 *     </Dialog.Portal>
 *   </Dialog>
 *
 * heroui's own, so no new dependency — and `Dialog.Overlay` already closes on
 * press while `Dialog.Content` supports drag-to-dismiss, which is the whole of
 * the "cancellable" requirement for the search dialog without writing gestures.
 *
 * Controlled via `isOpen`, not `Dialog.Trigger`: what opens this is a store
 * transition from the tab bar's centre button, not a button in the same tree.
 *
 * Screen-level modals still use native Stack presentations (see
 * `(app)/_layout.tsx`). This is for transient in-place dialogs only.
 */
export type DialogProps = React.ComponentProps<typeof HeroDialog>;
export const Dialog = HeroDialog;
