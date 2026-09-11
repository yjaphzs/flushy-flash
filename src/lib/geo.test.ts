import { CAMPUS_BOUNDS, CAMPUS_CENTER } from '@/lib/campus';
import { distanceM, formatDistance, isOnCampus, sortByDistance } from '@/lib/geo';

describe('distanceM', () => {
  it('is zero for the same point', () => {
    expect(distanceM(CAMPUS_CENTER, CAMPUS_CENTER)).toBe(0);
  });

  it('matches a known campus distance', () => {
    // CAMPUS_CENTER -> University Library (from the OSM seed data).
    const library = { lat: 15.7367, lng: 120.93406 };
    const metres = distanceM(CAMPUS_CENTER, library);
    // ~760 m across campus; allow slack for the ellipsoid approximation.
    expect(metres).toBeGreaterThan(700);
    expect(metres).toBeLessThan(820);
  });

  it('is symmetric', () => {
    const a = { lat: 15.7313583, lng: 120.9302984 }; // Administration Building
    const b = { lat: 15.7354326, lng: 120.9322581 }; // College of Engineering
    expect(distanceM(a, b)).toBeCloseTo(distanceM(b, a), 6);
  });

  it('handles the antimeridian without blowing up', () => {
    const west = { lat: 0, lng: 179.999 };
    const east = { lat: 0, lng: -179.999 };
    // ~222 m apart across the line, not most of the way round the planet.
    expect(distanceM(west, east)).toBeLessThan(500);
  });

  it('handles high latitudes', () => {
    expect(distanceM({ lat: 89, lng: 0 }, { lat: 89, lng: 180 })).toBeGreaterThan(200_000);
  });
});

describe('isOnCampus', () => {
  it('accepts the campus centre', () => {
    expect(isOnCampus(CAMPUS_CENTER)).toBe(true);
  });

  it('accepts the bounding corners', () => {
    expect(isOnCampus(CAMPUS_BOUNDS.sw)).toBe(true);
    expect(isOnCampus(CAMPUS_BOUNDS.ne)).toBe(true);
  });

  it('rejects Manila', () => {
    expect(isOnCampus({ lat: 14.5995, lng: 120.9842 })).toBe(false);
  });
});

describe('sortByDistance', () => {
  const items = [
    { id: 'far', lat: 15.744, lng: 120.953 },
    { id: 'near', lat: 15.7311, lng: 120.9299 },
    { id: 'mid', lat: 15.7367, lng: 120.93406 },
  ];
  const getPoint = (i: (typeof items)[number]) => ({ lat: i.lat, lng: i.lng });

  it('orders nearest first', () => {
    const sorted = sortByDistance(items, CAMPUS_CENTER, getPoint);
    expect(sorted.map((s) => s.item.id)).toEqual(['near', 'mid', 'far']);
  });

  it('leaves order untouched and distances null without a fix', () => {
    const sorted = sortByDistance(items, null, getPoint);
    expect(sorted.map((s) => s.item.id)).toEqual(['far', 'near', 'mid']);
    expect(sorted.every((s) => s.distanceM === null)).toBe(true);
  });

  it('does not mutate the input array', () => {
    const original = [...items];
    sortByDistance(items, CAMPUS_CENTER, getPoint);
    // List virtualisation depends on stable references; sorting in place would
    // quietly break recycling.
    expect(items).toEqual(original);
  });
});

describe('formatDistance', () => {
  it('uses metres below a kilometre', () => {
    expect(formatDistance(120)).toBe('120 m');
  });

  it('switches to kilometres at 1000 m', () => {
    expect(formatDistance(1400)).toBe('1.4 km');
  });

  it('renders nothing when distance is unknown', () => {
    expect(formatDistance(null)).toBe('');
  });
});
