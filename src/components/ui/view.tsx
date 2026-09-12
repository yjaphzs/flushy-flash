import { View as RNView } from 'react-native';

/**
 * Prop-narrowed View. Only the props we actually use are exposed, so swapping the
 * implementation later stays a one-file change.
 */
export type ViewProps = Pick<
  React.ComponentProps<typeof RNView>,
  'style' | 'className' | 'children' | 'testID' | 'pointerEvents' | 'onLayout'
>;

export function View(props: ViewProps) {
  return <RNView {...props} />;
}
