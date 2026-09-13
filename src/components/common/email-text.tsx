import { Text, type TextProps } from '@/components/ui/text';
import { CLSU_EMAIL_DOMAINS, CLSU_PRIMARY_DOMAIN } from '@/lib/campus';

/**
 * Email addresses and the campus domain, tinted.
 *
 * ## Why `text-link` and not `text-accent`
 *
 * The brand colour is too light to carry small text. Measured against the real
 * composited surfaces, `text-accent` is 4.28:1 on the light background and
 * **3.53:1 on a dark card** — failing AA in three of the four places these runs
 * appear. `--link` is the same brand hue (164.26) at a per-scheme lightness and
 * measures 6.75–13.06 everywhere. `global.css` already says as much where
 * `--link` is defined; this is the component that stops every call site
 * rediscovering it.
 *
 * ## Why these take `type` and `weight`
 *
 * A nested `<Text>` does **not** inherit the outer run's typography. HeroUI's
 * Text applies its own `type` default of `body` whenever it renders, so a tinted
 * run dropped into a `body-sm` sentence silently jumps a size and breaks the
 * line. Both props are therefore required at every call site, and must match the
 * sentence they sit inside.
 */
type RunProps = {
  /** Must match the surrounding sentence — see above. */
  type?: TextProps['type'];
  weight?: TextProps['weight'];
  className?: string;
};

function tint(className?: string) {
  return `text-link${className ? ` ${className}` : ''}`;
}

/** A user's actual address, e.g. `yjaphzs@gmail.com`. */
export function EmailAddress({
  email,
  type = 'body-sm',
  weight,
  className,
}: RunProps & { email: string }) {
  return (
    <Text type={type} weight={weight} className={tint(className)}>
      {email}
    </Text>
  );
}

/**
 * ONE campus domain as people write it: `@clsu.edu.ph`.
 *
 * The `@` is rendered HERE, inside the tinted run, rather than left to the call
 * site: the constants are bare domains, so every call site would write its own
 * sigil, and tinting only the domain leaves a grey `@` welded to a green
 * address.
 *
 * ⚠️ **This is the PRIMARY domain, not the whole list**, and that is why most
 * copy no longer names a domain at all. There are two now, and "a
 * @clsu.edu.ph or @clsu2.edu.ph address" does not survive being dropped into a
 * sentence — so the sentences say "a CLSU address" and `CampusDomains` lists
 * them once, on Settings, where the detail belongs.
 */
export function CampusDomain({ type = 'body-sm', weight, className }: RunProps) {
  return (
    <Text type={type} weight={weight} className={tint(className)}>
      @{CLSU_PRIMARY_DOMAIN}
    </Text>
  );
}

/**
 * Every campus domain, joined for prose: `@clsu.edu.ph or @clsu2.edu.ph`.
 *
 * Deliberately NOT a drop-in for `CampusDomain` — it reads as a list and only
 * fits where a list is expected. Built from the constant rather than written
 * out, so adding a third domain does not leave a stale sentence behind.
 */
export function CampusDomains({ type = 'body-sm', weight, className }: RunProps) {
  return (
    <Text type={type} weight={weight} className={tint(className)}>
      {CLSU_EMAIL_DOMAINS.map((d) => `@${d}`).join(' or ')}
    </Text>
  );
}
