import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Image } from '@/components/ui/image';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import type { PickedPhoto } from '@/features/restrooms/photos';

const THUMB = 84;

export type PhotoPickerProps = {
  photos: PickedPhoto[];
  onChange: (photos: PickedPhoto[]) => void;
  max: number;
  pick: (remaining: number) => Promise<PickedPhoto[]>;
};

/**
 * Choose the photos for a submission, before anything is uploaded.
 *
 * Everything here is local file URIs — nothing touches Storage until Save. That
 * is what makes removing a photo free, and what stops a user who abandons the
 * form halfway from leaving objects in the bucket.
 */
export function PhotoPicker({ photos, onChange, max, pick }: PhotoPickerProps) {
  const remaining = max - photos.length;

  async function add() {
    const picked = await pick(remaining);
    if (picked.length > 0) onChange([...photos, ...picked]);
  }

  return (
    <View className="gap-2">
      <View className="flex-row items-baseline justify-between">
        <Text type="body" weight="semibold">
          Photos
        </Text>
        <Text type="body-xs" color="muted">
          {photos.length} of {max}
        </Text>
      </View>

      <Text type="body-xs" color="muted">
        The entrance is the most useful one — it is what someone is looking for
        when they get close.
      </Text>

      <View className="flex-row flex-wrap gap-2">
        {photos.map((photo, index) => (
          <View key={photo.uri} style={{ width: THUMB, height: THUMB }}>
            <Image
              source={{ uri: photo.uri }}
              style={{ width: THUMB, height: THUMB, borderRadius: 12 }}
              contentFit="cover"
              accessibilityLabel={`Photo ${index + 1}`}
            />
            <Pressable
              onPress={() => onChange(photos.filter((p) => p.uri !== photo.uri))}
              accessibilityRole="button"
              accessibilityLabel={`Remove photo ${index + 1}`}
              hitSlop={8}
              className="absolute right-1 top-1 rounded-full bg-overlay p-1"
            >
              <Icon name="x" size={14} color="on-accent" />
            </Pressable>
          </View>
        ))}

        {remaining > 0 ? (
          <Pressable
            onPress={add}
            accessibilityRole="button"
            accessibilityLabel="Add photos"
            className="items-center justify-center rounded-xl border border-dashed border-border"
            style={{ width: THUMB, height: THUMB, borderCurve: 'continuous' }}
          >
            <Icon name="plus" size={22} color="muted" />
          </Pressable>
        ) : null}
      </View>

      {photos.length === 0 ? (
        <Button variant="secondary" size="sm" className="rounded-full" onPress={add}>
          <Button.Label>Choose photos</Button.Label>
        </Button>
      ) : null}
    </View>
  );
}
