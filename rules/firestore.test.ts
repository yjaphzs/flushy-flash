/**
 * Security rules attack matrix.
 *
 * These are the tests AGENTS.md §7 says must exist before real students use the
 * app. The rules are the actual security boundary — everything else is a
 * convenience — so this suite is written adversarially: each case is an attack
 * that MUST be denied, not a happy path that should work.
 *
 * Run against the emulator:  npm run test:rules
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  GeoPoint,
} from 'firebase/firestore';

const PROJECT_ID = 'flushy-flash-rules-test';

const ALICE = 'alice-uid';
const BOB = 'bob-uid';

/** A verified CLSU student: email verified AND on the campus domain. */
const clsuStudent = { email: 'alice@clsu.edu.ph', email_verified: true };
/** Verified, but not a CLSU address — must NOT earn the badge. */
const outsider = { email: 'bob@gmail.com', email_verified: true };
/** CLSU address that has not been confirmed — must NOT earn the badge either. */
const unverifiedStudent = { email: 'carol@clsu.edu.ph', email_verified: false };

let testEnv: RulesTestEnvironment;

const BUILDING_ID = 'administration-building';
const RESTROOM_ID = 'restroom-1';

/** Inside CAMPUS_BOUNDS — the Administration Building, same point as the fixture. */
const ON_CAMPUS = new GeoPoint(15.7313583, 120.9302984);
/** Rizal Park, Manila. Comfortably outside the bounding box. */
const OFF_CAMPUS = new GeoPoint(14.5826, 120.9787);

/** N storage object paths, for exercising the photo cap. */
function photoPaths(n: number) {
  return Array.from({ length: n }, (_, i) => `restrooms/${RESTROOM_ID}/p${i}.webp`);
}

function restroomDoc(overrides: Record<string, unknown> = {}) {
  return {
    location: ON_CAMPUS,
    buildingId: BUILDING_ID,
    floor: 1,
    landmark: 'CLSU Lagoon',
    photoIds: [],
    locationNote: 'Near the east stairwell',
    amenities: {
      isFree: true,
      hasWater: true,
      hasTissue: null,
      hasBidet: null,
      accessible: null,
      babyChanging: null,
      genderedAs: null,
    },
    status: 'ok',
    ratingSum: 0,
    ratingCount: 0,
    photoCount: 0,
    verified: false,
    createdBy: ALICE,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

function reviewDoc(overrides: Record<string, unknown> = {}) {
  return {
    restroomId: RESTROOM_ID,
    buildingId: BUILDING_ID,
    authorId: ALICE,
    rating: 4,
    cleanliness: 3,
    text: 'Clean enough between classes.',
    photoIds: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

function profileDoc(overrides: Record<string, unknown> = {}) {
  return {
    handle: 'alice',
    displayName: 'Alice',
    photoURL: null,
    verifiedStudent: false,
    reviewCount: 0,
    followerCount: 0,
    followingCount: 0,
    createdAt: serverTimestamp(),
    ...overrides,
  };
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      // Resolved from this file, not cwd: the suite runs with cwd=rules/.
      rules: readFileSync(resolve(__dirname, '..', 'firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8181,
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();

  // Seed the fixtures the rules reference (buildings must exist for a restroom
  // create to pass its exists() check).
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'buildings', BUILDING_ID), {
      name: 'Administration Building',
      code: null,
      aliases: [],
      location: new GeoPoint(15.7313583, 120.9302984),
      osmId: 'way/451771252',
      restroomCount: 0,
      createdAt: new Date(),
    });
    await setDoc(doc(db, 'restrooms', RESTROOM_ID), {
      ...restroomDoc(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Every create path now goes through hasProfile(), which requires
    // users/{uid} to exist. Without these the whole write half of this suite
    // would fail, and for the wrong reason.
    await setDoc(doc(db, 'users', ALICE), { ...profileDoc(), createdAt: new Date() });
    await setDoc(doc(db, 'users', BOB), {
      ...profileDoc({ handle: 'bob', displayName: 'Bob' }),
      createdAt: new Date(),
    });
  });
});

describe('unauthenticated access', () => {
  // The app is guest-first: someone opens it and gets a working map before any
  // account exists. These are that promise, written as tests. The previous
  // version of this block asserted the exact opposite for restrooms.
  it('allows reading buildings while signed out', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'buildings', BUILDING_ID)));
  });

  it('allows reading restrooms while signed out', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'restrooms', RESTROOM_ID)));
  });

  it('allows reading reviews while signed out', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'reviews', RESTROOM_ID + '_' + ALICE)));
  });

  it('allows reading a public user profile while signed out', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'users', ALICE)));
  });

  it('allows reading handles while signed out, so sign-up can check availability', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'handles', 'someone')));
  });

  // ...and these are the boundary that makes the reads above safe to open.
  it('denies reading private user data while signed out', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'users', ALICE, 'private', 'contact')));
  });

  it('denies reading the follow graph while signed out', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'follows', ALICE + '_' + BOB)));
  });

  it('denies reading who liked what while signed out', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'likes', ALICE + '_' + RESTROOM_ID)));
  });

  it('denies writing a restroom while signed out', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, 'restrooms', 'guest-1'), restroomDoc()));
  });

  it('denies writing a review while signed out', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, 'reviews', RESTROOM_ID + '_guest'), reviewDoc()));
  });

  it('denies claiming a handle while signed out', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, 'handles', 'guest'), { uid: 'guest', createdAt: new Date() }));
  });

  it('still denies anything outside the named collections', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'secrets', 'anything')));
  });
});

