import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/**
 * Runs `onForeground` each time the app comes back to the foreground.
 *
 * Lives in src/hooks/ rather than beside the auth feature because it needs
 * `react-native`, which the import firewall bars from src/features/**.
 *
 * The motivating case is email verification: the user leaves to open a link in
 * their mail app and comes back. Re-checking on return is the difference between
 * "it just worked" and staring at a screen that still says "not confirmed".
 */
export function useAppForeground(onForeground: () => void) {
  // Kept in a ref so a caller passing an inline arrow does not resubscribe on
  // every render. Assigned in an effect rather than during render — a ref write
  // in the render body is invisible to the compiler's model of when state
  // changes, which is why react-hooks/refs rejects it.
  const handler = useRef(onForeground);
  useEffect(() => {
    handler.current = onForeground;
  }, [onForeground]);

  useEffect(() => {
    let previous = AppState.currentState;

    const sub = AppState.addEventListener('change', (next) => {
      if (previous.match(/inactive|background/) && next === 'active') {
        handler.current();
      }
      previous = next;
    });

    return () => sub.remove();
  }, []);
}
