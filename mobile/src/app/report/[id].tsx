import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/form';
import { EmptyState, Notice } from '@/components/ui/misc';
import { OptionCard } from '@/components/ui/option-card';
import { StackScreen } from '@/components/ui/screen';
import { Txt } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { CONCERN_REASON_LABEL } from '@/domain/constants';
import type { ConcernReason } from '@/domain/types';
import { useStore } from '@/state/store';
import { space } from '@/theme/tokens';
import { goBack } from '@/lib/navigation';

const REASONS: ConcernReason[] = ['safety', 'hygiene', 'misleading', 'behaviour', 'other'];

export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, actions } = useStore();
  const toast = useToast();
  const [reason, setReason] = useState<ConcernReason>('safety');
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const dinner = id ? data.dinners[id] : undefined;

  if (!dinner) {
    return (
      <StackScreen title="Report" variant="close" modal>
        <EmptyState icon="flag" title="Dinner not found" message="This dinner could not be found." />
      </StackScreen>
    );
  }

  const submit = () => {
    const r = actions.fileConcern({ dinnerId: dinner.id, reason, details });
    if (!r.ok) {
      setError(r.error);
      return;
    }
    goBack();
    toast('Thanks – your report was saved');
  };

  return (
    <StackScreen
      title="Report a concern"
      subtitle={dinner.title}
      variant="close"
      modal
      footer={<Button title="Send report" icon="flag" onPress={submit} disabled={details.trim().length < 10} />}>
      <Notice tone="danger" icon="warning" title="In an emergency, call 112">
        If someone is in danger or having a severe allergic reaction, contact emergency services first.
      </Notice>
      <View style={{ gap: space.sm }}>
        <Txt variant="title3">What is it about?</Txt>
        {REASONS.map((r) => (
          <OptionCard key={r} title={CONCERN_REASON_LABEL[r]} selected={reason === r} onPress={() => setReason(r)} />
        ))}
      </View>
      <TextField
        label="What happened?"
        value={details}
        onChangeText={(t) => {
          setDetails(t);
          setError(null);
        }}
        multiline
        maxLength={600}
        placeholder="Describe the situation (at least 10 characters)"
        error={error ?? undefined}
      />
      <Notice tone="demo" title="Demo">
        Reports are stored on this device. In production they would go to the Eat&Meet trust & safety team for follow-up.
      </Notice>
    </StackScreen>
  );
}
