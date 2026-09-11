import { Text as HeroText } from 'heroui-native';

/**
 * The only text primitive in the app. HeroUI's Text carries variant styling and
 * participates in the surrounding component's text context (buttons, cards),
 * which is why raw `react-native` Text is never re-exported.
 */
export type TextProps = React.ComponentProps<typeof HeroText>;

export const Text = HeroText;
