import Accessibility from 'lucide-react-native/icons/accessibility';
import AtSign from 'lucide-react-native/icons/at-sign';
import BadgeCheck from 'lucide-react-native/icons/badge-check';
import Bell from 'lucide-react-native/icons/bell';
import Check from 'lucide-react-native/icons/check';
import Clock from 'lucide-react-native/icons/clock';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import CircleAlert from 'lucide-react-native/icons/circle-alert';
import Droplet from 'lucide-react-native/icons/droplet';
import Eye from 'lucide-react-native/icons/eye';
import EyeOff from 'lucide-react-native/icons/eye-off';
import Heart from 'lucide-react-native/icons/heart';
import ImageIcon from 'lucide-react-native/icons/image';
import Lock from 'lucide-react-native/icons/lock';
import LogOut from 'lucide-react-native/icons/log-out';
import Mail from 'lucide-react-native/icons/mail';
import MapGlyph from 'lucide-react-native/icons/map';
import LocateFixed from 'lucide-react-native/icons/locate-fixed';
import MapPin from 'lucide-react-native/icons/map-pin';
import Plus from 'lucide-react-native/icons/plus';
import RefreshCw from 'lucide-react-native/icons/refresh-cw';
import Search from 'lucide-react-native/icons/search';
import Settings from 'lucide-react-native/icons/settings';
import SlidersHorizontal from 'lucide-react-native/icons/sliders-horizontal';
import GraduationCap from 'lucide-react-native/icons/graduation-cap';
import ScrollText from 'lucide-react-native/icons/scroll-text';
import ShowerHead from 'lucide-react-native/icons/shower-head';
import Sparkles from 'lucide-react-native/icons/sparkles';
import Star from 'lucide-react-native/icons/star';
import User from 'lucide-react-native/icons/user';
import UserRound from 'lucide-react-native/icons/user-round';
import XMark from 'lucide-react-native/icons/x';
import { useCSSVariable } from 'uniwind';

import { View } from '@/components/ui/view';

/**
 * Icons are Lucide components, imported ONE FILE AT A TIME.
 *
 * The deep `lucide-react-native/icons/<name>` path is the whole mechanism, not a
 * style preference. Metro does not tree-shake, so importing the barrel
 * (`from 'lucide-react-native'`) walks ~1,600 icon modules into the graph and
 * ships every one; the package's `sideEffects: false` is a hint for bundlers
 * that do dead-code elimination, and Metro is not one. Each `icons/<name>.mjs`
 * pulls only `createLucideIcon` → `Icon` → react-native-svg, so N icons cost N
 * glyphs plus one shared runtime. `eslint.config.js` bans the root specifier to
 * keep it that way.
 *
 * Geometry is Lucide's (https://lucide.dev), ISC licensed: Copyright (c) 2022
 * Lucide Contributors — the same paths this file used to transcribe by hand,
 * now tracked upstream.
 */
export type IconName =
  | 'mail'
  | 'lock'
  | 'user'
  | 'at-sign'
  | 'eye'
  | 'eye-off'
  | 'chevron-left'
  | 'chevron-right'
  | 'check'
  | 'x'
  | 'alert-circle'
  | 'plus'
  | 'heart'
  | 'bell'
  | 'map'
  | 'map-pin'
  | 'locate-fixed'
  | 'user-round'
  | 'settings'
  | 'refresh-cw'
  | 'graduation-cap'
  | 'log-out'
  | 'sparkles'
  | 'star'
  | 'badge-check'
  // Amenity and stat glyphs for the restroom detail surfaces.
  | 'droplet'
  | 'scroll-text'
  | 'shower-head'
  | 'accessibility'
  | 'clock'
  | 'image'
  | 'search'
  | 'filter';

/** `typeof Heart` rather than importing LucideIcon — one fewer specifier. */
type Glyph = typeof Heart;

/**
 * Two entries whose Lucide file is NOT named after our key.
 *
 * `alert-circle` maps to Lucide's `circle-alert`: Lucide renamed it and the old
 * name survives ONLY as a deprecated alias inside the barrel, so there is no
 * `icons/alert-circle.mjs` to import. Our own name is kept so callout.tsx does
 * not have to change. Verified: that path is a 404 on the registry and absent
 * from node_modules.
 *
 * `filter` is the same trap with a twist. Lucide renamed `filter` → `funnel`,
 * so `icons/filter.mjs` does not exist either — verified in node_modules. But
 * the replacement here is `sliders-horizontal` rather than `funnel`, on
 * purpose: the control it labels opens a sheet of toggles, and sliders read as
 * "adjust these" where a funnel reads as "narrow a list". Our key stays
 * `filter` because that is what the feature is called everywhere else.
 */
