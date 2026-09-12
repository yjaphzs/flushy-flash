import { EmptyState } from '@/components/feedback/empty-state';
import { Screen } from '@/components/layouts/screen';
import { useTabBarClearance } from '@/components/layouts/tab-bar-metrics';

/**
 * A stub, deliberately — and not for lack of effort.
 *
 * A notification is written BY one user INTO another user's inbox. Any rule
 * permissive enough to let a client do that is a spam vector: `allow create: if
 * isSignedIn()` lets anyone write anything into anyone's feed. The only honest
 * writer is a Cloud Function with admin credentials, and AGENTS.md §7 records
 * that this project deliberately has no Cloud Function and no Blaze plan yet.
 *
 * So there is no `notifications` collection, no rule block and no type. The tab
 * exists so the information architecture is settled on day one; the data model
 * and its rules sketch are written up in AGENTS.md §7 for when Functions land.
 */
export default function NotificationsScreen() {
  const clearance = useTabBarClearance();

  return (
    <Screen style={{ paddingBottom: clearance }}>
      <EmptyState
        icon="bell"
        illustration="bell"
        title="Nothing yet"
        description="Replies to your reviews, and updates to restrooms you added, will show up here."
        testID="notifications-empty"
      />
    </Screen>
  );
}
