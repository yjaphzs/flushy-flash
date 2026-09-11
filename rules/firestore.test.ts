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

function restroomDoc(overrides: Record<string, unknown> = {}) {
  return {
    buildingId: BUILDING_ID,
    floor: 1,
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
  });
});

describe('unauthenticated access', () => {
  it('denies reading restrooms while signed out', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'restrooms', RESTROOM_ID)));
  });

  it('allows reading handles while signed out, so sign-up can check availability', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'handles', 'someone')));
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