const GLYPHS: Record<IconName, Glyph> = {
  mail: Mail,
  lock: Lock,
  user: User,
  'at-sign': AtSign,
  eye: Eye,
  'eye-off': EyeOff,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  check: Check,
  x: XMark,
  'alert-circle': CircleAlert,
  plus: Plus,
  heart: Heart,
  bell: Bell,
  map: MapGlyph,
  'map-pin': MapPin,
  'locate-fixed': LocateFixed,
  'user-round': UserRound,
  settings: Settings,
  'refresh-cw': RefreshCw,
  'graduation-cap': GraduationCap,
  'log-out': LogOut,
  sparkles: Sparkles,
  star: Star,
  'badge-check': BadgeCheck,
  droplet: Droplet,
  'scroll-text': ScrollText,
  'shower-head': ShowerHead,
  accessibility: Accessibility,
  clock: Clock,
  image: ImageIcon,
  search: Search,
  filter: SlidersHorizontal,
};

/** Theme tokens an icon may be tinted with, including this app's own. */
export type IconColor =
  | 'foreground'
  | 'muted'
  | 'accent'
  | 'danger'
  | 'success'
  | 'warning'
  | 'field-placeholder'
  | 'accent-foreground'
  /**
   * The SECONDARY Button's label colour, for a glyph sitting beside one.
   *
   * Not the same green as `accent`: heroui derives this token and
   * `global.css` overrides it via the app-owned `--accent-soft-fg`, because
   * uniwind evaluates `color-mix()` in sRGB and the derived value lands too
   * close to the `--default` fill beneath it (§14). A glyph tinted `accent`
   * next to a label tinted this reads as two different greens.
   */
  | 'accent-soft-foreground'
  | 'on-accent'
  | 'on-brand';

export type IconProps = {
  name: IconName;
  size?: number;
  color?: IconColor;
  /**
   * Paints the shape solid instead of stroking it — Lucide's `fill`. Only
   * meaningful for closed outlines; `heart` is the one that needs it. State is
   * never signalled by fill alone, there is always a label beside it.
   */
  filled?: boolean;
  /**
   * Lucide's default is 2 and so is ours. Raise it only where a glyph sits on a
   * saturated fill, where the extra weight buys legibility that the 3:1 colour
   * contrast only barely provides.
   */
  strokeWidth?: number;
  /**
   * Omit for decorative icons — without a label the glyph is hidden from the
   * accessibility tree, which is what you want beside a labelled field.
   */
  accessibilityLabel?: string;
  testID?: string;
};

export function Icon({
  name,
  size = 20,
  color = 'muted',
  filled = false,
  strokeWidth = 2,
  accessibilityLabel,
  testID,
}: IconProps) {
  // useCSSVariable rather than heroui's useThemeColor: the latter's ThemeColor
  // union has no room for app-owned tokens like --color-on-accent.
  const resolved = useCSSVariable(`--color-${color}`);
  const tint = typeof resolved === 'string' ? resolved : 'currentColor';
  const Glyph = GLYPHS[name];

  /**
   * The wrapping View is not decoration. Lucide's Icon destructures `testID`
   * and re-emits it as the WEB attribute `data-testid`, so React Native's
   * testID never reaches the view and getByTestId silently finds nothing. It
   * also hard-sets `aria-hidden="true"` whenever no aria-* prop is present —
   * inert on react-native-svg's codegen'd root today, but not something to
   * depend on. Owning both here keeps the accessibility contract ours across a
   * Lucide upgrade.
   */
  const labelled = accessibilityLabel !== undefined;

  return (
    <View
      accessible={labelled}
      accessibilityRole={labelled ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={labelled ? 'yes' : 'no-hide-descendants'}
      testID={testID}
    >
      <Glyph size={size} color={tint} strokeWidth={strokeWidth} fill={filled ? tint : 'none'} />
    </View>
  );
}
