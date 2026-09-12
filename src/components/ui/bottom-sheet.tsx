import { BottomSheet as HeroBottomSheet } from 'heroui-native';

/**
 * Compound bottom sheet:
 *
 *   <BottomSheet isOpen={open} onOpenChange={setOpen}>
 *     <BottomSheet.Portal>
 *       <BottomSheet.Overlay />
 *       <BottomSheet.Content>…</BottomSheet.Content>
 *     </BottomSheet.Portal>
 *   </BottomSheet>
 *
 * heroui's own component, which sits on `@gorhom/bottom-sheet` — already a
 * transitive dependency and already allow-listed in jest's
 * `transformIgnorePatterns`, so this adds nothing to package.json.
 *
 * Controlled via `isOpen` / `onOpenChange` rather than `BottomSheet.Trigger`:
 * the thing that opens this is a map annotation, not a button in the same tree.
 */
export type BottomSheetProps = React.ComponentProps<typeof HeroBottomSheet>;
export const BottomSheet = HeroBottomSheet;
