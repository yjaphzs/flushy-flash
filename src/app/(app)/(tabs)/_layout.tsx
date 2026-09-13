import { Tabs } from 'expo-router/js-tabs';

import { FloatingTabBar } from '@/components/common/floating-tab-bar';
import { useFindNearest } from '@/hooks/use-find-nearest';

/**
 * The JS tabs navigator, deliberately — and this is the one place AGENTS.md §1's
 * "native navigators only" is amended.
 *
 * §1's own rationale is that NativeTabs "render the real UITabBar /
 * BottomNavigationView, so they pick up platform behaviour for free". A floating
 * pill throws that away on purpose, and NativeTabs cannot produce one: nothing
 * on NativeTabsProps, NativeTabTriggerProps, NativeTabOptions, or the
 * unstable_nativeProps -> TabsHostProps escape hatch controls corner radius,
 * inset, floating position or height. Android's entire native escape hatch is
 * `tabBarRespectsIMEInsets`.
 *
 * The amendment is narrow: TABS ONLY. Native `Stack` stays mandatory
 * everywhere, and `@react-navigation/bottom-tabs` stays banned as a package —
 * the navigator here is VENDORED inside expo-router, so no dependency is added
 * and the ESLint firewall is untouched. Import via `expo-router/js-tabs`; bare
 * expo-router's `Tabs` is marked @deprecated.
 *
 * Two defaults have to be overridden, because the JS navigator's differ from
 * NativeTabs' — note they are set in DIFFERENT places, which the previous
 * version of this comment got wrong by calling both screenOptions:
 *   - `headerShown` defaults to TRUE, so every tab would grow a JS header.
 *     Set once in `screenOptions`, since it applies to all four.
 *   - `lazy` defaults to TRUE, so the map would stay unmounted until visited
 *     and a camera command from another tab would fly into a null ref. Set
 *     per-screen on `index` ALONE, because only the map is commanded from
 *     elsewhere; eagerly mounting the other three would buy nothing.
 *
 * Screen order is declared, not inferred: FloatingTabBar splits the pill at the
 * midpoint of state.routes, so the order IS the layout.
 */
export default function TabsLayout() {
  const findNearest = useFindNearest();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...props} onCentrePress={() => void findNearest()} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Map', lazy: false }} />
      <Tabs.Screen name="likes" options={{ title: 'Likes' }} />
      {/* "Alerts" no longer has to fit a BottomNavigationView label, but the
          short form is still the better accessibility label. */}
      <Tabs.Screen name="notifications" options={{ title: 'Alerts' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
