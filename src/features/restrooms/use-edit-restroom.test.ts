import { renderHook, act } from '@testing-library/react-native';

import { useEditRestroom } from '@/features/restrooms/use-edit-restroom';

/*
  Factories, not automock: the real modules pull in @react-native-firebase and
  its nested copy of the Firebase JS SDK. `calls` records the ORDER of the three
  side effects, which is the whole thing under test.
*/
const calls: string[] = [];

const mockUpdateRestroom = jest.fn();
const mockUploadPhoto = jest.fn();
const mockDeletePhotos = jest.fn();

jest.mock('@/features/restrooms/api', () => ({
  updateRestroom: (...args: unknown[]) => mockUpdateRestroom(...args),
}));
jest.mock('@/lib/storage', () => ({
  uploadPhoto: (...args: unknown[]) => mockUploadPhoto(...args),
  deletePhotos: (...args: unknown[]) => mockDeletePhotos(...args),
}));
jest.mock('@/features/restrooms/photos', () => ({ MAX_PHOTOS: 5, pickPhotos: jest.fn() }));

const BASE = {
  id: 'r1',
  point: { lat: 15.7313, lng: 120.9302 },
  buildingId: null,
  floor: '2',
  landmark: 'CLSU Lagoon',
  locationNote: 'Past the east stairwell',
  amenities: {
    isFree: true,
    hasWater: null,
    hasTissue: null,
    hasBidet: null,
    accessible: null,
    genderedAs: null,
  },
  genderedAs: 'unisex' as const,
  status: 'out_of_order' as const,
  uid: 'u1',
};

const OLD_A = 'restrooms/r1/0-a.webp';
const OLD_B = 'restrooms/r1/1-b.webp';

beforeEach(() => {
  calls.length = 0;
  mockUpdateRestroom.mockReset().mockImplementation(async () => void calls.push('write'));
  mockDeletePhotos.mockReset().mockImplementation(async () => void calls.push('delete'));
  mockUploadPhoto.mockReset().mockImplementation(async () => {
    calls.push('upload');
    return { path: `restrooms/r1/new-${calls.length}.webp` };
  });
});

describe('useEditRestroom', () => {
  /**
   * ⚠️ **The ordering, which differs from creating on purpose.**
   *
   * Creating has no removal case, so it uploads then writes. Editing must delete
   * removed photos LAST: deleting first and then failing the write would leave
   * `photoIds` pointing at objects that no longer exist — visibly broken, where
   * a failed upload only leaves invisible orphaned bytes.
   */
  it('uploads, then writes, then deletes what was removed', async () => {
    const { result } = await renderHook(() => useEditRestroom());

    await act(async () => {
      await result.current.save({
        ...BASE,
        photos: [{ kind: 'existing', path: OLD_A }, { kind: 'new', uri: 'file:///new.webp' }],
        originalPhotoIds: [OLD_A, OLD_B],
      });
    });

    expect(calls).toEqual(['upload', 'write', 'delete']);
  });

  /** Kept first, new appended — the hero and the map pin both read photoIds[0]. */
  it('keeps existing photos in front of newly uploaded ones', async () => {
    const { result } = await renderHook(() => useEditRestroom());

    await act(async () => {
      await result.current.save({
        ...BASE,
        photos: [{ kind: 'existing', path: OLD_A }, { kind: 'new', uri: 'file:///new.webp' }],
        originalPhotoIds: [OLD_A],
      });
    });

    const written = mockUpdateRestroom.mock.calls[0][0];
    expect(written.photoIds[0]).toBe(OLD_A);
    expect(written.photoIds).toHaveLength(2);
    // The upload index continues past the kept ones, so a fresh object never
    // reuses an index a live photo already holds.
    expect(mockUploadPhoto.mock.calls[0][0].index).toBe(1);
  });

  /** Status is the one field that had no route in at all before this screen. */
  it('writes the fields the rules allow, and a parsed floor', async () => {
    const { result } = await renderHook(() => useEditRestroom());

    await act(async () => {
      await result.current.save({ ...BASE, photos: [], originalPhotoIds: [] });
    });

    const written = mockUpdateRestroom.mock.calls[0][0];
    expect(written.status).toBe('out_of_order');
    expect(written.floor).toBe(2);
    expect(written.amenities.genderedAs).toBe('unisex');
    // Never sent: the rules pin these and a patch containing them is denied.
    expect(written).not.toHaveProperty('createdAt');
    expect(written).not.toHaveProperty('verified');
    expect(written).not.toHaveProperty('confirmCount');
  });

  /** The leak this hook exists to avoid, from the other side. */
  it('deletes exactly the photos dropped from the form', async () => {
    const { result } = await renderHook(() => useEditRestroom());

    await act(async () => {
      await result.current.save({
        ...BASE,
        photos: [{ kind: 'existing', path: OLD_A }],
        originalPhotoIds: [OLD_A, OLD_B],
      });
    });

    expect(mockDeletePhotos).toHaveBeenCalledWith([OLD_B]);
  });

  it('does not touch Storage when nothing was removed', async () => {
    const { result } = await renderHook(() => useEditRestroom());

    await act(async () => {
      await result.current.save({
        ...BASE,
        photos: [{ kind: 'existing', path: OLD_A }],
        originalPhotoIds: [OLD_A],
      });
    });

    expect(mockDeletePhotos).not.toHaveBeenCalled();
  });

  /**
   * A failed write must take the NEW objects with it and leave the live ones
   * alone — the document still references those.
   */
  it('cleans up its own uploads when the write fails, and removes nothing else', async () => {
    mockUpdateRestroom.mockRejectedValue(
      Object.assign(new Error('[firestore/permission-denied] nope'), {
        code: 'firestore/permission-denied',
      }),
    );
    const { result } = await renderHook(() => useEditRestroom());

    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.save({
        ...BASE,
        photos: [{ kind: 'existing', path: OLD_A }, { kind: 'new', uri: 'file:///new.webp' }],
        originalPhotoIds: [OLD_A, OLD_B],
      });
    });

    expect(saved).toBe(false);
    expect(mockDeletePhotos).toHaveBeenCalledTimes(1);
    expect(mockDeletePhotos.mock.calls[0][0]).toEqual(['restrooms/r1/new-1.webp']);
    expect(result.current.error).toMatch(/save/i);
  });

  it('refuses a floor that is not a number, without writing anything', async () => {
    const { result } = await renderHook(() => useEditRestroom());

    await act(async () => {
      await result.current.save({ ...BASE, floor: 'ground', photos: [], originalPhotoIds: [] });
    });

    expect(mockUpdateRestroom).not.toHaveBeenCalled();
    expect(result.current.error).toMatch(/number/i);
  });
});
