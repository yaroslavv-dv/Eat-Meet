import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TextField } from '@/components/ui/form';
import { Avatar, EmptyState, Notice, StarInput } from '@/components/ui/misc';
import { StackScreen } from '@/components/ui/screen';
import { Txt } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { formatLongDate } from '@/domain/dates';
import { reviewEligibility } from '@/domain/rules';
import { useStore } from '@/state/store';
import { space } from '@/theme/tokens';
import { goBack } from '@/lib/navigation';

export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, now, currentUser, actions } = useStore();
  const toast = useToast();
  const [food, setFood] = useState({ quality: 0, taste: 0, overall: 0 });
  const [hygiene, setHygiene] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reservation = id ? data.reservations[id] : undefined;
  const dinner = reservation ? data.dinners[reservation.dinnerId] : undefined;
  if (!reservation || !dinner || reservation.guestId !== currentUser.id) {
    return (
      <StackScreen title="Review" variant="close" modal>
        <EmptyState icon="star" title="Nothing to review" message="This reservation could not be found." />
      </StackScreen>
    );
  }
  const host = data.users[dinner.hostId];
  const eligibility = reviewEligibility(data, reservation, now);
  const complete = food.quality > 0 && food.taste > 0 && food.overall > 0 && hygiene > 0;

  const submit = () => {
    const r = actions.submitReview({ reservationId: reservation.id, food, hygiene, comment });
    if (!r.ok) {
      setError(r.error);
      return;
    }
    goBack();
    toast(`Thanks! Your review of ${host?.firstName}’s dinner is saved`);
  };

  return (
    <StackScreen
      title="Rate your dinner"
      variant="close"
      modal
      footer={<Button title="Submit review" onPress={submit} disabled={!complete || !eligibility.allowed} />}>
      <Card style={styles.head}>
        <Avatar user={host} size={44} />
        <View style={{ flex: 1 }}>
          <Txt variant="headline">{dinner.title}</Txt>
          <Txt variant="footnote" color="muted">
            Hosted by {host?.firstName} · {formatLongDate(dinner.startsAt)}
          </Txt>
        </View>
      </Card>

      {!eligibility.allowed ? <Notice tone="warning" icon="lock" title="Review not available">{eligibility.reason}</Notice> : null}
      {error ? <Notice tone="danger">{error}</Notice> : null}

      <View style={{ gap: space.lg }}>
        <Txt variant="title2">Food</Txt>
        <RatingRow label="Quality" hint="Fresh ingredients, well prepared" value={food.quality} onChange={(v) => setFood({ ...food, quality: v })} />
        <RatingRow label="Taste" hint="How good did it taste?" value={food.taste} onChange={(v) => setFood({ ...food, taste: v })} />
        <RatingRow label="Overall experience" hint="The evening as a whole" value={food.overall} onChange={(v) => setFood({ ...food, overall: v })} />
      </View>

      <View style={{ gap: space.lg }}>
        <Txt variant="title2">Hygiene</Txt>
        <RatingRow label="Cleanliness & food handling" hint="What you observed in the kitchen and at the table" value={hygiene} onChange={setHygiene} />
        <Notice tone="neutral">
          Hygiene ratings reflect your personal experience as a guest. They are not an official food-safety inspection.
        </Notice>
      </View>

      <TextField
        label="Comment"
        optional
        value={comment}
        onChangeText={setComment}
        multiline
        maxLength={400}
        placeholder="What made this dinner special?"
      />
    </StackScreen>
  );
}

function RatingRow({ label, hint, value, onChange }: { label: string; hint: string; value: number; onChange: (v: number) => void }) {
  return (
    <Card style={{ gap: space.sm }}>
      <View>
        <Txt variant="headline">{label}</Txt>
        <Txt variant="footnote" color="muted">
          {hint}
        </Txt>
      </View>
      <StarInput value={value} onChange={onChange} label={label} />
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
});
