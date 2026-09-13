import { Pressable, Text } from 'react-native';

import { useAppToast } from '@/components/feedback/toast';
import { fireEvent, renderWithProviders, screen, waitFor } from '@/test-utils/render';

/**
 * ⚠️ **This exists to prove the provider is mounted, not to test heroui.**
 *
 * `useAppToast` adds no provider of its own — it relies on `HeroUINativeProvider`
 * wrapping its children in `ToastProvider` unless `toast` is explicitly `false`,
 * which `app-providers.tsx` never passes. `useToast()` THROWS when that is not
 * so, and every call site is an offline path: the heart, the vote buttons, Mark
 * all read. A wrong assumption there is a crash exactly when the user is least
 * able to report it, and nothing else in the suite would catch it.
 *
 * RN primitives rather than the app's wrappers: the subject is the provider
 * tree, and `@/components/ui/*` would only add surface to this test.
 */
function Harness() {
  const toast = useAppToast();
  return (
    <Pressable onPress={() => toast.offline('Try again with a connection.')} testID="fire">
      <Text>fire</Text>
    </Pressable>
  );
}

/**
 * ⚠️ Counted, never asserted as 1: heroui renders each toast's text into more
 * than one node, so a raw `getByText` fails with "found multiple" on a single
 * toast. What matters is whether the number CHANGES, not what it is.
 */
const labelNodes = () => screen.queryAllByText("You're offline").length;

describe('useAppToast', () => {
  it('resolves the provider heroui mounts for us, and shows a toast', async () => {
    await renderWithProviders(<Harness />);
    expect(labelNodes()).toBe(0);

    fireEvent.press(screen.getByTestId('fire'));

    await waitFor(() => expect(labelNodes()).toBeGreaterThan(0));
    // The reason, not just the fact — the whole argument for a toast over a
    // silently dead control.
    expect(screen.queryAllByText('Try again with a connection.').length).toBeGreaterThan(0);
  });

  /**
   * A stable id per KIND of message, so a student jabbing a blocked heart gets
   * one toast rather than a stack of identical ones. heroui dedupes an explicit
   * id by returning the existing toast and dispatching nothing.
   */
  it('does not stack repeats of the same message', async () => {
    await renderWithProviders(<Harness />);

    fireEvent.press(screen.getByTestId('fire'));
    await waitFor(() => expect(labelNodes()).toBeGreaterThan(0));
    const afterOne = labelNodes();

    fireEvent.press(screen.getByTestId('fire'));
    fireEvent.press(screen.getByTestId('fire'));

    await waitFor(() => expect(labelNodes()).toBe(afterOne));
  });
});
