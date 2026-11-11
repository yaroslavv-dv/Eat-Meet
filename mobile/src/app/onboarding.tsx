import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wordmark } from '@/components/app/brand';
import { DinnerImage } from '@/components/dinner/dinner-image';
import { Button } from '@/components/ui/button';
import { CheckRow } from '@/components/ui/form';
import { Icon, type IconName } from '@/components/ui/icon';
import { Avatar, Notice } from '@/components/ui/misc';
import { Txt } from '@/components/ui/text';
import { demoImage, type DemoImageKey } from '@/data/images';
import { formatEUR } from '@/domain/money';
import type { AppMode, ID } from '@/domain/types';
import { useStore } from '@/state/store';
import { chart, colors, gutter, radius, shadow, space } from '@/theme/tokens';

interface Slide {
  key: string;
  image: DemoImageKey;
  overline: string;
  title: string;
  body: string;
  icon: IconName;
}

const SLIDES: Slide[] = [
  {
    key: 'share',
    image: 'onboarding/dinner-friends',
    overline: 'Welcome to Eat&Meet',
    title: 'Share a table.\nShare the cost.\nMake a connection.',
    body: 'Home-cooked dinners hosted by neighbours in Groningen.',
    icon: 'heart',
  },
  {
    key: 'discover',
    image: 'onboarding/cooking-together',
    overline: 'Discover',
    title: 'Home-cooked dinners around you',
    body: 'Browse real menus, full ingredient lists and allergen declarations before you book a seat.',
    icon: 'forkKnife',
  },
  {
    key: 'cost',
    image: 'meals/risotto',
    overline: 'Transparent costs',
    title: 'Split the food cost, fairly',
    body: 'You chip in for ingredients, the host earns a small preparation fee, and a transparent fee keeps the platform running.',
    icon: 'euro',
  },
  {
    key: 'meet',
    image: 'onboarding/hands-cooking',
    overline: 'Your pace',
    title: 'Meet people – or just eat',
    body: 'Pick “Eat & Meet” for a chatty long table, “Just Eat” for a relaxed meal, or “Flexible” for a bit of both.',
    icon: 'chat',
  },
  {
    key: 'waste',
    image: 'onboarding/ingredients',
    overline: 'Less waste by design',
    title: 'Cook for who’s coming',
    body: 'Menus are published 24 hours ahead and hosts shop for confirmed diners – then record what was left.',
    icon: 'leaf',
  },
];

