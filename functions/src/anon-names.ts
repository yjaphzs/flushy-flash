/**
 * Display names for deleted accounts.
 *
 * A deleted user's restrooms and reviews stay on the map — one person leaving
 * should not blank out pins everyone else relies on — but the author link is
 * severed. Rendering that as "null" or "Unknown user" reads like a bug, so the
 * account gets a name instead.
 *
 * Keep the tone dry and restroom-adjacent, matching the app's voice
 * ("Don't hold it — find it.").
 *
 * ## Three that are deliberately NOT here
 *
 * - **"Out of Order"** collides with `RestroomStatus.out_of_order`, which is
 *   rendered as a status chip on the restroom detail. An author named after a
 *   status reads as a rendering bug.
 * - **"Vacant" / "Occupied"** are reserved by the planned RTDB live-status
 *   vocabulary (`LiveReport` in src/lib/types.ts).
 * - **"Ran Out of Tissue"** reads as a complaint about the restroom, not a
 *   name — `hasTissue` is a real amenity field.
 */
export const ANON_NAMES = [
  'Washed Away',
  'Flushed Away',
  'Faded into the Ether',
  'Erased in a Flash',
  'Left in the Wind',
  'Down the Drain',
  'Circled the Drain',
  'Rinsed Clean',
  'Wiped Clean',
  'Gone to the Lagoon',
  'Left the Building',
  'Off the Map',
  "Didn't Hold It",
  'Swirled Off',
  'Dried Up',
  'One Last Flush',
  'Left No Trace',
  'Last Seen Heading Out',
] as const;

/**
 * Picks a name from a stable id.
 *
 * **Deterministic, not random**, and that is the whole point. `Math.random()`
 * would hand the same ghost a different name on every call — so a re-run of the
 * purge, or any future code that needs to render a name without reading the
 * tombstone, would disagree with what is already stored. Hashing the id also
 * means two different deleted users read as two different ghosts rather than a
 * wall of identical names.
 *
 * A plain char-code fold: this picks a label, it is not a security primitive,
 * and pulling in a hash dependency for it would be silly.
 */
export function anonName(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return ANON_NAMES[Math.abs(h) % ANON_NAMES.length];
}
