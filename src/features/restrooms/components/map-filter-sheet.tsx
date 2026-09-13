import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useBottomInset } from '@/components/layouts/tab-bar-metrics';
import { filterCount } from '@/features/restrooms/filters';
import { ACCESS, AMENITIES } from '@/features/restrooms/labels';
import { useMapFilterStore, useMapFilters } from '@/stores/map-filter-store';
import type { GenderedAs } from '@/lib/types';

const ACCESS_ORDER: GenderedAs[] = ['male', 'female', 'unisex', 'accessible_only'];

/**
 * What to show on the map.
 *
 * ⚠️ **The tree must stay MOUNTED** — the same trap `restroom-sheet.tsx`
 * documents at length. heroui's sheet seeds `prevIsOpenRef = useRef(isOpen)`
 * and snaps only on a false → true transition, so a sheet mounted already-open
 * never opens and its invisible overlay then eats the next tap on the map.
 */
export function MapFilterSheet({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const filters = useMapFilters();
  const bottomInset = useBottomInset();
  const { toggleAmenity, toggleAccess, setOpenOnly, setVerifiedOnly, clearFilters } =
    useMapFilterStore.getState();

  const active = filterCount(filters);

  return (
    <BottomSheet isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content>
          {/*
            heroui's container already pads 20 on all sides. Its own
            `pb-safe-offset-3` does NOT resolve under uniwind — measured on a
            three-button Android device, where the last control sat ~15dp off
            the navigation bar instead of ~60 — so the inset is applied here.
          */}
          <View className="gap-5 pt-1" style={{ paddingBottom: bottomInset }}>
            <View className="flex-row items-center justify-between gap-3">
              <Text type="h3" weight="bold" accessibilityRole="header">
                Show me
              </Text>
              {active > 0 ? (
                <Button variant="secondary" size="sm" className="rounded-full" onPress={clearFilters}>
                  <Button.Label>Clear</Button.Label>
                </Button>
              ) : null}
            </View>

            <Section title="What it has">
              {AMENITIES.map(({ key, label }) => (
                <Toggle
                  key={key}
                  label={label}
                  on={filters.amenities.includes(key)}
                  onPress={() => toggleAmenity(key)}
                />
              ))}
            </Section>

            <Section title="Who it is for">
              {ACCESS_ORDER.map((value) => (
                <Toggle
                  key={value}
                  label={ACCESS[value]}
                  on={filters.access.includes(value)}
                  onPress={() => toggleAccess(value)}
                />
              ))}
            </Section>

            <Section title="Only show">
              <Toggle
                label="Open right now"
                on={filters.openOnly}
                onPress={() => setOpenOnly(!filters.openOnly)}
              />
              <Toggle
                label="Verified by students"
                on={filters.verifiedOnly}
                onPress={() => setVerifiedOnly(!filters.verifiedOnly)}
              />
            </Section>

            {/*
              ⚠️ Not a disclaimer — the single most confusing thing about this
              sheet. An amenity is `true | false | null`, and most submissions
              leave most of them null, so asking for water genuinely hides every
              restroom where nobody answered. Without this line that reads as
              the map being broken. See `filters.ts`.
            */}
            <Text type="body-xs" color="muted">
              Restrooms where nobody has answered a question are hidden when you filter on it.
            </Text>

            <Button size="lg" className="rounded-full" onPress={onClose}>
              <Button.Label>Done</Button.Label>
            </Button>
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text type="body-xs" weight="semibold" color="muted">
        {title.toUpperCase()}
      </Text>
      <View className="flex-row flex-wrap gap-2">{children}</View>
    </View>
  );
}

/**
 * Chip-as-toggle, the pattern `submit.tsx` already uses for its amenity
 * controls, so the two surfaces that ask about amenities look the same.
 */
function Toggle({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Chip
      variant={on ? 'primary' : 'secondary'}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
    >
      <Chip.Label>{label}</Chip.Label>
    </Chip>
  );
}
