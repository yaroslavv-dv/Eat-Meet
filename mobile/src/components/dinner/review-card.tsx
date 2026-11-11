import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Avatar, Stars } from '@/components/ui/misc';
import { Txt } from '@/components/ui/text';
import { formatShortDate } from '@/domain/dates';
import type { HostRatings } from '@/domain/selectors';
import type { Review } from '@/domain/types';
import { useStore } from '@/state/store';
import { colors, radius, space } from '@/theme/tokens';

export function ReviewCard({ review, showDinner = false }: { review: Review; showDinner?: boolean }) {
  const { data } = useStore();
  const guest = data.users[review.guestId];
  const dinner = data.dinners[review.dinnerId];
  const food = (review.food.quality + review.food.taste + review.food.overall) / 3;
  return (
    <Card style={{ gap: space.sm }}>
      <View style={styles.head}>
        <Avatar user={guest} size={32} />
        <View style={{ flex: 1 }}>
          <Txt variant="callout" weight="700">
            {guest?.firstName ?? 'Guest'}
          </Txt>
          <Txt variant="caption" color="muted">
            {showDinner && dinner ? `${dinner.title} · ` : ''}
            {formatShortDate(review.createdAt)}
          </Txt>
        </View>
      </View>
      <View style={styles.scores}>
        <View style={styles.score}>
          <Txt variant="caption" color="muted">
            Food
          </Txt>
          <Stars value={food} size={12} />
        </View>
        <View style={styles.score}>
          <Txt variant="caption" color="muted">
            Hygiene
          </Txt>
          <Stars value={review.hygiene} size={12} color={colors.forestSoft} />
        </View>
      </View>
      {review.comment ? (
        <Txt variant="callout" color="inkSoft">
          “{review.comment}”
        </Txt>
      ) : null}
    </Card>
  );
}

/** Food & hygiene summary computed from saved reviews. */
export function RatingSummary({ ratings }: { ratings: HostRatings }) {
  if (ratings.count === 0 || ratings.food == null || ratings.hygiene == null) {
    return (
      <View style={styles.summaryEmpty}>
        <Txt variant="callout" weight="600">
          No reviews yet
        </Txt>
        <Txt variant="footnote" color="muted">
          Ratings appear after guests attend a completed dinner.
        </Txt>
      </View>
    );
  }
  return (
    <View style={styles.summary}>
      <SummaryCell label="Food" value={ratings.food} detail={`Taste ${ratings.taste?.toFixed(1)} · Quality ${ratings.quality?.toFixed(1)}`} />
      <View style={styles.vr} />
      <SummaryCell label="Hygiene" value={ratings.hygiene} detail="Guest-reported" />
      <View style={styles.vr} />
      <View style={styles.cell}>
        <Txt variant="number">{ratings.count}</Txt>
        <Txt variant="caption" color="muted">
          reviews
        </Txt>
      </View>
    </View>
  );
}

function SummaryCell({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <View style={styles.cell}>
      <Txt variant="number">{value.toFixed(1)}</Txt>
      <Txt variant="caption" weight="700">
        {label} ★
      </Txt>
      <Txt variant="caption" color="muted" align="center" style={{ fontSize: 10, lineHeight: 13 }}>
        {detail}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  scores: { flexDirection: 'row', gap: space.xl },
  score: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summary: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.sageSoft,
    borderRadius: radius.md,
    paddingVertical: space.lg,
  },
  summaryEmpty: { backgroundColor: colors.sand, borderRadius: radius.md, padding: space.lg, gap: 2 },
  cell: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: space.xs },
  vr: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.sageDeep },
});
