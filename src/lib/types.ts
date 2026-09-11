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
  babyChanging: boolean | null;
  genderedAs: GenderedAs | null;
};

export type Restroom = {
  id: string;
  buildingId: string;
  /** Ground floor is 1, matching PH convention. */
  floor: number;
  /** "Near the east stairwell" — how people actually find it indoors. */
  locationNote: string;
  amenities: Amenities;
  status: RestroomStatus;
  /** Aggregates: readable by all, writable by none (see firestore.rules). */
  ratingSum: number;
  ratingCount: number;
  photoCount: number;
  /** Set true only by a verified student or admin. */
  verified: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type Review = {
  /** Composite `${restroomId}_${uid}` — one review per user per restroom, enforced in rules. */
  id: string;
  restroomId: string;
  buildingId: string;
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
  handle: string;
  displayName: string;
  photoURL: string | null;
  /** Mirror of the auth token's claims; rules require the two to agree. */
  verifiedStudent: boolean;
  reviewCount: number;
  followerCount: number;
  followingCount: number;
  createdAt: Timestamp;
};

/** Live, ephemeral status. Realtime Database, not Firestore. */
export type LiveReport = {
  restroomId: string;
  status: RestroomStatus;
  note: string | null;
  reportedBy: string;
  reportedAt: number;
};

/** A restroom joined to its building — what list and map screens actually render. */
export type RestroomWithBuilding = Restroom & {
  building: Pick<Building, 'id' | 'name' | 'code'>;
  /** Metres from the user's last fix; null when location is unavailable. */
  distanceM: number | null;
};
