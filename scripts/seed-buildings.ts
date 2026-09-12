/**
 * Seeds the `buildings` collection from OpenStreetMap.
 *
 * CLSU is well mapped: at time of writing Overpass returns 231 building features
 * inside the campus bbox, 103 of them named. That is the entire seed - no manual
 * data entry - and it is what stops the app launching as a blank map.
 *
 * The OSM data is NOT clean. Real examples on campus today:
 *   "Ladie's Dorm 2" / "Ladies's Dorm 4"  - inconsistent apostrophes
 *   two separate features both named "Study Hall"
 * So this script normalises, de-dupes by name + proximity, and writes a CSV for a
 * human to review BEFORE anything is uploaded.
 *
 * Usage:
 *   npx tsx scripts/seed-buildings.ts            # fetch + write review CSV
 *   npx tsx scripts/seed-buildings.ts --upload   # upload the reviewed CSV
 *
 * Uploading needs ADMIN credentials, because firestore.rules makes `buildings`
 * admin-write-only. Prefer short-lived local credentials:
 *   gcloud auth application-default login
 * See the note above upload() for why the client config cannot do this.
 */

import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const CAMPUS_BBOX = '15.7256536,120.9214497,15.744753,120.9540707'; // S,W,N,E
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
// npm scripts always run from the package root, so this is stable.
const OUT_CSV = resolve(process.cwd(), 'scripts', 'buildings.seed.csv');

/** Two features closer than this with the same normalised name are one building. */
const DUPLICATE_RADIUS_M = 60;

type OsmElement = {
  type: 'way' | 'relation' | 'node';
  id: number;
  center?: { lat: number; lon: number };
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
};

type SeedBuilding = {
  id: string;
  name: string;
  code: string | null;
  aliases: string[];
  lat: number;
  lng: number;
  osmId: string;
};

async function fetchBuildings(): Promise<OsmElement[]> {
  const query = `[out:json][timeout:90];
(
  way["building"]["name"](${CAMPUS_BBOX});
  relation["building"]["name"](${CAMPUS_BBOX});
);
out tags center;`;

  // Overpass rejects requests without a User-Agent (406), and its usage policy
  // asks that tools identify themselves.
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'User-Agent': 'flushy-flash-seed/1.0 (CLSU campus restroom finder)',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ data: query }),
  });
  if (!res.ok) throw new Error(`Overpass returned ${res.status}`);

  const json = (await res.json()) as { elements: OsmElement[] };
  return json.elements ?? [];
}

/**
 * Collapses the spelling variants OSM actually contains, so "Ladie's Dorm 2" and
 * "Ladies Dorm 2" resolve to the same key.
 */
