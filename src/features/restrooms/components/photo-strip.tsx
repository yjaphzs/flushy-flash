import { List } from '@/components/common/list';
import { Icon } from '@/components/ui/icon';
import { Image } from '@/components/ui/image';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { usePhotoUrl } from '@/features/restrooms/use-photo-url';

const SIZE = 132;

/** One photo, resolving its own URL. */
function Photo({ path, index }: { path: string; index: number }) {
  const url = usePhotoUrl(path);

  return (
    <View
      className="items-center justify-center overflow-hidden rounded-2xl bg-surface-secondary"
      style={{ width: SIZE, height: SIZE, borderCurve: 'continuous' }}
    >
      {url ? (
        <Image
          source={{ uri: url }}
          style={{ width: SIZE, height: SIZE }}
          contentFit="cover"
          recyclingKey={path}
          accessibilityLabel={`Photo ${index + 1}`}
        />
      ) : (
        // Also the permanent state for a photo whose object is gone: usePhotoUrl
        // swallows the failure rather than surfacing an error for one image.
        <Icon name="image" size={20} color="muted" />
      )}
    </View>
  );
}

/**
 * The photo strip.
 *
 * Horizontal, through @/components/common/list rather than a ScrollView + .map:
 * six remote images is small, but the house rule targets data lists and these
 * are data. Each photo resolves its own URL, and the results are memoised
 * process-wide, so the map pin and this strip share one request per path.
 */
export function PhotoStrip({ photoIds }: { photoIds: string[] }) {
  if (photoIds.length === 0) {
    return (
      <View className="gap-1">
        <Text type="body-xs" weight="semibold" color="muted">
          PHOTOS
        </Text>
        <Text type="body-sm" color="muted">
          No photos yet.
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-2">
      <Text type="body-xs" weight="semibold" color="muted">
        PHOTOS
      </Text>
      <List
        data={photoIds}
        horizontal
        keyExtractor={(path) => path}
        estimatedItemSize={SIZE}
        contentContainerStyle={{ gap: 8 }}
        renderItem={({ item, index }) => <Photo path={item} index={index} />}
      />
    </View>
  );
}
