import { Avatar } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useAuthor } from '@/stores/users-store';

/**
 * A review's author line: avatar, name, handle, verified badge.
 *
 * **The single rendering path for an author anywhere in the app**, and that is
 * deliberate. When an account is deleted, the Cloud Function replaces its
 * profile with a tombstone carrying a whimsical placeholder name — and because
 * every author goes through here, that needed no change to any UI file at all.
 * `restrooms.createdBy` will want the same treatment, which is why this lives
 * in `features/users/` rather than beside reviews.
 *
 * ## The three states
 *
 * `undefined` is NOT the same as `null`. Not-looked-up-yet renders a neutral
 * placeholder; looked-up-and-absent renders the unknown fallback. Collapsing
 * them would flash every real author as unknown on a cold list.
 *
 * A tombstone is neither: it is a real profile with a real `displayName`, no
 * handle and no badge — so it falls out of the normal path without a branch.
 */
export function AuthorChip({ authorId }: { authorId: string }) {
  const author = useAuthor(authorId);

  if (author === undefined) {
    return (
      <View className="h-8 flex-row items-center gap-2">
        <View className="h-8 w-8 rounded-full bg-surface-secondary" />
        <View className="h-3 w-24 rounded-full bg-surface-secondary" />
      </View>
    );
  }

  if (author === null) {
    return (
      <View className="flex-row items-center gap-2">
        <Avatar size="sm">
          <Avatar.Fallback>
            <Icon name="user" size={14} color="muted" />
          </Avatar.Fallback>
        </Avatar>
        <Text type="body-sm" color="muted">
          Unknown author
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-row items-center gap-2">
      <Avatar size="sm">
        {author.photoURL ? <Avatar.Image source={{ uri: author.photoURL }} /> : null}
        <Avatar.Fallback>
          <Text type="body-xs" weight="semibold">
            {author.displayName.slice(0, 1).toUpperCase()}
          </Text>
        </Avatar.Fallback>
      </Avatar>

      <View className="flex-row items-center gap-1.5">
        <Text type="body-sm" weight="medium">
          {author.displayName}
        </Text>
        {/*
          A tombstone has no handle, so `@undefined` — the obvious bug here — is
          impossible rather than merely avoided.
        */}
        {author.handle ? (
          <Text type="body-sm" color="muted">
            @{author.handle}
          </Text>
        ) : null}
        {author.verifiedStudent ? (
          <Icon name="badge-check" size={14} color="accent" accessibilityLabel="Verified student" />
        ) : null}
      </View>
    </View>
  );
}
