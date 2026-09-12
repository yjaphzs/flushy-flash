import { collection, documentId, getDocs, query, where } from '@react-native-firebase/firestore';

import { COLLECTIONS, db } from '@/lib/firebase';
import { useUsersStore } from '@/stores/users-store';
import type { UserProfile } from '@/lib/types';

/**
 * Firestore's disjunction ceiling for `in`. Not ours — 30 is what the service
 * accepts, and RNFirebase applies no client-side cap of its own.
 */
const CHUNK = 30;

/**
 * Uids currently being fetched.
 *
 * Module-level rather than in the store because it is not state anything
 * renders — it exists so two lists mounting at once do not both request the
 * same author. Without it, opening a restroom while its sheet is still open
 * doubles every read.
 */
const inFlight = new Set<string>();

/**
 * Fills in any author profiles we do not already have.
 *
 * Cost for a screen of 50 reviews: **at most two queries, once per process.**
 * The alternative — one `getDoc` per review — is the literal N+1, repeated on
 * every mount.
 *
 * `users` is `allow read: if true`, so this works for guests too. Never throws:
 * an author that cannot be resolved renders as unknown, which is a worse card
 * but not a broken screen.
 */
export async function ensureAuthors(uids: readonly string[]): Promise<void> {
  const { byId, put } = useUsersStore.getState();
  const wanted = [...new Set(uids)].filter((id) => !(id in byId) && !inFlight.has(id));
  if (wanted.length === 0) return;

  wanted.forEach((id) => inFlight.add(id));

  try {
    for (let i = 0; i < wanted.length; i += CHUNK) {
      const chunk = wanted.slice(i, i + CHUNK);
      const snap = await getDocs(
        query(collection(db, COLLECTIONS.users), where(documentId(), 'in', chunk)),
      );

      // Seed every REQUESTED uid with null first, then overwrite the ones that
      // came back. That is what turns "missing" into a fact rather than a
      // permanent loading state — without it, an author whose document does not
      // exist would show a placeholder forever.
      const entries: Record<string, UserProfile | null> = Object.fromEntries(
        chunk.map((id) => [id, null]),
      );
      for (const d of snap.docs) {
        entries[d.id] = { id: d.id, ...d.data() } as UserProfile;
      }
      put(entries);
    }
  } catch {
    // Leave them unresolved rather than marking them missing: a transient
    // failure should not permanently render real people as unknown.
  } finally {
    wanted.forEach((id) => inFlight.delete(id));
  }
}
