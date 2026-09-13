// RNFirebase v26 is modular-first: these are plain type exports, not a namespace.
import type { GeoPoint, Timestamp } from '@react-native-firebase/firestore';

/** A campus building. Seeded from OpenStreetMap; admin-writable only. */
export type Building = {
  id: string;
  name: string;
  /** Short code students actually say out loud, e.g. "CASE". */
  code: string | null;
  /** Alternative spellings so search finds it despite OSM's inconsistencies. */
  aliases: string[];
  location: GeoPoint;
  /** OSM element id (`way/123456`) so a re-seed can reconcile instead of duplicate. */
  osmId: string | null;
  /** Denormalised counter; not client-writable. */
  restroomCount: number;
  createdAt: Timestamp;
};

export type RestroomStatus = 'ok' | 'out_of_order' | 'closed';
export type GenderedAs = 'male' | 'female' | 'unisex' | 'accessible_only';

/** The amenities students actually decide on. All optional-unknown, not false-by-default. */
export type Amenities = {
  isFree: boolean | null;
  hasWater: boolean | null;
  hasTissue: boolean | null;
  hasBidet: boolean | null;
  accessible: boolean | null;
  genderedAs: GenderedAs | null;
};

export type Restroom = {
  id: string;
  /**
   * Where the pin sits, placed by hand on the map when submitting.
   *
   * This reverses an earlier decision that restrooms carried no geometry, whose
   * reasoning was that indoor GPS is floor-blind. That is still true — which is
   * exactly why this is a PLACED point rather than a captured fix. A person
   * standing at the door knows where the door is; the phone does not.
   * `firestore.rules` clamps it to the campus bounding box.
   */
  location: GeoPoint;
  /**
   * The seeded OSM building this sits in, when there is one. Suggested from the
   * pin and editable.
   *
   * Nullable, because the pin is now the source of truth for WHERE: a restroom
   * beside the lagoon, or in a structure OSM never mapped, is still a real
   * restroom. Buildings are a label now, not a container.
   */
  buildingId: string | null;
  /** Ground floor is 1, matching PH convention. */
  floor: number;
  /** The nearest thing a stranger would recognise, e.g. "CLSU Lagoon". */
  landmark: string;
  /** "Near the east stairwell" — how people actually find it indoors. */
  locationNote: string;
  /**
   * Storage object paths under `restrooms/{id}/`, max 6 — NOT download URLs,
   * which expire and would bloat the document.
   *
   * Deliberately a client-written list rather than the `photoCount` beside it:
   * that aggregate is pinned to 0 by the rules and can only ever be moved by a
   * Cloud Function, which this project does not have. Anything showing a count
   * reads `photoIds.length`.
   */
  photoIds: string[];
  amenities: Amenities;
  status: RestroomStatus;
  /** Aggregates: readable by all, writable by none (see firestore.rules). */
  ratingSum: number;
  ratingCount: number;
  photoCount: number;
  /**
   * Promoted by the community, never by a client.
   *
   * ⚠️ **Server-only now.** It used to be settable by any verified student —
   * on any restroom, not just their own — and nothing ever set it. It is now
   * the OUTPUT of counting `restroomVotes`: `trustScore >= 2`, written by
   * `onVoteWritten`, and pinned against every client write in the rules.
   */
  verified: boolean;
  /** Distinct users who said they found it. Aggregate: server-written. */
  confirmCount: number;
  /** Distinct users who said it is not there. Aggregate: server-written. */
  reportCount: number;
  /**
   * Weighted confirmations: `2 × admin + 1 × verified student`.
   *
   * The weighting is what lets one admin verify a restroom alone while two
   * students are needed otherwise — which is the only reason the map can be
   * bootstrapped at all before anyone has confirmed a @clsu.edu.ph address.
   * A confirmation from an ordinary signed-in account is recorded and shown
   * but scores zero, because three throwaway Google accounts must not be
   * able to verify a fake.
   */
  trustScore: number;
  /**
   * When the community reported it into hiding, or null.
   *
   * ⚠️ Deliberately NOT a fourth value on `status`. That field is the
   * restroom's real-world condition — `nearest.ts` filters on it and
   * `StatusChip` renders it — and whether a toilet works is orthogonal to
   * whether anyone believes it exists. A scheduled function deletes the
   * document seven days after this is set.
   */
  hiddenAt: Timestamp | null;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type Review = {
  /** Composite `${restroomId}_${uid}` — one review per user per restroom, enforced in rules. */
  id: string;
  restroomId: string;
  /**
   * Denormalised from the restroom at create time, and NULLABLE because a
   * restroom's is — one beside the lagoon belongs to no building. Typing it
   * `string` here would have pushed a null through the `as Review` cast
   * silently.
   *
   * ⚠️ **It must be WRITTEN even when null.** `unchanged()` in firestore.rules
   * is `diff().unchangedKeys().hasAll([...])`, and `unchangedKeys()` only
   * contains keys present in BOTH maps — so a create that omits `buildingId`
   * makes every future edit of that review permanently denied.
   *
   * Because the rules pin it, it stays whatever it was: re-snapping the
   * restroom to another building later leaves this copy stale. That is required
   * by the rules, not a bug.
   */
  buildingId: string | null;
  authorId: string;
  /** 1–5, validated server-side. */
  rating: number;
  cleanliness: number;
  text: string;
  photoIds: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type UserProfile = {
  id: string;
  /**
   * Null on a deleted account's tombstone, which has no handle — the purge
   * FREES it rather than reserving it, because a handle is usually the
   * student's own name and keeping it would retain exactly the identifier the
   * deletion was asked to sever.
   */
  handle: string | null;
  /**
   * On a tombstone this is the whimsical placeholder the Cloud Function chose
   * (`functions/src/anon-names.ts`). Read from the document rather than
   * regenerated on the client, so there is one list and it cannot drift.
   */
  displayName: string;
  photoURL: string | null;
  /** Mirror of the auth token's claims; rules require the two to agree. */
  verifiedStudent: boolean;
  reviewCount: number;
  followerCount: number;
  followingCount: number;
  /**
   * Restrooms this account has added that the community has not verified.
   *
   * The contribution cap reads this: at `pendingCap()` (3) the rules refuse
   * another create. Verified restrooms do not count, so the slot comes back
   * when the community vouches for one. Server-written, like the counters
   * above, and absent from every profile written before it existed — which is
   * why both the rules and the client default it rather than reading it.
   */
  pendingRestroomCount: number;
  /** Set only on a tombstone, by the account-deletion function. */
  deleted?: boolean;
  createdAt: Timestamp;
};

/**
 * A saved restroom. Composite id `${uid}_${restroomId}` makes "one like per user
 * per restroom" structural rather than something a query has to police.
 *
 * Owner-scoped in firestore.rules, unlike restrooms and reviews: what a person
 * saved is behavioural data with no public purpose. There is deliberately no
 * public `likeCount` on Restroom either — that would need both a server-
 * maintained counter and an open read rule.
 */
export type Like = {
  id: string;
  userId: string;
  restroomId: string;
  createdAt: Timestamp;
};

/**
 * Live, ephemeral status. Realtime Database, not Firestore.
 *
 * Unused so far, and kept deliberately rather than swept up with the other dead
 * types: `rtdb` is already initialised in lib/firebase.ts and AGENTS.md lists
 * live status as a roadmap item, so this is the recorded SHAPE of a planned
 * feature, not leftover scaffolding. Deleting it would throw away the design and
 * keep the wiring.
 */
export type LiveReport = {
  restroomId: string;
  status: RestroomStatus;
  note: string | null;
  reportedBy: string;
  reportedAt: number;
};

