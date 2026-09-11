import type { ReactNode } from 'react';
import { Button as HeroButton } from 'heroui-native';

type HeroButtonProps = React.ComponentProps<typeof HeroButton>;

/**
 * HeroUI's Button will happily render a raw string child as its label. We narrow
 * that away on purpose: the house rule is that a component which is not a text
 * node must not accept a string child, so the label always goes through
 * `Button.Label`. That keeps text styling flowing through HeroUI's text context
 * instead of being re-implemented at each call site.
 *
 *   <Button variant="primary" onPress={save}>
 *     <Button.Label>Save restroom</Button.Label>
 *   </Button>
 *
 * Note the prop is `isDisabled`, not `disabled` — HeroUI omits RN's own
 * `disabled` from its Pressable props and replaces it.
 */
export type ButtonProps = Omit<
  Pick<
    HeroButtonProps,
    | 'onPress'
    | 'isDisabled'
    | 'variant'
    | 'size'
    | 'isIconOnly'
    | 'className'
    | 'accessibilityLabel'
    | 'testID'
  >,
  'children'
> & {
  /** ReactNode but never a bare string — use <Button.Label>. */
  children: Exclude<ReactNode, string | number>;
};

export const Button = HeroButton as unknown as ((props: ButtonProps) => React.JSX.Element) &
  Pick<typeof HeroButton, 'Label' | 'Background'>;

/** Alias for call sites that prefer the flat house naming. */
export const ButtonText = HeroButton.Label;