function normalizeName(raw: string): string {
  return raw
    .replace(/[‘’']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function nameKey(name: string): string {
  return normalizeName(name).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function slugify(name: string): string {
  return normalizeName(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Uppercase acronym in parentheses, e.g. "College of Engineering (COE)" -> "COE". */
function extractCode(raw: string): string | null {
  const match = raw.match(/\(([A-Z]{2,10})\)/);
  return match ? match[1] : null;
}

const EARTH_RADIUS_M = 6_371_008.8;
const toRad = (deg: number) => (deg * Math.PI) / 180;

function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat));
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

function toSeed(elements: OsmElement[]): { buildings: SeedBuilding[]; warnings: string[] } {
  const warnings: string[] = [];
  const accepted: SeedBuilding[] = [];

  for (const el of elements) {
    const rawName = el.tags?.name;
    if (!rawName) continue;

    const lat = el.center?.lat ?? el.lat;
    const lon = el.center?.lon ?? el.lon;
    if (lat === undefined || lon === undefined) {
      warnings.push(`skipped "${rawName}" (${el.type}/${el.id}): no coordinates`);
      continue;
    }

    const name = normalizeName(rawName);
    const point = { lat, lng: lon };

    // Same name AND physically close => one building mapped twice. Same name but
    // far apart (the two "Study Hall" features) is left alone for a human to name
    // properly, since they are genuinely different places.
    const twin = accepted.find(
      (b) => nameKey(b.name) === nameKey(name) && distanceM(b, point) < DUPLICATE_RADIUS_M,
    );
    if (twin) {
      warnings.push(`merged duplicate "${rawName}" into "${twin.name}" (${el.type}/${el.id})`);
      if (name !== twin.name && !twin.aliases.includes(name)) twin.aliases.push(name);
      continue;
    }

    const sameNameElsewhere = accepted.find((b) => nameKey(b.name) === nameKey(name));
    if (sameNameElsewhere) {
      warnings.push(
        `AMBIGUOUS: "${name}" appears twice, ${Math.round(
          distanceM(sameNameElsewhere, point),
        )}m apart - review both rows and give them distinct names`,
      );
    }

    accepted.push({
      id: slugify(name),
      name,
      code: extractCode(rawName),
      aliases: rawName !== name ? [rawName] : [],
      lat,
      lng: lon,
      osmId: `${el.type}/${el.id}`,
    });
  }

  // Guarantee unique document ids even after the ambiguity warning above.
  const seen = new Map<string, number>();
  for (const b of accepted) {
    const count = seen.get(b.id) ?? 0;
    seen.set(b.id, count + 1);
    if (count > 0) b.id = `${b.id}-${count + 1}`;
  }

  accepted.sort((a, b) => a.name.localeCompare(b.name));
  return { buildings: accepted, warnings };
}

function toCsv(buildings: SeedBuilding[]): string {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows = buildings.map((b) =>
    [b.id, b.name, b.code ?? '', b.aliases.join('|'), b.lat, b.lng, b.osmId]
      .map((v) => esc(String(v)))
      .join(','),
  );
  return ['id,name,code,aliases,lat,lng,osmId', ...rows].join('\n');
}

function fromCsv(csv: string): SeedBuilding[] {
  const [, ...lines] = csv.trim().split(/\r?\n/);
  return lines.filter(Boolean).map((line) => {
    const cells = line.match(/("([^"]|"")*"|[^,]*)/g)!.filter((_, i) => i % 2 === 0);
    const [id, name, code, aliases, lat, lng, osmId] = cells.map((c) =>
      c.replace(/^"|"$/g, '').replace(/""/g, '"'),
    );
    return {
      id,
      name,
      code: code || null,
      aliases: aliases ? aliases.split('|').filter(Boolean) : [],
      lat: Number(lat),
      lng: Number(lng),
      osmId,
    };
  });
}

/**
 * Why this needs ADMIN credentials at all.
 *
 * `google-services.json` is CLIENT config: it identifies the app and grants no
 * privileges — everything it can do is gated by firestore.rules. The `buildings`
 * collection is deliberately admin-write-only there (students add restrooms, not
 * buildings), so no client credential can seed it. The Admin SDK bypasses rules
 * entirely, which is exactly why it is a real secret and the client config is not.
 *
 * Two ways to provide it, in order of preference:
 *
 *   1. gcloud auth application-default login   ← preferred
 *      Short-lived local credentials. Nothing downloadable to leak.
 *
 *   2. GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
 *      A long-lived private key with full project access. Use only where (1)
 *      cannot work, such as unattended CI. Never commit it.
 *
 * `applicationDefault()` resolves both: it reads GOOGLE_APPLICATION_CREDENTIALS
 * when set, and otherwise falls back to the gcloud ADC file.
 */
async function upload(buildings: SeedBuilding[]) {
  const { applicationDefault, initializeApp } = await import('firebase-admin/app');
  const { getFirestore, GeoPoint, FieldValue } = await import('firebase-admin/firestore');

  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyPath && !existsSync(keyPath)) {
    throw new Error(`GOOGLE_APPLICATION_CREDENTIALS points to a missing file: ${keyPath}`);
  }

  try {
    initializeApp({
      credential: applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID ?? 'flushy-flash',
    });
  } catch {
    throw new Error(
      'No admin credentials found.\n\n' +
        '  Preferred — short-lived, nothing to leak:\n' +
        '    gcloud auth application-default login\n\n' +
        '  Or, a long-lived service-account key (full project access, keep it out of git):\n' +
        '    Firebase console -> Project settings -> Service accounts -> Generate new private key\n' +
        '    GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run seed:buildings -- --upload\n',
    );
  }

  console.log(
    keyPath
      ? `Authenticating with the service-account key at ${keyPath}`
      : 'Authenticating with gcloud application-default credentials',
  );

  const db = getFirestore();

  // Credentials resolve lazily, at request time — not during initializeApp. So a
  // stale or missing ADC token surfaces as a 20-line gRPC stack trace on the
  // first write rather than anything actionable. Exercise them up front with one
  // cheap read and translate the failure.
  try {
    await db.collection('buildings').limit(1).get();
  } catch (err) {
    throw new Error(explainAuthFailure(err));
  }

  // Which docs already exist, so a re-run does not clobber fields that must only
  // ever be written once. One read of ~100 ids is far cheaper than getting this
  // wrong. restroomCount is maintained elsewhere and createdAt is immutable, so
  // neither may be included in an update payload.
  const existing = new Set<string>();
  const current = await db.collection('buildings').select().get();
  current.forEach((d) => existing.add(d.id));
  if (existing.size > 0) {
    console.log(`  ${existing.size} building(s) already present — reconciling, not duplicating`);
  }

  // Batched, and keyed by a stable slug id, so re-running reconciles rather than
  // duplicating. Firestore caps a batch at 500 writes.
  for (let i = 0; i < buildings.length; i += 400) {
    const batch = db.batch();
    for (const b of buildings.slice(i, i + 400)) {
      const shared = {
        name: b.name,
        code: b.code,
        aliases: b.aliases,
        location: new GeoPoint(b.lat, b.lng),
        osmId: b.osmId,
      };
      batch.set(
        db.collection('buildings').doc(b.id),
        existing.has(b.id)
          ? shared
          : { ...shared, restroomCount: 0, createdAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
    }
    try {
      await batch.commit();
    } catch (err) {
      throw new Error(explainAuthFailure(err));
    }
    console.log(`  uploaded ${Math.min(i + 400, buildings.length)}/${buildings.length}`);
  }
}

/** Turns an opaque Google auth/permission error into something actionable. */
function explainAuthFailure(err: unknown): string {
  const raw = err instanceof Error ? `${err.message} ${(err as { details?: string }).details ?? ''}` : String(err);

  const expired = /invalid_grant|invalid_rapt|reauth|Could not refresh access token|UNAUTHENTICATED/i.test(raw);
  const denied = /PERMISSION_DENIED|403|Missing or insufficient permissions/i.test(raw);

  if (expired) {
    return (
      'Admin credentials are present but expired or need re-consent.\n\n' +
      '  Refresh them:\n' +
      '    gcloud auth application-default login\n\n' +
      `  Original error: ${raw.trim().slice(0, 200)}`
    );
  }
  if (denied) {
    return (
      'Authenticated, but this identity cannot write to the project.\n\n' +
      '  Confirm the account owns flushy-flash, or that the service-account key\n' +
      '  has the Cloud Datastore User / Firebase Admin role.\n\n' +
      `  Original error: ${raw.trim().slice(0, 200)}`
    );
  }
  return raw;
}

async function main() {
  const shouldUpload = process.argv.includes('--upload');

  if (shouldUpload) {
    if (!existsSync(OUT_CSV)) {
      throw new Error(`${OUT_CSV} not found. Run without --upload first, then review it.`);
    }
    const buildings = fromCsv(readFileSync(OUT_CSV, 'utf8'));
    console.log(`Uploading ${buildings.length} reviewed buildings...`);
    await upload(buildings);
    console.log('Done.');
    return;
  }

  console.log('Querying Overpass for CLSU buildings...');
  const elements = await fetchBuildings();
  const { buildings, warnings } = toSeed(elements);

  writeFileSync(OUT_CSV, toCsv(buildings), 'utf8');

  console.log(`\n${elements.length} named building features -> ${buildings.length} buildings`);
  if (warnings.length) {
    console.log(`\n${warnings.length} thing(s) to look at:`);
    for (const w of warnings) console.log('  -', w);
  }
  console.log(`\nReview ${OUT_CSV}, fix names/codes, then:`);
  console.log('  npx tsx scripts/seed-buildings.ts --upload');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
