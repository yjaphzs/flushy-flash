import { renderWithProviders as render, screen, userEvent } from '@/test-utils/render';
import { router } from 'expo-router';

import { RestroomRow } from '@/features/restrooms/components/restroom-row';
import { Text } from '@/components/ui/text';
import type { Amenities, Building, Restroom } from '@/lib/types';

/**
 * The row had no test at all, on either of the two screens that draw it, while
 * being the component whose whole reason for existing is that Likes and
 * `building/[id]` had already drifted apart rendering the same entity.
 *
 * These pin the DECISIONS, not the markup — what is shown, what is deliberately
 * hidden, and the fallbacks. A restyle should not break them.
 */

// A factory, not automock: automock loads the real module to derive its shape,
// dragging @react-native-firebase in behind it.
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => false },
}));
// The photo resolves over the network. Null is the honest default here and is
// also the first frame of every real row, so the glyph fallback is what renders.
jest.mock('@/features/restrooms/use-photo-url', () => ({ usePhotoUrl: () => null }));

const AMENITIES: Amenities = {
  isFree: true,
  hasWater: true,
  hasTissue: null,
  hasBidet: null,
  accessible: false,
  genderedAs: 'male',
};

const BUILDING = { id: 'b1', name: 'Science and Technology Centrum' } as Building;

function makeRestroom(over: Partial<Restroom> = {}): Restroom {
  return {
    id: 'r1',
    buildingId: 'b1',
    floor: 1,
    landmark: 'Main Gate',
    locationNote: 'Walk inside the main gate',
    photoIds: ['restrooms/r1/a.webp'],
    amenities: AMENITIES,
    status: 'ok',
    verified: false,
    confirmCount: 0,
    reportCount: 0,
    ...over,
  } as Restroom;
}

function renderRow(over: Partial<Restroom> = {}, props: Record<string, unknown> = {}) {
  return render(<RestroomRow restroom={makeRestroom(over)} buildings={[BUILDING]} {...props} />);
}

describe('RestroomRow', () => {
  it('titles by landmark and puts the building underneath', async () => {
    await renderRow();
    expect(screen.getByText('Main Gate')).toBeOnTheScreen();
    expect(screen.getByText('Science and Technology Centrum · Floor 1')).toBeOnTheScreen();
  });

  it('falls back to the building name, and then does not repeat it', async () => {
    await renderRow({ landmark: '' });
    expect(screen.getByText('Science and Technology Centrum')).toBeOnTheScreen();
    expect(screen.getByText('Floor 1')).toBeOnTheScreen();
  });

  // `buildingId` is nullable by design — a pin beside the lagoon belongs to no
  // building — and must not render as "Unknown building".
  it('says On campus when there is no building', async () => {
    await renderRow({ buildingId: null });
    expect(screen.getByText('On campus · Floor 1')).toBeOnTheScreen();
  });

  /**
   * The list's central editorial decision. "Open" is the overwhelmingly common
   * case, so on every row it is decoration; the exception is the signal. The
   * detail page does the opposite, deliberately.
   */
  it('hides the status chip when the restroom is open', async () => {
    await renderRow({ status: 'ok' });
    expect(screen.queryByText('Open')).not.toBeOnTheScreen();
  });

  it.each([
    ['out_of_order', 'Out of order'],
    ['closed', 'Closed'],
  ])('shows the status chip when it is %s', async (status, label) => {
    await renderRow({ status: status as Restroom['status'] });
    expect(screen.getByText(label)).toBeOnTheScreen();
  });

  it('shows who may use it', async () => {
    await renderRow();
    expect(screen.getByText('Men')).toBeOnTheScreen();
  });

  // null means nobody said, which is not the same as "anyone" — so the chip
  // goes away rather than guessing.
  it('omits the access chip when the gender is unknown', async () => {
    await renderRow({ amenities: { ...AMENITIES, genderedAs: null } });
    expect(screen.queryByText('Men')).not.toBeOnTheScreen();
  });

  it('renders no badge and no footer by default', async () => {
    await renderRow();
    expect(screen.queryByText('Verified')).not.toBeOnTheScreen();
    expect(screen.queryByText(/confirmed it yet/)).not.toBeOnTheScreen();
  });

  it('renders the badge and footer it is given', async () => {
    await renderRow(
      { verified: true },
      {
        badge: { label: 'Verified', color: 'success' },
        footer: <Text>Nobody has confirmed it yet</Text>,
      },
    );
    expect(screen.getByText('Verified')).toBeOnTheScreen();
    expect(screen.getByText('Nobody has confirmed it yet')).toBeOnTheScreen();
  });

  /**
   * Directions belong on the surfaces you reach once you have chosen. In a list
   * you are still choosing, and the question is which building this is in.
   */
  it('does not put the directions in the row', async () => {
    await renderRow();
    expect(screen.queryByText(/Walk inside the main gate/)).not.toBeOnTheScreen();
  });

  // The navigation target, not just that something is pressable: the row
  // hardcodes it, so nothing else in the app can catch it being wrong.
  it('opens that restroom when pressed', async () => {
    const user = userEvent.setup();
    await renderRow();

    await user.press(screen.getByText('Main Gate'));
    expect(router.push).toHaveBeenCalledWith('/restroom/r1');
  });
});
