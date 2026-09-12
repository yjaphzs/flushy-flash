import { Platform } from 'react-native';

/**
 * The few platform facts feature code needs, behind the firewall.
 *
 * `src/features/**` may not import `react-native` (AGENTS.md §2) and `src/lib/**`
 * may — the same reason `src/hooks/use-app-foreground.ts` lives where it does,
 * and `src/lib/env.ts` already reads `Platform` for the emulator host defaults.
 *
 * Deliberately narrow. This is not a place to re-export `Platform`; it answers
 * two specific questions and adding a third should need a reason.
 */

export const isAndroid = Platform.OS === 'android';

/**
 * The Android API level, or 0 elsewhere.
 *
 * `Platform.Version` is a number on Android and a string on iOS, which is
 * exactly the kind of thing that silently compares wrong — so it is normalised
 * here rather than at each call site.
 */
export const androidApiLevel = isAndroid ? Number(Platform.Version) : 0;