describe('accounts without a profile', () => {
  // The gap between "authenticated" and "finished onboarding". hasProfile() is
  // what makes the client's canWrite capability a real boundary rather than a
  // convention the UI happens to follow.
  const GHOST = 'ghost-uid';

  it('denies creating a restroom before the profile exists', async () => {
    const db = testEnv.authenticatedContext(GHOST, clsuStudent).firestore();
    await assertFails(setDoc(doc(db, 'restrooms', 'ghost-1'), restroomDoc({ createdBy: GHOST })));
  });

  it('denies creating a review before the profile exists', async () => {
    const db = testEnv.authenticatedContext(GHOST, clsuStudent).firestore();
    await assertFails(
      setDoc(doc(db, 'reviews', RESTROOM_ID + '_' + GHOST), reviewDoc({ authorId: GHOST })),
    );
  });

  it('denies liking a restroom before the profile exists', async () => {
    const db = testEnv.authenticatedContext(GHOST, clsuStudent).firestore();
    await assertFails(
      setDoc(doc(db, 'likes', GHOST + '_' + RESTROOM_ID), {
        userId: GHOST,
        restroomId: RESTROOM_ID,
        createdAt: serverTimestamp(),
      }),
    );
  });
});

describe('likes', () => {
  function likeDoc(overrides: Record<string, unknown> = {}) {
    return {
      userId: ALICE,
      restroomId: RESTROOM_ID,
      createdAt: serverTimestamp(),
      ...overrides,
    };
  }

  async function seedAliceLike() {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'likes', ALICE + '_' + RESTROOM_ID), {
        ...likeDoc(),
        createdAt: new Date(),
      });
    });
  }

  it('allows a user with a profile to like a real restroom', async () => {
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertSucceeds(setDoc(doc(db, 'likes', ALICE + '_' + RESTROOM_ID), likeDoc()));
  });

  it('denies a like whose document id does not match the author', async () => {
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertFails(setDoc(doc(db, 'likes', BOB + '_' + RESTROOM_ID), likeDoc({ userId: BOB })));
  });

  it('denies liking on behalf of someone else', async () => {
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertFails(setDoc(doc(db, 'likes', ALICE + '_' + RESTROOM_ID), likeDoc({ userId: BOB })));
  });

  it('denies liking a restroom that does not exist', async () => {
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertFails(setDoc(doc(db, 'likes', ALICE + '_ghost'), likeDoc({ restroomId: 'ghost' })));
  });

  it('rejects an unknown field', async () => {
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertFails(
      setDoc(doc(db, 'likes', ALICE + '_' + RESTROOM_ID), likeDoc({ note: 'sneaky' })),
    );
  });

  it('never allows an update - unliking is a delete', async () => {
    await seedAliceLike();
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertFails(updateDoc(doc(db, 'likes', ALICE + '_' + RESTROOM_ID), { restroomId: 'x' }));
  });

  it('allows a user to remove their own like', async () => {
    await seedAliceLike();
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertSucceeds(deleteDoc(doc(db, 'likes', ALICE + '_' + RESTROOM_ID)));
  });

  it('denies reading another users likes - saved lists are private', async () => {
    await seedAliceLike();
    const db = testEnv.authenticatedContext(BOB, outsider).firestore();
    await assertFails(getDoc(doc(db, 'likes', ALICE + '_' + RESTROOM_ID)));
  });

  it('denies deleting another users like', async () => {
    await seedAliceLike();
    const db = testEnv.authenticatedContext(BOB, outsider).firestore();
    await assertFails(deleteDoc(doc(db, 'likes', ALICE + '_' + RESTROOM_ID)));
  });
});

