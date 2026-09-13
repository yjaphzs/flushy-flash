import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';

type Benefit = {
  icon: IconName;
  title: string;
  /** One line, reading as a continuation of the title. ReactNode so the campus
   *  domain can be a tinted run. */
  detail: React.ReactNode;
};

/**
 * What an account actually buys, drawn from what firestore.rules gates today —
 * not aspirational copy. Every entry here maps to a write path a guest is
 * refused, so the pitch cannot drift away from the product.
 */
const BENEFITS: Benefit[] = [
  { icon: 'plus', title: 'Add restrooms', detail: 'So the next person can find them too.' },
  { icon: 'star', title: 'Rate and review', detail: 'One per restroom, always yours to edit.' },
  { icon: 'heart', title: 'Save favourites', detail: 'Keep the ones worth walking to.' },
  {
    icon: 'badge-check',
    title: 'Student badge',
    detail: 'A CLSU address unlocks editing shared entries.',
  },
];

/**
 * One benefit, as a card rather than a check-row.
 *
 * Local to this file on purpose: it has exactly one consumer, and a shared
 * `BenefitCard` in components/ would be a component invented for a single call
 * site. If a second screen ever needs it, that is when it moves.
 *
 * The icon is tinted `accent`, not `success`. Check-mark semantics belonged to
 * the old rows — these are capabilities, not a list of things already done.
 */
function BenefitCard({ icon, title, detail }: Benefit) {
  return (
    <View
      className="flex-row items-center gap-3.5 rounded-2xl border border-border bg-surface px-4 py-3.5"
      style={{ borderCurve: 'continuous' }}
    >
      <View
        className="size-11 items-center justify-center rounded-xl bg-accent-soft"
        style={{ borderCurve: 'continuous' }}
      >
        <Icon name={icon} size={20} color="accent" />
      </View>
      <View className="flex-1 gap-0.5">
        <Text type="body" className="font-semibold">
          {title}
        </Text>
        <Text type="body-sm" color="muted">
          {detail}
        </Text>
      </View>
    </View>
  );
}

/**
 * Rendered as a plain column rather than through @/components/common/list: the
 * house rule against ScrollView + .map() targets data lists, and this is fixed
 * chrome — the same pattern submit.tsx uses for its amenity toggles.
 *
 * Shared by Profile, /join and the submit gate deliberately. They are the same
 * pitch behind three different doors, so restyling one and not the others would
 * read as an oversight rather than a distinction.
 */
export function JoinBenefits({ className }: { className?: string }) {
  return (
    <View className={className ?? 'gap-2.5'}>
      {BENEFITS.map((benefit) => (
        <BenefitCard key={benefit.title} {...benefit} />
      ))}
    </View>
  );
}
