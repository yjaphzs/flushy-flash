import { firebaseErrorMessage } from '@/lib/firebase-errors';

/** RNFirebase throws with both a `code` and a `[service/code]` message prefix. */
const nativeError = (code: string) =>
  Object.assign(new Error(`[${code}] something went wrong`), { code });

/** And sometimes only the prefixed message survives, e.g. across a boundary. */
const messageOnly = (code: string) => new Error(`[${code}] something went wrong`);

describe('firebaseErrorMessage', () => {
  it('defaults to the read voice, which is what the listeners want', () => {
    expect(firebaseErrorMessage(nativeError('firestore/permission-denied'))).toMatch(
      /load campus data/i,
    );
  });

  /**
   * ⚠️ The bug this module was widened for.
   *
   * The code regex matched `firestore/…` only, so a photo upload that had burnt
   * its retry budget produced no code at all, fell through to the single
   * fallback, and told the user that CAMPUS DATA failed to LOAD — wrong verb,
   * wrong service, on the one path where the message actually mattered.
   */
  it('recognises a storage code from the message prefix', () => {
    const message = firebaseErrorMessage(messageOnly('storage/retry-limit-exceeded'), 'upload');
    expect(message).toMatch(/no connection/i);
    expect(message).not.toMatch(/campus data/i);
  });

  it.each([
    ['save', /save/i],
    ['upload', /photo/i],
    ['delete', /delete/i],
  ] as const)('speaks in the %s voice when the code adds nothing', (op, expected) => {
    const message = firebaseErrorMessage(nativeError('firestore/permission-denied'), op);
    expect(message).toMatch(expected);
    expect(message).not.toMatch(/campus data/i);
  });

  it('keeps the cause when the code is more specific than the operation', () => {
    expect(firebaseErrorMessage(nativeError('firestore/unavailable'), 'save')).toMatch(
      /no connection/i,
    );
    expect(firebaseErrorMessage(nativeError('firestore/resource-exhausted'), 'save')).toMatch(
      /too busy/i,
    );
  });

  /** Added with the rest: it is the code a denied rules precondition produces. */
  it('has something to say about failed-precondition', () => {
    expect(firebaseErrorMessage(nativeError('firestore/failed-precondition'), 'save')).toMatch(
      /isn't allowed/i,
    );
  });

  /**
   * The module opens by arguing against this, and it is the reason it exists:
   * "Missing or insufficient permissions" is written for a stack trace.
   */
  it('never leaks the underlying message', () => {
    expect(firebaseErrorMessage(new Error('Missing or insufficient permissions'), 'save')).not.toMatch(
      /insufficient/i,
    );
    expect(firebaseErrorMessage('a bare string', 'save')).toMatch(/save/i);
    expect(firebaseErrorMessage(undefined)).toMatch(/campus data/i);
  });
});