describe('restrooms', () => {
  it('allows a signed-in user to add a restroom to a real building', async () => {
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertSucceeds(setDoc(doc(db, 'restrooms', 'new-1'), restroomDoc()));
  });

  it('denies creating one in a building that does not exist', async () => {
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertFails(
      setDoc(doc(db, 'restrooms', 'new-2'), restroomDoc({ buildingId: 'no-such-building' })),
    );
  });

  it('denies claiming authorship as someone else', async () => {
    const db = testEnv.authenticatedContext(BOB, outsider).firestore();
    await assertFails(setDoc(doc(db, 'restrooms', 'new-3'), restroomDoc({ createdBy: ALICE })));
  });

  it('denies seeding non-zero aggregates at create time', async () => {
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertFails(
      setDoc(doc(db, 'restrooms', 'new-4'), restroomDoc({ ratingSum: 50, ratingCount: 10 })),
    );
  });

  it('denies self-granting verified status at create time', async () => {
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertFails(setDoc(doc(db, 'restrooms', 'new-5'), restroomDoc({ verified: true })));
  });

  // The single most important aggregate test: if this passes, anyone can inflate
  // a restroom's rating without writing a review.
  it('denies writing ratingSum directly', async () => {
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertFails(updateDoc(doc(db, 'restrooms', RESTROOM_ID), { ratingSum: 999 }));
  });

  it('denies writing ratingCount directly', async () => {
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertFails(updateDoc(doc(db, 'restrooms', RESTROOM_ID), { ratingCount: 999 }));
  });

  it('denies polluting the document with an unknown field', async () => {
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertFails(updateDoc(doc(db, 'restrooms', RESTROOM_ID), { isAdmin: true }));
  });

  it('denies an invalid status value', async () => {
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertFails(updateDoc(doc(db, 'restrooms', RESTROOM_ID), { status: 'on_fire' }));
  });

  it('denies a non-verified outsider marking a restroom verified', async () => {
    const db = testEnv.authenticatedContext(BOB, outsider).firestore();
    await assertFails(updateDoc(doc(db, 'restrooms', RESTROOM_ID), { verified: true }));
  });

  it('allows a verified CLSU student to mark a restroom verified', async () => {
    const db = testEnv.authenticatedContext(BOB, clsuStudent).firestore();
    await assertSucceeds(updateDoc(doc(db, 'restrooms', RESTROOM_ID), { verified: true }));
  });

  it('allows a restroom with no building — a pin beside the lagoon', async () => {
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'restrooms', 'restroom-outdoors'), restroomDoc({ buildingId: null })),
    );
  });

  it('denies naming a building that does not exist', async () => {
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertFails(
      setDoc(doc(db, 'restrooms', 'restroom-2'), restroomDoc({ buildingId: 'no-such-building' })),
    );
  });

  // The pin is attacker-controlled, unlike the admin-seeded building points.
  it('denies a pin outside the campus bounding box', async () => {
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertFails(
      setDoc(doc(db, 'restrooms', 'restroom-2'), restroomDoc({ location: OFF_CAMPUS })),
    );
  });

  it('denies creating a restroom with no location at all', async () => {
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    const { location: _omitted, ...noLocation } = restroomDoc();
    await assertFails(setDoc(doc(db, 'restrooms', 'restroom-2'), noLocation));
  });

  it('denies moving an existing pin off campus', async () => {
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertFails(updateDoc(doc(db, 'restrooms', RESTROOM_ID), { location: OFF_CAMPUS }));
  });

  it('denies more than five photos', async () => {
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertFails(
      setDoc(doc(db, 'restrooms', 'restroom-2'), restroomDoc({ photoIds: photoPaths(6) })),
    );
  });

  it('allows up to five photos', async () => {
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'restrooms', 'restroom-2'), restroomDoc({ photoIds: photoPaths(5) })),
    );
  });

  // photoIds is client-written; photoCount is NOT, and the delete rule keys off
  // it. Recording photos must never move the aggregate.
  it('denies bumping photoCount alongside photoIds', async () => {
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertFails(
      updateDoc(doc(db, 'restrooms', RESTROOM_ID), {
        photoIds: [`restrooms/${RESTROOM_ID}/p0.jpg`],
        photoCount: 1,
      }),
    );
  });

  it('denies a landmark longer than the cap', async () => {
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertFails(
      setDoc(doc(db, 'restrooms', 'restroom-2'), restroomDoc({ landmark: 'x'.repeat(81) })),
    );
  });

  it('denies deleting a restroom that already has reviews', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'restrooms', RESTROOM_ID), { ratingCount: 3 });
    });
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertFails(deleteDoc(doc(db, 'restrooms', RESTROOM_ID)));
  });
});

