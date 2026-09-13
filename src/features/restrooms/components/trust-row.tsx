import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useRequestWrite } from '@/features/auth/use-auth-gate';
import { confirmationSummary, reportSummary } from '@/features/restrooms/confirmations';
import { castVote, withdrawVote } from '@/features/restrooms/votes-api';
import { useCanWrite, useUid } from '@/stores/auth-store';
import { useMyVote } from '@/stores/votes-store';
import type { Restroom } from '@/lib/types';

export type TrustRowProps = {
  restroom: Restroom;
};

/**
 * Whether the community believes this restroom is real, and the two buttons
 * that let the viewer say so.
 *
 * Shared by the map sheet and `/restroom/[id]` for the same reason everything
 * in `restroom-detail.tsx` is: two surfaces showing the same entity is exactly
 * how they drift.
 *
 * ⚠️ **Counts, never a percentage.** `restroom-detail.tsx` records that a
 * "Trust 63%" band was dropped on purpose, because a heuristic rendered as a
 * percentage reads as a measurement. There is a real source now — actual people
 * pressing actual buttons — so "2 people found this" is honest in a way 63% was
 * not, but a synthesised ratio still would not be.
 *
 * ⚠️ **`confirmCount` and `trustScore` deliberately disagree.** A confirmation
 * from an ordinary signed-in account is counted and shown, because it happened,
 * but scores zero toward verification — three throwaway Google accounts must not
 * be able to launder a fake onto the map. So a restroom can honestly read
 * "3 people found this" and still not be verified, and that is not a bug to fix
 * by showing `trustScore` instead: the number a reader cares about is how many
 * people, not how many points.
 */
export function TrustRow({ restroom }: TrustRowProps) {
  const uid = useUid();
  const canWrite = useCanWrite();
  const requestWrite = useRequestWrite();
  const myVote = useMyVote(restroom.id);
  const [busy, setBusy] = useState(false);
  const reports = reportSummary(restroom.reportCount);

  const mine = uid !== null && restroom.createdBy === uid;

  function vote(kind: 'confirm' | 'report') {
    if (!canWrite || !uid) {
      requestWrite({ href: `/restroom/${restroom.id}`, reason: 'confirm' });
      return;
    }
    setBusy(true);
    // Pressing the vote you already hold withdraws it, which is what makes the
    // pair a toggle rather than a trap — there is no other way to take back a
    // report, and a misfired report costs someone else their contribution.
    const run =
      myVote === kind ? withdrawVote(uid, restroom.id) : castVote(uid, restroom.id, kind);
    run.catch(() => {
      // The listener owns the state, so a failure simply leaves the buttons
      // where they were. No lying UI.
    }).finally(() => setBusy(false));
  }

  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap items-center gap-2">
        {restroom.verified ? (
          <Chip color="success" variant="soft">
            <Chip.Label>Verified by students</Chip.Label>
          </Chip>
        ) : (
          <Chip color="default" variant="soft">
            <Chip.Label>Not verified yet</Chip.Label>
          </Chip>
        )}

        {/*
          Rendered only once somebody has actually said something. `ScoreBar`
          establishes the rule: an empty scale reads as a score of zero rather
          than as nobody having spoken — so this drops the "nobody yet" branch
          the shared helper offers, which the list row does want.

          The wording itself is shared with `restroom-row.tsx`, and the helper's
          docblock carries the reason it is a COUNT and never progress toward a
          threshold.
        */}
        {restroom.confirmCount > 0 ? (
          <Text type="body-sm" color="muted">
            {confirmationSummary(restroom.confirmCount)}
          </Text>
        ) : null}
        {reports ? (
          <Text type="body-sm" className="text-danger">
            {reports}
          </Text>
        ) : null}
      </View>

      {/*
        The author gets the state and not the buttons. The rules refuse a vote on
        your own entry, so offering it would be a button that only ever produces
        an error — and the explanation is more useful than the control, because
        it is the thing standing between them and their next contribution slot.
      */}
      {mine ? (
        <Text type="body-xs" color="muted">
          {restroom.verified
            ? 'Verified, so it no longer counts against your 3 pending restrooms.'
            : 'Waiting for two students to confirm it. Until then it uses one of your 3 pending slots.'}
        </Text>
      ) : (
        <View className="flex-row gap-2">
          <Button
            variant={myVote === 'confirm' ? 'primary' : 'secondary'}
            size="sm"
            className="flex-1 rounded-full"
            isDisabled={busy}
            onPress={() => vote('confirm')}
          >
            <Icon
              name="check"
              size={16}
              color={myVote === 'confirm' ? 'accent-foreground' : 'accent-soft-foreground'}
            />
            <Button.Label>{myVote === 'confirm' ? 'You found it' : 'I found it'}</Button.Label>
          </Button>
          <Button
            variant={myVote === 'report' ? 'danger' : 'secondary'}
            size="sm"
            className="flex-1 rounded-full"
            isDisabled={busy}
            onPress={() => vote('report')}
          >
            <Icon
              name="alert-circle"
              size={16}
              color={myVote === 'report' ? 'accent-foreground' : 'accent-soft-foreground'}
            />
            <Button.Label>{myVote === 'report' ? 'Reported' : "It's not there"}</Button.Label>
          </Button>
        </View>
      )}
    </View>
  );
}
