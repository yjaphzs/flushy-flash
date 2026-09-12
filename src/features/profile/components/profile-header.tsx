import { BrandGradient } from '@/components/common/gradient';
import { EmailAddress } from '@/components/common/email-text';
import { useTopInset } from '@/components/layouts/tab-bar-metrics';
import { Icon } from '@/components/ui/icon';
import { Image } from '@/components/ui/image';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { StudentBadge } from '@/features/profile/components/student-badge';

/** Diameter of the avatar, and half of it is how far it hangs off the band. */
const AVATAR = 96;

/** Gradient below the status bar. The avatar's centre sits on its lower edge. */
const BAND = 108;

/** Width of the ring that separates the avatar from the gradient behind it. */
const RING = 4;

export type ProfileHeaderProps = {
  displayName: string | null;
  handle: string | null;
  email: string | null;
  photoURL: string | null;
};

/**
 * The curved brand band, the avatar straddling it, and the identity under it.
 *
 * ⚠️ **The name is deliberately BELOW the gradient, not on it.** Measured
 * white-on-stop for the brand ramp: anchor #00694C is 6.72:1, but `from`
 * #008F6A is **4.09:1**, `via` **2.16:1** and `to` **1.55:1** — so in light
 * mode only the anchor carries white text at all, and the anchor is not part of
 * the decorative ramp (§14). Putting a name on this band would mean either a
 * fourth gradient variant flattened almost to a solid, or white text failing AA
 * on two of its three stops. The band stays decorative and the text sits on
 * `--background`, where it is 15:1 and the palette question does not arise.
 *
 * Dark mode has the opposite problem and no constraint: that ramp descends to
 * near-black, so every stop measures 8.74:1 or better.
 *
 * ⚠️ **Do not swap this to the scheme-independent `--nav-*` ramp** to keep the
 * band vivid in dark mode. It is tempting — dark mode fades this to a soft
 * vignette and the curve all but disappears — but the band runs UNDER THE
 * STATUS BAR, whose text the OS paints to match the scheme. Measured on device:
 * light mode is black on #00926C at **5.33:1** ✓, while a vivid band in dark
 * mode would be white on the same colour at **3.94:1** ✗. Following the scheme
 * is what keeps the status bar legible in both.
 */
export function ProfileHeader({ displayName, handle, email, photoURL }: ProfileHeaderProps) {
  const topInset = useTopInset();

  return (
    <View className="items-center">
      {/*
        `overflow-hidden` on a wrapper rather than a radius on the gradient
        itself: BrandGradient renders an SVG that fills its parent and takes no
        radius of its own, so the corner has to be clipped by the box around it.
      */}
      <View
        className="absolute left-0 right-0 top-0 overflow-hidden"
        style={{
          height: topInset + BAND,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
          borderCurve: 'continuous',
        }}
        pointerEvents="none"
      >
        <BrandGradient variant="brand" />
      </View>

      {/*
        Built from primitives, not `ui/avatar`. heroui's Avatar caps at 64pt
        (`lg`) and its root is `radius-4xl` rather than a circle, so an
        overlapping 96pt disc cannot be expressed through it at all.

        The ring is `--background`, so the avatar reads as punched out of the
        page rather than outlined on top of the gradient.
      */}
      <View style={{ marginTop: topInset + BAND - AVATAR / 2 }}>
        <View
          className="items-center justify-center rounded-full bg-background"
          style={{ padding: RING }}
        >
          <View
            className="items-center justify-center overflow-hidden rounded-full bg-default"
            style={{ width: AVATAR, height: AVATAR }}
          >
            {photoURL ? (
              <Image
                source={{ uri: photoURL }}
                style={{ width: AVATAR, height: AVATAR }}
                contentFit="cover"
                cachePolicy="memory-disk"
                accessibilityLabel="Your profile photo"
              />
            ) : (
              <Icon name="user-round" size={44} color="muted" />
            )}
          </View>
        </View>
      </View>

      <View className="mt-3 items-center gap-1">
        <Text type="h2" weight="bold" align="center">
          {displayName ?? 'Student'}
        </Text>

        {/*
          The reference shows a phone number here. ⚠️ **This app stores no phone
          number anywhere**, so the honest stand-in is the identifier people
          actually pick during sign-up. Falls back to the address, through
          `email-text` so it is `text-link` and not `text-accent`, which fails AA
          as body text (§14).
        */}
        {handle ? (
          <Text type="body-sm" color="muted">
            @{handle}
          </Text>
        ) : email ? (
          <EmailAddress email={email} />
        ) : null}
      </View>

      <View className="mt-3">
        <StudentBadge />
      </View>
    </View>
  );
}
