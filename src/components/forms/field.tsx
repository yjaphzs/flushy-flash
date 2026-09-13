import { useState } from 'react';
import { Platform, type TextInput, type TextInputProps } from 'react-native';
import { Description, FieldError, InputGroup, Label, TextField } from 'heroui-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';

/**
 * Re-exported so screens can hold a field ref without importing `react-native`,
 * which the import firewall forbids them. In practice only `.focus()` is ever
 * called on it, for return-key chaining between fields.
 *
 * Not narrowed to `Pick<TextInput, 'focus' | 'blur'>`: TypeScript treats
 * RefObject as invariant, so a narrowed handle cannot be passed where a
 * `Ref<TextInput>` is expected without a cast at every call site.
 */
export type TextInputHandle = TextInput;

/**
 * The form field used across the app.
 *
 * `Field` itself is HeroUI's TextField root, which exists to hold state: it
 * cascades `isInvalid` / `isDisabled` / `isRequired` through context to the
 * Label, Input and Error beneath it. Put `isInvalid` on the root, not the input —
 * that is what turns the whole field red rather than just showing a message.
 *
 *   <Field isInvalid={Boolean(error)}>
 *     <Field.Label>Email</Field.Label>
 *     <Field.Input value={email} onChangeText={setEmail} leading="mail" />
 *     {error ? <Field.Error>{error}</Field.Error> : null}
 *   </Field>
 */
const FieldRoot = TextField;

type BaseInputProps = Pick<
  TextInputProps,
  | 'value'
  | 'onChangeText'
  | 'onBlur'
  | 'onFocus'
  | 'placeholder'
  | 'keyboardType'
  | 'autoCapitalize'
  | 'autoCorrect'
  | 'autoComplete'
  | 'textContentType'
  | 'passwordRules'
  | 'returnKeyType'
  | 'submitBehavior'
  | 'onSubmitEditing'
  | 'maxLength'
  | 'accessibilityLabel'
  | 'testID'
> & {
  /** Decorative leading glyph — hidden from screen readers, taps fall through. */
  leading?: IconName;
  /** Status slot: a spinner, a check, a taken/available mark. */
  trailing?: React.ReactNode;
  /**
   * Restyles the input's own surface.
   *
   * Needed because heroui paints the background in a CSS class, not a utility:
   * `.input__input--variant-primary` sets `background-color: var(--color-field)`,
   * and `--field-background` is only 14% alpha — so on any surface that is not
   * the form card it reads as a grey wash over whatever is behind it. The map's
   * search bar wants the white pill it sits in, not that.
   *
   * ⚠️ It is also where a caller fixes the FOCUS RING. On Android focus draws
   * `border-accent` at `--field-radius` (12px); inside a pill-shaped parent
   * that ring's corners do not follow the pill and get clipped. Passing a
   * matching radius here is what keeps the two in step.
   */
  className?: string;
  ref?: React.Ref<TextInputHandle>;
};

/**
 * Two non-obvious props, both load-bearing:
 *
 * `variant="primary"` — Input calls useIsOnSurface(), which returns true inside
 * any non-transparent Surface and *silently* switches to `secondary`, painting
 * --color-default instead of --color-field. Inside the glass card that is the
 * wrong token, and nothing warns you.
 *
 * `background={null}` off iOS — the glass theme mounts a GlassView behind the
 * input; on Android that layer is opaque and would hide the card behind it.
 * Same reasoning as @/components/glass-surface.
 */
const inputChrome = {
  variant: 'primary',
  background: Platform.OS === 'ios' ? undefined : null,
} as const;

function FieldInput({ leading, trailing, className, ref, ...props }: BaseInputProps) {
  return (
    <InputGroup>
      {leading ? (
        <InputGroup.Prefix isDecorative>
          <Icon name={leading} size={18} color="field-placeholder" />
        </InputGroup.Prefix>
      ) : null}
      <InputGroup.Input ref={ref} {...inputChrome} className={className} {...props} />
      {trailing ? <InputGroup.Suffix isDecorative>{trailing}</InputGroup.Suffix> : null}
    </InputGroup>
  );
}

/**
 * Password input with a reveal toggle.
 *
 * The toggle flips `secureTextEntry` on a single persistent TextInput rather
 * than swapping components: some Android OEM keyboards drop the composing
 * buffer when the input remounts, which eats the last typed character.
 *
 * `autoCorrect`/`spellCheck` are forced off so Android does not switch to the
 * suggestion-strip font the moment the password is unmasked.
 */
function FieldPasswordInput({ leading = 'lock', ref, ...props }: BaseInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <InputGroup>
      <InputGroup.Prefix isDecorative>
        <Icon name={leading} size={18} color="field-placeholder" />
      </InputGroup.Prefix>
      <InputGroup.Input
        ref={ref}
        secureTextEntry={!visible}
        autoCorrect={false}
        spellCheck={false}
        autoCapitalize="none"
        {...inputChrome}
        {...props}
      />
      <InputGroup.Suffix>
        <Pressable
          onPress={() => setVisible((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          // 18pt glyph + 13pt slop each side clears the 44pt minimum target.
          hitSlop={13}
        >
          <Icon name={visible ? 'eye-off' : 'eye'} size={18} color="field-placeholder" />
        </Pressable>
      </InputGroup.Suffix>
    </InputGroup>
  );
}

export type FieldProps = React.ComponentProps<typeof FieldRoot>;
export type FieldInputProps = BaseInputProps;

export const Field = Object.assign(FieldRoot, {
  Label,
  Input: FieldInput,
  PasswordInput: FieldPasswordInput,
  Description,
  Error: FieldError,
});
