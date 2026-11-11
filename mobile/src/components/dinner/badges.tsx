import { Tag, type TagTone } from '@/components/ui/chip';
import type { IconName } from '@/components/ui/icon';
import { DIET_LABEL, SOCIAL_LABEL } from '@/domain/constants';
import type { DietClass, DinnerDisplayStatus, ReservationStatus, SocialStyle } from '@/domain/types';

const DINNER_STATUS: Record<DinnerDisplayStatus, { label: string; tone: TagTone; icon: IconName }> = {
  draft: { label: 'Draft', tone: 'neutral', icon: 'edit' },
  published: { label: 'Open for booking', tone: 'sage', icon: 'checkCircle' },
  fully_booked: { label: 'Fully booked', tone: 'terracotta', icon: 'people' },
  awaiting_completion: { label: 'Wrap-up needed', tone: 'warning', icon: 'clock' },
  completed: { label: 'Completed', tone: 'info', icon: 'check' },
  cancelled: { label: 'Cancelled', tone: 'danger', icon: 'cancel' },
};

export function DinnerStatusBadge({ status, size }: { status: DinnerDisplayStatus; size?: 'sm' | 'md' }) {
  const s = DINNER_STATUS[status];
  return <Tag label={s.label} tone={s.tone} icon={s.icon} size={size} />;
}

const RESERVATION_STATUS: Record<ReservationStatus | 'awaiting', { label: string; tone: TagTone; icon: IconName }> = {
  confirmed: { label: 'Confirmed', tone: 'sage', icon: 'checkCircle' },
  awaiting: { label: 'Awaiting host check-in', tone: 'warning', icon: 'clock' },
  attended: { label: 'Attended', tone: 'info', icon: 'check' },
  no_show: { label: 'Not attended', tone: 'neutral', icon: 'block' },
  cancelled: { label: 'Cancelled', tone: 'danger', icon: 'cancel' },
};

export function ReservationStatusBadge({ status, size }: { status: ReservationStatus | 'awaiting'; size?: 'sm' | 'md' }) {
  const s = RESERVATION_STATUS[status];
  return <Tag label={s.label} tone={s.tone} icon={s.icon} size={size} />;
}

export function DietTag({ diet, size }: { diet: DietClass; size?: 'sm' | 'md' }) {
  return <Tag label={DIET_LABEL[diet]} tone={diet === 'omnivore' ? 'neutral' : 'sage'} icon="leaf" size={size} />;
}

export const SOCIAL_ICON: Record<SocialStyle, IconName> = {
  eat_meet: 'chat',
  just_eat: 'forkKnife',
  flexible: 'flexible',
};

export function SocialTag({ social, size }: { social: SocialStyle; size?: 'sm' | 'md' }) {
  return <Tag label={SOCIAL_LABEL[social]} tone={social === 'eat_meet' ? 'terracotta' : 'neutral'} icon={SOCIAL_ICON[social]} size={size} />;
}
