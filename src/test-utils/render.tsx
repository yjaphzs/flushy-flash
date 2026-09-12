import { render, type RenderOptions } from '@testing-library/react-native';

import { AppProviders } from '@/components/layouts/app-providers';

/**
 * Renders inside the app's real provider tree.
 *
 * HeroUI components read theme and animation settings from context and throw
 * `ContextError: useContext: 'context' is undefined` without it, so every screen
 * test needs this rather than the bare `render`.
 *
 * Deliberately not in `src/__tests__/`: jest's default testMatch treats every
 * file under a `__tests__` directory as a suite, and a helper with no tests in
 * it fails the run.
 *
 * Uniwind's Metro transform does not run under jest, so `className` produces no
 * styles here. Query by label, role or testID — never by style.
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, { wrapper: AppProviders, ...options });
}

export * from '@testing-library/react-native';
