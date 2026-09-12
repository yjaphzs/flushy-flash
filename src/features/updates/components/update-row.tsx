import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { formatBytes, installedVersion } from '@/features/updates/api';
import { useUpdateCheck } from '@/features/updates/use-update-check';
import { useUpdateError, useUpdateOffer, useUpdatePhase } from '@/stores/update-store';

/**
 * The version card on Settings, and the only place a failed check is visible.
 *
 * Everywhere else a failed update check is silent — it is not an event, and a
 * student on patchy campus wifi should not be told about it. Here it is
 * different: someone has just tapped a button and is owed an answer, including
 * a bad one.
 *
 * Its own component rather than more lines in `settings.tsx`, which sits close
 * to the 200-line cap.
 */
export function UpdateRow() {
  const { check } = useUpdateCheck();
  const phase = useUpdatePhase();
  const offer = useUpdateOffer();
  const error = useUpdateError();

  const checking = phase === 'checking';
  const available = offer !== null && phase !== 'idle';

  return (
    <Card>
      <Card.Body>
        <Card.Title>App version</Card.Title>
        <Card.Description>
          {available
            ? `${installedVersion()} — version ${offer.version} is available (${formatBytes(offer.bytes)})`
            : `${installedVersion()} — up to date`}
        </Card.Description>
        {error ? (
          <Text type="body-sm" className="text-danger">
            {error}
          </Text>
        ) : null}
      </Card.Body>
      <Card.Footer>
        <Button variant="secondary" onPress={check} isDisabled={checking}>
          <Button.Label>{checking ? 'Checking…' : 'Check for updates'}</Button.Label>
        </Button>
      </Card.Footer>
    </Card>
  );
}
