import { ActionRow } from '@/components/common/action-row';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useOfflinePack } from '@/features/offline-map/use-offline-pack';
import { formatBytes } from '@/features/updates/api';

/**
 * "Keep the campus map on this phone", on Settings.
 *
 * Built like `UpdateRow` beside it: the whole row is the press target, the hint
 * carries the state, and a second press while busy is ignored by dropping
 * `onPress` rather than by a disabled prop only these rows would use.
 *
 * ⚠️ **The hint says what the pack does NOT cover, and that is not hedging.**
 * The pack is vector tiles only — fonts would cost ~50x more than the tiles
 * (see `components/common/offline-map.ts`) — so street and building NAMES come
 * from MapLibre's ambient cache, which fills as the map is used online. On a
 * phone that has opened the map before, offline is complete. On one that never
 * has, it is geometry without labels. Someone deciding whether to tap this is
 * exactly the person who needs to know that.
 */
export function OfflineMapRow() {
  const pack = useOfflinePack();

  const hint = {
    unknown: 'Checking…',
    absent: 'Roads and buildings, so the map works with no signal',
    downloading:
      pack.percent > 0 ? `Downloading… ${Math.round(pack.percent)}%` : 'Downloading…',
    present: `Saved${pack.bytes > 0 ? ` · ${formatBytes(pack.bytes)}` : ''} — tap to remove`,
  }[pack.phase];

  const onPress = {
    unknown: undefined,
    absent: pack.download,
    downloading: undefined,
    present: pack.remove,
  }[pack.phase];

  return (
    <View className="gap-1">
      <ActionRow icon="map" label="Campus map on this phone" hint={hint} onPress={onPress} />
      {pack.phase === 'present' ? (
        <Text type="body-xs" color="muted" className="px-4 pb-1">
          Place names come from using the map online at least once.
        </Text>
      ) : null}
      {pack.error ? (
        <Text type="body-xs" className="px-4 pb-1 text-danger">
          {pack.error}
        </Text>
      ) : null}
    </View>
  );
}
