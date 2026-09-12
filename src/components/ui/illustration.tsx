import { Image } from '@/components/ui/image';
import { View } from '@/components/ui/view';

/**
 * The 3D artwork used by empty and signed-out states.
 *
 * A name union mapped to `require()`d sources, rather than a `source` prop, for
 * two reasons. Metro resolves `require()` of an asset statically at build time —
 * a runtime-built path silently resolves to nothing — and keeping the paths in
 * one file means call sites never spell a filename, so renaming the art is a
 * one-file change instead of a grep.
 *
 * Relative paths on purpose. `@/assets/*` is mapped in tsconfig, but tsconfig
 * `paths` configure the TYPE CHECKER; Metro learns them from Expo's
 * metro-config, and an asset require that resolves for tsc and not for Metro
 * fails as a red box on device — after typecheck, lint and CI have all passed.
 */
const SOURCES = {
  lock: require('../../../assets/illustrations/3d-lock.png'),
  heart: require('../../../assets/illustrations/3d-heart.png'),
  bell: require('../../../assets/illustrations/3d-bell.png'),
};

export type IllustrationName = keyof typeof SOURCES;

export type IllustrationProps = {
  name: IllustrationName;
  /** Rendered square. Defaults to the size the empty states use. */
  size?: number;
  /**
   * Omit for decorative art. These sit directly above a heading that already
   * says the same thing, so announcing them would make a screen reader repeat
   * itself — the art is redundant by design, which is exactly when it should
   * stay out of the accessibility tree.
   */
  accessibilityLabel?: string;
  testID?: string;
};

export function Illustration({ name, size = 140, accessibilityLabel, testID }: IllustrationProps) {
  const labelled = accessibilityLabel !== undefined;

  return (
    <View
      importantForAccessibility={labelled ? 'yes' : 'no-hide-descendants'}
      accessible={labelled}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      <Image
        source={SOURCES[name]}
        style={{ width: size, height: size }}
        contentFit="contain"
        // The files are a single 500px master with no @2x/@3x siblings, so this
        // is always a downscale. Fine for illustration art; it would not be for
        // an icon, which is why those are vectors.
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  );
}
