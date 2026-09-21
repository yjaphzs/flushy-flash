import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { ACCESS, AMENITIES } from '@/features/restrooms/labels';
import type { RestroomFormState } from '@/features/restrooms/use-restroom-form';

export type SubmitSummaryProps = {
  fields: RestroomFormState;
  onJump: (index: number) => void;
};

/**
 * Everything answered so far, on the last step, each row a way back.
 *
 * A stepper hides its own answers — by the time someone reaches the end they
 * cannot see what they put three pages ago, and the only way to check is to
 * walk backwards and lose their place. This is what makes the final step a
 * confirmation rather than just the last form page.
 *
 * ⚠️ **It shows what is THERE, never a blank row.** An empty "Directions —"
 * line reads as a field that failed to load; an absent one reads as a question
 * the user chose not to answer, which is what actually happened. Same argument
 * `score-bar.tsx` makes about an empty scale reading as a score of zero.
 *
 * The wording comes from `labels.ts`, so the recap and the restroom's own page
 * cannot describe the same amenity differently.
 */

/** Which step set a given row, so tapping it lands in the right place. */
type Row = { step: number; label: string; value: string };

function buildRows(fields: RestroomFormState): Row[] {
  const rows: Row[] = [];

  rows.push({
    step: 0,
    label: 'Location',
    value: fields.building ? `Near ${fields.building.name}` : 'Pin dropped',
  });

  rows.push({
    step: 1,
    label: fields.photos.length === 1 ? '1 photo' : `${fields.photos.length} photos`,
    value: 'Added',
  });

  rows.push({ step: 2, label: 'Landmark', value: fields.landmark.trim() });

  const note = fields.locationNote.trim();
  if (note) rows.push({ step: 2, label: 'Directions', value: note });

  rows.push({ step: 2, label: 'Floor', value: fields.floor });

  if (fields.genderedAs) {
    rows.push({ step: 3, label: 'Who can use it', value: ACCESS[fields.genderedAs] });
  }

  const on = AMENITIES.filter((a) => fields.amenities[a.key] === true).map((a) => a.label);
  if (on.length > 0) rows.push({ step: 3, label: 'Has', value: on.join(', ') });

  return rows;
}

export function SubmitSummary({ fields, onJump }: SubmitSummaryProps) {
  const rows = buildRows(fields);

  return (
    <View className="gap-2">
      <Text type="body" weight="semibold">
        Before you save
      </Text>

      <View
        className="overflow-hidden rounded-2xl border border-border"
        style={{ borderCurve: 'continuous' }}
      >
        {rows.map((row, i) => (
          <Pressable
            key={`${row.step}-${row.label}`}
            onPress={() => onJump(row.step)}
            accessibilityRole="button"
            // The value is the content; without it the row announces only its
            // name, and the whole point is checking what it says.
            accessibilityLabel={`${row.label}: ${row.value}. Edit.`}
            className={`flex-row items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-border' : ''}`}
          >
            <Text type="body-sm" color="muted" className="w-28">
              {row.label}
            </Text>
            <Text type="body-sm" numberOfLines={1} className="flex-1">
              {row.value}
            </Text>
            <Icon name="pencil" size={14} color="muted" />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
