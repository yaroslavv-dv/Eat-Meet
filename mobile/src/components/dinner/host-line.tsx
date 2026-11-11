import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Avatar } from '@/components/ui/misc';
import { Txt } from '@/components/ui/text';
import { hostRatings } from '@/domain/selectors';
import type { User } from '@/domain/types';
import { useStore } from '@/state/store';
import { colors, space } from '@/theme/tokens';

/** "Hosted by Marieke · ★ 4.7 (8)" – ratings only when real review records exist. */
export function HostLine({ host, size = 28, light = false }: { host: User | undefined; size?: number; light?: boolean }) {
  const { data } = useStore();
  const ratings = host ? hostRatings(data, host.id) : null;
  return (
    <View style={styles.row}>
      <Avatar user={host} size={size} />
      <Txt variant="footnote" color={light ? 'onDark' : 'inkSoft'} numberOfLines={1} style={{ flexShrink: 1 }}>
        Hosted by <Txt variant="footnote" weight="700" color={light ? 'onDark' : 'ink'}>{host?.firstName ?? 'Unknown'}</Txt>
      </Txt>
      {ratings && ratings.count > 0 && ratings.food != null ? (
        <View style={styles.rating}>
          <Icon name="star" size={12} color={colors.honey} />
          <Txt variant="footnote" weight="700" color={light ? 'onDark' : 'ink'}>
            {ratings.food.toFixed(1)}
          </Txt>
          <Txt variant="footnote" color={light ? 'onDarkMuted' : 'muted'}>
            ({ratings.count})
          </Txt>
        </View>
      ) : (
        <Txt variant="footnote" color={light ? 'onDarkMuted' : 'muted'}>
          · New host
        </Txt>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});
