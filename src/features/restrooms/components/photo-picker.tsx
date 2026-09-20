import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Image } from '@/components/ui/image';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import type { PickedPhoto } from '@/features/restrooms/photos';
import type { ComposerPhoto } from '@/features/reviews/use-review-form';
import { usePhotoUrl } from '@/features/restrooms/use-photo-url';

const THUMB = 84;

export type PhotoPickerProps = {
  photos: ComposerPhoto[];
  onChange: (photos: ComposerPhoto[]) => void;
  max: number;
  pick: (remaining: number) => Promise<PickedPhoto[]>;
  /**
   * Replaces the standing "the entrance is the most useful one" line.
   *
   * Exists because a photo is REQUIRED on a new restroom now, and a disabled
   * Save button with the reason three sections further down is the shape
   * `callout.tsx` was written to end. The demand belongs beside the control
   * that satisfies it.
   */
  hint?: string;
};

/** Stable identity for a photo of either kind, for keys and removal. */
const idOf = (p: ComposerPhoto) => (p.kind === 'new' ? p.uri : p.path);

/**
 * One thumbnail. An `existing` photo is a Storage PATH and has to resolve
 * through usePhotoUrl first; a `new` one is already a local file URI.
 */
function Thumb({ photo, index }: { photo: ComposerPhoto; index: number }) {
  const resolved = usePhotoUrl(photo.kind === 'existing' ? photo.path : undefined);
  const uri = photo.kind === 'new' ? photo.uri : resolved;

  if (!uri) {
    return (
      <View
        className="items-center justify-center rounded-xl bg-surface-secondary"
        style={{ width: THUMB, height: THUMB, borderCurve: 'continuous' }}
      >
        <Icon name="image" size={18} color="muted" />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={{ width: THUMB, height: THUMB, borderRadius: 12 }}
      contentFit="cover"
      accessibilityLabel={`Photo ${index + 1}`}
    />
  );
}

/**
 * Choose the photos for a submission, before anything is uploaded.
 *
 * Everything here is local file URIs — nothing touches Storage until Save. That
 * is what makes removing a photo free, and what stops a user who abandons the
 * form halfway from leaving objects in the bucket.
 */
export function PhotoPicker({ photos, onChange, max, pick, hint }: PhotoPickerProps) {
  const remaining = max - photos.length;

  async function add() {
    const picked = await pick(remaining);
    if (picked.length > 0) {
      onChange([...photos, ...picked.map((p) => ({ kind: 'new' as const, uri: p.uri }))]);
    }
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
        {hint ??
          'The entrance is the most useful one — it is what someone is looking for when they get close.'}
      </Text>

      <View className="flex-row flex-wrap gap-2">
        {photos.map((photo, index) => (
          <View key={idOf(photo)} style={{ width: THUMB, height: THUMB }}>
            <Thumb photo={photo} index={index} />
            <Pressable
              onPress={() => onChange(photos.filter((p) => idOf(p) !== idOf(photo)))}
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