describe('reviews', () => {
  const aliceReview = `${RESTROOM_ID}_${ALICE}`;

  it('allows an author to write their own review at the composite id', async () => {
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertSucceeds(setDoc(doc(db, 'reviews', aliceReview), reviewDoc()));
  });

  // The review cap had NO coverage at all, which is how it sat at 6 while the
  // restroom cap moved — both now go through isValidPhotoIds().
  it('allows up to five photos on a review', async () => {
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'reviews', aliceReview), reviewDoc({ photoIds: photoPaths(5) })),
    );
  });

  it('denies more than five photos on a review', async () => {
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertFails(
      setDoc(doc(db, 'reviews', aliceReview), reviewDoc({ photoIds: photoPaths(6) })),
    );
  });

  // The composite id IS the uniqueness constraint. If this passes, a user can
  // review the same restroom unlimited times under different document ids.
  it('denies a second review for the same restroom under a different id', async () => {
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertSucceeds(setDoc(doc(db, 'reviews', aliceReview), reviewDoc()));
    await assertFails(setDoc(doc(db, 'reviews', `${RESTROOM_ID}_alice_again`), reviewDoc()));
  });

  it('denies writing a review at another user’s composite id', async () => {
    const db = testEnv.authenticatedContext(BOB, outsider).firestore();
    await assertFails(setDoc(doc(db, 'reviews', aliceReview), reviewDoc({ authorId: BOB })));
  });

  it('denies editing someone else’s review', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'reviews', aliceReview), {
        ...reviewDoc(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
    const db = testEnv.authenticatedContext(BOB, outsider).firestore();
    await assertFails(updateDoc(doc(db, 'reviews', aliceReview), { text: 'hacked' }));
  });

  it('denies an out-of-range rating', async () => {
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertFails(setDoc(doc(db, 'reviews', aliceReview), reviewDoc({ rating: 99 })));
  });

  it('denies a zero rating', async () => {
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertFails(setDoc(doc(db, 'reviews', aliceReview), reviewDoc({ rating: 0 })));
  });

  it('denies a review for a restroom that does not exist', async () => {
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertFails(
      setDoc(doc(db, 'reviews', `ghost_${ALICE}`), reviewDoc({ restroomId: 'ghost' })),
    );
  });

  it('allows an author to delete their own review', async () => {
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertSucceeds(setDoc(doc(db, 'reviews', aliceReview), reviewDoc()));
    await assertSucceeds(deleteDoc(doc(db, 'reviews', aliceReview)));
  });
});

