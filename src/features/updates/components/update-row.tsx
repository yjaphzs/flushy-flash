import { ActionRow } from '@/components/common/action-row';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { formatBytes, installedVersion } from '@/features/updates/api';
import { useUpdateCheck } from '@/features/updates/use-update-check';
import { useUpdateError, useUpdateOffer, useUpdatePhase } from '@/stores/update-store';

/**
 * The version row on Settings, and the only place a failed check is visible.
 *
 * Everywhere else a failed update check is silent — it is not an event, and a
 * student on patchy campus wifi should not be told about it. Here it is
 * different: someone has just tapped a row and is owed an answer, including a
 * bad one.
 *
 * The whole row is the press target rather than a card with a button in its
 * footer. "Check for updates" was the only thing that button did, and a row
 * that already names the version is a better place to tap for a newer one than
 * a second control repeating the same idea underneath it.
 */
export function UpdateRow() {
  const { check } = useUpdateCheck();
  const phase = useUpdatePhase();
  const offer = useUpdateOffer();
  const error = useUpdateError();

  const checking = phase === 'checking';
  const available = offer !== null && phase !== 'idle';

  return (
    <View className="gap-1">
      <ActionRow
        icon="refresh-cw"
        label="App version"
        hint={
          checking
            ? 'Checking…'
            : available
              ? `${installedVersion()} — version ${offer.version} is available (${formatBytes(offer.bytes)})`
              : `${installedVersion()} — up to date`
        }
        // Disabling the row outright would leave no way to see it is busy, so
        // the hint carries the state and a second press is simply ignored
        // upstream by the store's own phase guard.
        onPress={checking ? undefined : check}
      />
      {error ? (
        <Text type="body-xs" className="px-4 pb-1 text-danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
