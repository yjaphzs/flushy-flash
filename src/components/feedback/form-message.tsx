import { Callout } from '@/components/feedback/callout';
import { Text } from '@/components/ui/text';

export type FormMessageProps = {
  /** Why the form cannot be submitted at all, from `useWriteBlock()`. */
  blocked?: string | null;
  /** Why the last attempt failed, from `firebaseErrorMessage()`. */
  error?: string | null;
};

/**
 * The one message a form shows above its submit button.
 *
 * ⚠️ **Not a `Field.Error`, which is where both long forms used to put it.**
 * `callout.tsx` was written to end exactly that: a network or permission
 * failure rendered inside a field blames the wrong control, leaves the field
 * un-highlighted, and — on `/submit` — attached "Could not save that" to the
 * Floor input, three screens' worth of scrolling away from the button the user
 * pressed. The auth screens were fixed at the time; these two were missed.
 *
 * `blocked` wins over `error`, because a stale failure from the last attempt is
 * not what is stopping this one. Only one shows: two stacked messages make the
 * reader decide which applies, and the answer is always the first.
 */
export function FormMessage({ blocked, error }: FormMessageProps) {
  const message = blocked ?? error;
  if (!message) return null;

  return (
    <Callout
      tone={blocked ? 'info' : 'danger'}
      icon={blocked ? 'wifi-off' : undefined}
      testID="form-message"
    >
      <Text type="body-sm">{message}</Text>
    </Callout>
  );
}
