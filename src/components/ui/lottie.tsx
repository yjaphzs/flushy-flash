import LottieView from 'lottie-react-native';

import { Spinner } from '@/components/ui/spinner';
import { useReducedMotion } from '@/components/ui/motion';
import { View } from '@/components/ui/view';

/**
 * Lottie animations, and the only place `lottie-react-native` is named.
 *
 * ## Why these are .json and not .lottie
 *
 * `assets/animations/searching.lottie` is a genuine dotLottie — a ZIP container
 * (`PK\x03\x04`) holding a manifest plus the animation JSON. Two problems with
 * using it directly: Metro does not bundle `.lottie` without an `assetExts`
 * entry, and lottie-react-native's API documents ONLY JSON sources and never
 * mentions dotLottie, so support would be an assumption whose failure mode is a
 * blank box at runtime rather than a build error.
 *
 * So the inner animation is extracted to `searching.json` and the `.lottie` is
 * kept beside it as the source artefact — the same arrangement
 * `assets/brand/flushy-flash.svg` has with the logo transcribed into
 * `brand-mark.tsx`. Regenerate with:
 *
 *   python -c "import zipfile,json,io; z=zipfile.ZipFile('assets/animations/searching.lottie'); \
 *     n=[x for x in z.namelist() if x.startswith('animations/')][0]; \
 *     io.open('assets/animations/searching.json','w',newline='\n').write(json.dumps(json.loads(z.read(n)),separators=(',',':')))"
 *
 * Relative `require()` paths, like illustration.tsx: `@/assets/*` is a tsconfig
 * alias the TYPE CHECKER honours and Metro does not.
 */
const SOURCES = {
  searching: require('../../../assets/animations/searching.json'),
};

export type LottieName = keyof typeof SOURCES;

export type LottieProps = {
  name: LottieName;
  size?: number;
  /** Plays on a loop by default — these are waiting states. */
  loop?: boolean;
  testID?: string;
};

export function Lottie({ name, size = 160, loop = true, testID }: LottieProps) {
  const reduced = useReducedMotion();

  /**
   * Reduce Motion is honoured by substituting the spinner, not by freezing the
   * animation on frame 0 — a 9-layer illustration stopped dead reads as a
   * broken image, whereas a spinner reads as "working". AGENTS.md §3 makes
   * honouring the setting mandatory, and a looping full-screen animation is
   * exactly what it exists to suppress.
   */
  if (reduced) {
    return (
      <View className="items-center justify-center" style={{ width: size, height: size }} testID={testID}>
        <Spinner />
      </View>
    );
  }

  return (
    <LottieView
      source={SOURCES[name]}
      autoPlay
      loop={loop}
      style={{ width: size, height: size }}
      testID={testID}
    />
  );
}
