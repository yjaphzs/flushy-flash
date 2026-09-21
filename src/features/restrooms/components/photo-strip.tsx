import { List } from '@/components/common/list';
import { Icon } from '@/components/ui/icon';
import { Image } from '@/components/ui/image';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { usePhotoUrl } from '@/features/restrooms/use-photo-url';

const SIZE = 132;

/** One photo, resolving its own URL. */
function Photo({
  path,
  index,
  onPress,
}: {
  path: string;
  index: number;
  onPress?: (index: number) => void;
}) {
  const url = usePhotoUrl(path);

  /*
    A `Pressable` whether or not it is pressable, with `onPress` simply absent
    in the second case — the same idiom `action-row.tsx` uses for a row that is
    temporarily inert. The role and the label follow the handler, because a
    tile announcing itself as a button that does nothing is worse than a tile
    that announces itself as an image.
  */
  return (
    <Pressable
      onPress={onPress ? () => onPress(index) : undefined}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `Photo ${index + 1}. Opens all photos.` : `Photo ${index + 1}`}
      className="items-center justify-center overflow-hidden rounded-2xl bg-surface-secondary"
      style={{ width: SIZE, height: SIZE, borderCurve: 'continuous' }}
      testID={`photo-tile-${index}`}
    >
      {url ? (
        <Image
          source={{ uri: url }}
          style={{ width: SIZE, height: SIZE }}
          contentFit="cover"
          recyclingKey={path}
        />
      ) : (
        // Also the permanent state for a photo whose object is gone: usePhotoUrl
        // swallows the failure rather than surfacing an error for one image.
        <Icon name="image" size={20} color="muted" />
      )}
    </Pressable>
  );
}

/**
 * The photo strip.
 *
 * Horizontal, through @/components/common/list rather than a ScrollView + .map:
 * five remote images is small, but the house rule targets data lists and these
 * are data. Each photo resolves its own URL, and the results are memoised
 * process-wide, so the map pin and this strip share one request per path.
 *
 * ⚠️ **`onPhotoPress` is optional, and must stay optional.** There are two call
 * sites — the restroom page and `review-card.tsx` — and a review card inside a
 * scrolling list is not obliged to open a viewer. A required prop would force
 * the second caller to invent a handler it does not want.
 *
 * The strip renders exactly what it is handed; it has never sliced. Which
 * photos belong in it is the caller's decision, and
 * `restroom-detail-header.tsx` documents the one non-obvious case.
 */
export function PhotoStrip({
  photoIds,
  onPhotoPress,
}: {
  photoIds: string[];
  onPhotoPress?: (index: number) => void;
}) {
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
      {/*
        The explicit height is not decoration. This strip's only host is the
        detail sheet, which sizes itself dynamically against its content — and a
        horizontal list has no intrinsic height to measure, so without this the
        sheet computes its height from a zero-height child.
      */}
      <View style={{ height: SIZE }}>
        <List
          data={photoIds}
          horizontal
          keyExtractor={(path) => path}
          estimatedItemSize={SIZE}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item, index }) => (
            <Photo path={item} index={index} onPress={onPhotoPress} />
          )}
        />
      </View>
    </View>
  );
}