describe('users and the verified-student badge', () => {
  // The global fixture seeds users/{ALICE} and users/{BOB} so every write path
  // can satisfy hasProfile(). This block is about CREATING a profile, so it has
  // to start without one - otherwise setDoc is evaluated as an update and fails
  // on unchanged(['createdAt']) rather than on anything the test is asking about.
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await deleteDoc(doc(ctx.firestore(), 'users', ALICE));
      await deleteDoc(doc(ctx.firestore(), 'users', BOB));
    });
  });

  it('allows creating your own profile', async () => {
    const db = testEnv.authenticatedContext(ALICE, outsider).firestore();
    await assertSucceeds(setDoc(doc(db, 'users', ALICE), profileDoc()));
  });

  it('denies creating a profile for someone else', async () => {
    const db = testEnv.authenticatedContext(BOB, outsider).firestore();
    await assertFails(setDoc(doc(db, 'users', ALICE), profileDoc()));
  });

  // The badge must mirror the token. If these pass, anyone is a "verified
  // student" just by writing true into their own profile.
  it('denies a non-CLSU account self-granting the student badge', async () => {
    const db = testEnv.authenticatedContext(BOB, outsider).firestore();
    await assertFails(setDoc(doc(db, 'users', BOB), profileDoc({ verifiedStudent: true })));
  });

  it('denies an unconfirmed CLSU address self-granting the badge', async () => {
    const db = testEnv.authenticatedContext(ALICE, unverifiedStudent).firestore();
    await assertFails(setDoc(doc(db, 'users', ALICE), profileDoc({ verifiedStudent: true })));
  });

  it('allows a verified CLSU account to hold the badge', async () => {
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertSucceeds(setDoc(doc(db, 'users', ALICE), profileDoc({ verifiedStudent: true })));
  });

  it('denies inflating your own social counters', async () => {
    const db = testEnv.authenticatedContext(ALICE, outsider).firestore();
    await assertSucceeds(setDoc(doc(db, 'users', ALICE), profileDoc()));
    await assertFails(updateDoc(doc(db, 'users', ALICE), { followerCount: 9999 }));
  });

  it('denies changing your handle after creation', async () => {
    const db = testEnv.authenticatedContext(ALICE, outsider).firestore();
    await assertSucceeds(setDoc(doc(db, 'users', ALICE), profileDoc()));
    await assertFails(updateDoc(doc(db, 'users', ALICE), { handle: 'someone_else' }));
  });

  it('denies reading another user’s private subcollection', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'private', 'settings'), {
        email: 'alice@clsu.edu.ph',
      });
    });
    const db = testEnv.authenticatedContext(BOB, outsider).firestore();
    await assertFails(getDoc(doc(db, 'users', ALICE, 'private', 'settings')));
  });

  it('allows reading your own private subcollection', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'private', 'settings'), {
        email: 'alice@clsu.edu.ph',
      });
    });
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertSucceeds(getDoc(doc(db, 'users', ALICE, 'private', 'settings')));
  });
});

describe('buildings are admin-only', () => {
  it('denies a verified student creating a building', async () => {
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertFails(
      setDoc(doc(db, 'buildings', 'fake-hall'), {
        name: 'Fake Hall',
        code: null,
        aliases: [],
        location: new GeoPoint(15.73, 120.93),
        osmId: null,
        restroomCount: 0,
        createdAt: serverTimestamp(),
      }),
    );
  });

  it('denies editing an existing building', async () => {
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertFails(updateDoc(doc(db, 'buildings', BUILDING_ID), { name: 'Renamed' }));
  });

  it('allows an admin to create a building', async () => {
    const db = testEnv.authenticatedContext(ALICE, { ...clsuStudent, admin: true }).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'buildings', 'new-hall'), {
        name: 'New Hall',
        code: null,
        aliases: [],
        location: new GeoPoint(15.73, 120.93),
        osmId: null,
        restroomCount: 0,
        createdAt: serverTimestamp(),
      }),
    );
  });
});

describe('follows', () => {
  it('allows following someone else at the composite id', async () => {
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'follows', `${ALICE}_${BOB}`), {
        followerId: ALICE,
        followeeId: BOB,
        createdAt: serverTimestamp(),
      }),
    );
  });

  it('denies forging a follow edge on behalf of someone else', async () => {
    const db = testEnv.authenticatedContext(BOB, outsider).firestore();
    await assertFails(
      setDoc(doc(db, 'follows', `${ALICE}_${BOB}`), {
        followerId: ALICE,
        followeeId: BOB,
        createdAt: serverTimestamp(),
      }),
    );
  });

  it('denies following yourself', async () => {
    const db = testEnv.authenticatedContext(ALICE, clsuStudent).firestore();
    await assertFails(
      setDoc(doc(db, 'follows', `${ALICE}_${ALICE}`), {
        followerId: ALICE,
        followeeId: ALICE,
        createdAt: serverTimestamp(),
      }),
    );
  });
});