export default function OnboardingScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { data, actions } = useStore();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [page, setPage] = useState(0);
  const [adult, setAdult] = useState(data.session.adultConfirmed);
  const [persona, setPersona] = useState<{ userId: ID; mode: AppMode }>({ userId: 'u_sofia', mode: 'guest' });
  const total = SLIDES.length + 1;
  const imageHeight = Math.round(height * 0.5);

  const goTo = (i: number) => {
    scrollRef.current?.scrollTo({ x: i * width, animated: true });
    setPage(i);
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== page) setPage(i);
  };

  const personas = Object.values(data.users).filter((u) => u.demoPersona);

  return (
    <View style={styles.root}>
      <StatusBar style={page < SLIDES.length ? 'light' : 'dark'} />
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        scrollEventThrottle={16}
        bounces={false}>
        {SLIDES.map((s, i) => (
          <View key={s.key} style={{ width }}>
            <View style={{ height: imageHeight }}>
              <DinnerImage image={demoImage(s.image)} style={StyleSheet.absoluteFill} showLabel={false} />
              <View style={styles.imageFade} />
              {i === 0 ? (
                <View style={[styles.brandOnImage, { top: insets.top + space.lg }]}>
                  <Wordmark size={30} light withMark />
                </View>
              ) : null}
              {s.key === 'cost' ? <CostPreview /> : null}
            </View>
            <View style={styles.copy}>
              <View style={styles.iconBadge}>
                <Icon name={s.icon} size={18} color={colors.paper} />
              </View>
              <Txt variant="overline" color="terracottaDeep">
                {s.overline}
              </Txt>
              <Txt variant={i === 0 ? 'hero' : 'display'}>{s.title}</Txt>
              <Txt variant="body" color="inkSoft">
                {s.body}
              </Txt>
            </View>
          </View>
        ))}

        {/* Final page – adult confirmation and demo profile */}
        <ScrollView style={{ width }} contentContainerStyle={[styles.final, { paddingTop: insets.top + space.xl }]} showsVerticalScrollIndicator={false}>
          <Wordmark size={30} withMark />
          <View style={{ gap: space.sm }}>
            <Txt variant="display">Let’s set the table</Txt>
            <Txt variant="callout" color="muted">
              No sign-up needed for this demo. Pick who you want to be – you can switch at any time.
            </Txt>
          </View>
          <View style={{ gap: space.md }}>
            {personas.map((u) => {
              const m = u.demoPersona!.defaultMode;
              const selected = persona.userId === u.id;
              return (
                <Pressable
                  key={u.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setPersona({ userId: u.id, mode: m })}
                  style={[styles.persona, selected && styles.personaOn]}>
                  <Avatar user={u} size={48} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt variant="headline">
                      {u.firstName} · {m === 'host' ? 'Host' : 'Guest'}
                    </Txt>
                    <Txt variant="footnote" color="muted" numberOfLines={2}>
                      {m === 'host' ? 'Home cook in the Oosterpoort. Manage dinners, bookings and the shopping list.' : 'Student, new in town. Discover dinners and reserve a seat.'}
                    </Txt>
                  </View>
                  <View style={[styles.radio, selected && styles.radioOn]}>{selected ? <View style={styles.radioDot} /> : null}</View>
                </Pressable>
              );
            })}
          </View>
          <CheckRow
            checked={adult}
            onChange={setAdult}
            title="I confirm I am 18 or older"
            description="Eat&Meet is for adults only. All demo profiles are adults."
          />
          <Notice tone="demo" title="Demonstration mode">
            Data stays on this phone. No real payments and no real hosts. Host–guest matching only uses AI embeddings when an OpenAI key is configured.
          </Notice>
        </ScrollView>
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
        <View style={styles.dots}>
          {Array.from({ length: total }).map((_, i) => (
            <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>
        {page < SLIDES.length ? (
          <View style={styles.bottomRow}>
            <Button title="Skip" variant="ghost" size="md" onPress={() => goTo(SLIDES.length)} />
            <Button title={page === 0 ? 'Get started' : 'Next'} iconRight="arrowRight" onPress={() => goTo(page + 1)} style={{ flex: 1 }} />
          </View>
        ) : (
          <Button
            title="Start exploring"
            variant="accent"
            disabled={!adult}
            onPress={() => actions.completeOnboarding(persona.userId, persona.mode)}
            fullWidth
          />
        )}
      </View>
    </View>
  );
}

function CostPreview() {
  const rows = [
    { label: 'Ingredients', value: 561, color: chart.series1 },
    { label: 'Host preparation', value: 150, color: chart.series2 },
    { label: 'Platform fee', value: 71, color: chart.series3 },
  ];
  return (
    <Animated.View entering={FadeInDown.delay(200)} style={styles.costCard}>
      <Txt variant="overline" color="muted">
        Example · per guest
      </Txt>
      {rows.map((r) => (
        <View key={r.label} style={styles.costRow}>
          <View style={[styles.swatch, { backgroundColor: r.color }]} />
          <Txt variant="footnote" style={{ flex: 1 }}>
            {r.label}
          </Txt>
          <Txt variant="footnote" weight="700">
            {formatEUR(r.value)}
          </Txt>
        </View>
      ))}
      <View style={[styles.costRow, styles.costTotal]}>
        <Txt variant="callout" weight="700" style={{ flex: 1 }}>
          Total
        </Txt>
        <Txt variant="callout" weight="700" color="forest">
          {formatEUR(782)}
        </Txt>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  imageFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '45%',
    backgroundImage: `linear-gradient(180deg, rgba(250,248,242,0) 0%, ${colors.cream} 100%)`,
  },
  brandOnImage: {
    position: 'absolute',
    left: gutter,
    backgroundColor: 'rgba(22,63,47,0.55)',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.lg,
  },
  copy: { paddingHorizontal: gutter + 4, gap: space.md, marginTop: -space.xxl },
  iconBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  final: { paddingHorizontal: gutter, gap: space.xl, paddingBottom: 200 },
  persona: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  personaOn: { borderColor: colors.forest, backgroundColor: colors.sageSoft },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.forest },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.forest },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: gutter,
    paddingTop: space.md,
    gap: space.md,
    backgroundColor: colors.cream,
  },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.lineStrong },
  dotActive: { width: 22, backgroundColor: colors.forest },
  costCard: {
    position: 'absolute',
    right: gutter,
    bottom: space.huge + space.lg,
    width: 220,
    padding: space.lg,
    gap: space.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.paper,
    ...shadow.raised,
  },
  costRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  costTotal: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.lineStrong, paddingTop: space.sm },
  swatch: { width: 10, height: 10, borderRadius: 3 },
});
