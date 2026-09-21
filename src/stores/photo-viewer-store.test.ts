import { usePhotoViewerStore } from '@/stores/photo-viewer-store';

const reset = () => usePhotoViewerStore.setState({ paths: [], index: 0 });

const PATHS = ['restrooms/r1/a.webp', 'restrooms/r1/b.webp', 'restrooms/r1/c.webp'];

describe('photo viewer store', () => {
  beforeEach(reset);

  it('opens on the photo that was tapped', () => {
    usePhotoViewerStore.getState().open(PATHS, 2);

    const s = usePhotoViewerStore.getState();
    expect(s.paths).toEqual(PATHS);
    expect(s.index).toBe(2);
  });

  it('copies the set rather than aliasing the caller', () => {
    const live = [...PATHS];
    usePhotoViewerStore.getState().open(live, 0);
    live.push('restrooms/r1/d.webp');

    expect(usePhotoViewerStore.getState().paths).toHaveLength(3);
  });

  /**
   * The reason `open` clamps at all. A caller holds a `photoIds` array from a
   * snapshot; by the time the tap lands the author may have removed the last
   * photo. An out-of-range index scrolls the pager past its own content, which
   * renders blank with no error — a clamp turns that into "the nearest photo".
   */
  it('clamps an index past the end of the set', () => {
    usePhotoViewerStore.getState().open(PATHS, 9);
    expect(usePhotoViewerStore.getState().index).toBe(2);
  });

  it('clamps a negative index', () => {
    usePhotoViewerStore.getState().open(PATHS, -1);
    expect(usePhotoViewerStore.getState().index).toBe(0);
  });

  /** `paths.length - 1` is -1 on an empty set, which would clamp everything to -1. */
  it('survives an empty set without producing a negative index', () => {
    usePhotoViewerStore.getState().open([], 3);
    expect(usePhotoViewerStore.getState().index).toBe(0);
  });

  /**
   * Cleared, not left behind. The route reads `paths` during render, so a stale
   * set would paint the previous restroom's photos for a frame on the next open.
   */
  it('clears the set on close', () => {
    usePhotoViewerStore.getState().open(PATHS, 1);
    usePhotoViewerStore.getState().close();

    const s = usePhotoViewerStore.getState();
    expect(s.paths).toEqual([]);
    expect(s.index).toBe(0);
  });
});