/**
 * Account deletion is a Cloud Function, and these prove WHY.
 *
 * `functions/src/purge-user.ts` runs with admin credentials and bypasses rules
 * entirely. Every case here is a step of that purge attempted from a CLIENT,
 * and every one must be denied — because a rule permissive enough to let a user
 * do this to their own data would let them do it to someone else's, or leave an
 * account half-deleted with no way to finish.
 *
 * The two positives at the end are the read paths the purge leaves behind, and
 * they must keep working or deleted users' contributions render broken.
 */
describe('account deletion stays server-side', () => {
  const ANON = 'anon_7f3k9q2x1m4p';

  it('denies deleting your own profile', async () => {
    const db = testEnv.authenticatedContext(ALICE, outsider).firestore();
    await assertFails(deleteDoc(doc(db, 'users', ALICE)));
  });

  it('denies deleting your own handle', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'handles', 'alice'), {
        uid: ALICE,
        createdAt: serverTimestamp(),
      });
    });
    const db = testEnv.authenticatedContext(ALICE, outsider).firestore();
    await assertFails(deleteDoc(doc(db, 'handles', 'alice')));
  });

  // The tombstone's marker fields. hasOnly(userKeys()) rejects them with no
  // new clause, which is exactly why the tombstone shape was chosen.
  it('denies marking your own profile deleted', async () => {
    const db = testEnv.authenticatedContext(ALICE, outsider).firestore();
    await assertFails(updateDoc(doc(db, 'users', ALICE), { deleted: true }));
  });

  it('denies stamping deletedAt on your own profile', async () => {
    const db = testEnv.authenticatedContext(ALICE, outsider).firestore();
    await assertFails(updateDoc(doc(db, 'users', ALICE), { deletedAt: serverTimestamp() }));
  });

  it('denies re-pointing a review at an anonymous author', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'reviews', `${RESTROOM_ID}_${ALICE}`), reviewDoc());
    });
    const db = testEnv.authenticatedContext(ALICE, outsider).firestore();
    await assertFails(
      updateDoc(doc(db, 'reviews', `${RESTROOM_ID}_${ALICE}`), { authorId: ANON }),
    );
  });

  // The re-key the function performs. A client doing it would be forging a
  // review under an id that is not derived from its own uid.
  it('denies creating a review under an anonymous composite id', async () => {
    const db = testEnv.authenticatedContext(ALICE, outsider).firestore();
    await assertFails(
      setDoc(doc(db, 'reviews', `${RESTROOM_ID}_${ANON}`), reviewDoc({ authorId: ANON })),
    );
  });

  it('denies re-pointing a restroom at an anonymous creator', async () => {
    const db = testEnv.authenticatedContext(ALICE, outsider).firestore();
    await assertFails(updateDoc(doc(db, 'restrooms', RESTROOM_ID), { createdBy: ANON }));
  });

  // isSelf() can never match an anon_ id, so a tombstone is unwritable by
  // construction rather than by a rule someone could relax.
  it('denies a signed-in user writing to a tombstone', async () => {
    const db = testEnv.authenticatedContext(ALICE, outsider).firestore();
    await assertFails(setDoc(doc(db, 'users', ANON), profileDoc({ handle: null })));
  });

  it('denies a signed-out user writing to a tombstone', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, 'users', ANON), profileDoc({ handle: null })));
  });

  // Positive: review cards join authorId -> users/{authorId}. If a tombstone
  // were not publicly readable, every deleted author would render as an error.
  it('allows anyone to read a tombstone', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ANON), {
        ...profileDoc({ handle: null, displayName: 'Washed Away' }),
        deleted: true,
        deletedAt: serverTimestamp(),
      });
    });
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'users', ANON)));
  });

  // Positive: the purge FREES the handle rather than tombstoning it, so it has
  // to be genuinely claimable afterwards. `handles` has allow update: if false,
  // so this only works because the document is really gone.
  it('allows a different account to claim a freed handle', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await deleteDoc(doc(ctx.firestore(), 'handles', 'alice'));
    });
    const db = testEnv.authenticatedContext(BOB, outsider).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'handles', 'alice'), { uid: BOB, createdAt: serverTimestamp() }),
    );
  });
});
