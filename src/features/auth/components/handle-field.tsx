import { Field, type TextInputHandle } from '@/components/forms/field';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { HANDLE_MESSAGE, type HandleState } from '@/features/auth/use-handle-availability';

function StatusMark({ state }: { state: HandleState }) {
  if (state === 'checking') return <Spinner size="sm" />;
  if (state === 'available') return <Icon name="check" size={18} color="success" />;
  if (state === 'taken' || state === 'invalid') return <Icon name="x" size={18} color="danger" />;
  return null;
}

export type HandleFieldProps = {
  value: string;
  onChangeText: (next: string) => void;
  onBlur: () => void;
  state: HandleState;
  ref?: React.Ref<TextInputHandle>;
  testID?: string;
};

/**
 * The @handle field, with live availability.
 *
 * `taken` and `invalid` render through Field.Error so the whole field turns red;
 * everything else stays a Description. The status glyph never carries the
 * meaning on its own — there is always a message beside it.
 */
export function HandleField({ value, onChangeText, onBlur, state, ref, testID }: HandleFieldProps) {
  const isError = state === 'taken' || state === 'invalid';
  const message = HANDLE_MESSAGE[state];

  return (
    <Field isInvalid={isError}>
      <Field.Label>Handle</Field.Label>
      <Field.Input
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        leading="at-sign"
        trailing={<StatusMark state={state} />}
        placeholder="juan_dc"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        textContentType="username"
        maxLength={20}
        returnKeyType="next"
        testID={testID}
      />
      {isError && message ? <Field.Error>{message}</Field.Error> : null}
      {!isError ? (
        <Field.Description>
          {message ?? 'Your unique @name. Cannot be changed later.'}
        </Field.Description>
      ) : null}
    </Field>
  );
}
