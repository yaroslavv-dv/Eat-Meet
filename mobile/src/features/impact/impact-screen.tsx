import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { TabHeader } from '@/components/app/tab-header';
import { Card, PressableCard } from '@/components/ui/card';
import { Segmented } from '@/components/ui/form';
import { Icon, type IconName } from '@/components/ui/icon';
import { EmptyState, SectionHeader } from '@/components/ui/misc';
import { TabScreen } from '@/components/ui/screen';
import { Txt } from '@/components/ui/text';
import { LEFTOVER_HANDLING_LABEL, RULES } from '@/domain/constants';
import { formatShortDate } from '@/domain/dates';
import { computeImpact, type ImpactScope } from '@/domain/impact';
import { formatEUR } from '@/domain/money';
import type { LeftoverHandling } from '@/domain/types';
import { useStore } from '@/state/store';
import { chart, colors, space } from '@/theme/tokens';

type ScopeKey = 'community' | 'mine';

export function ImpactScreen() {
  const { data, now, currentUser, mode } = useStore();
  const [scopeKey, setScopeKey] = useState<ScopeKey>('community');
  const scope: ImpactScope = scopeKey === 'community' ? { kind: 'community' } : { kind: 'mine', userId: currentUser.id, mode };
  const impact = computeImpact(data, scope, now);
  const t = impact.totals;
  const leftoverShare = t.portionsPrepared > 0 ? t.leftoverPortions / t.portionsPrepared : 0;
  const openPlates = t.upcomingFullTableServings - t.upcomingConfirmedServings;
  const maxPlanned = Math.max(1, ...impact.completed.map((c) => Math.max(c.report.plannedServings, c.report.portionsPrepared)));
  const avgPerGuest = impact.money.count > 0 ? Math.round(impact.money.totalCents / impact.money.count) : 0;

  return (
    <TabScreen>
      <TabHeader overline="Sustainability" title="Impact" />

      <Segmented<ScopeKey>
        value={scopeKey}
        onChange={setScopeKey}
        options={[
          { value: 'community', label: 'All dinners (demo)' },
          { value: 'mine', label: mode === 'host' ? 'Dinners I hosted' : 'Dinners I joined' },
        ]}
      />

      {/* Mechanism */}
      <Card tone="forest" style={{ gap: space.lg }}>
        <View style={{ gap: space.xs }}>
          <Txt variant="overline" color="onDarkMuted">
            How Eat&Meet can cut unnecessary buying
          </Txt>
          <Txt variant="title1" color="onDark">
            Plan portions from real bookings – then measure what’s left.
          </Txt>
        </View>
        <View style={{ gap: space.md }}>
          <MechanismStep icon="clock" n={1} title={`Menu published ≥ ${RULES.publishLeadTimeHours} h ahead`} body="Ingredients and quantities per plate are known before anyone shops." />
          <MechanismStep icon="people" n={2} title="Guests reserve seats" body="Every booking adds one plate to the plan – empty seats add nothing." />
          <MechanismStep icon="cart" n={3} title="Shopping list sized to confirmed diners" body="Per-plate quantities follow bookings, not guesses." />
          <MechanismStep icon="recycle" n={4} title="Host records portions & leftovers" body="Measured data, dinner by dinner." last />
        </View>
      </Card>

      {/* KPIs */}
      <View style={styles.kpis}>
        <Kpi label="Dinners completed" value={String(t.dinnersCompleted)} />
        <Kpi label="Plates planned" value={String(t.portionsPlanned)} detail="full tables" />
        <Kpi label="Portions served" value={String(t.portionsServed)} detail={`of ${t.portionsPrepared} prepared`} />
        <Kpi
          label="Leftover portions"
          value={String(t.leftoverPortions)}
          detail={t.portionsPrepared ? `${Math.round(leftoverShare * 100)}% of prepared · host estimate` : 'no reports yet'}
        />
      </View>

      {/* Upcoming planning */}
      <View style={{ gap: space.md }}>
        <SectionHeader title="Planning in action" subtitle="Upcoming dinners: plates to shop for now vs. a full table." />
        {impact.upcoming.length === 0 ? (
          <Card tone="sand" elevated={false}>
            <EmptyState compact icon="calendar" title="No upcoming dinners" message="Planned plates appear here once dinners are published." />
          </Card>
        ) : (
          <Card style={{ gap: space.lg }}>
            <View style={styles.headline}>
              <Txt variant="number" color="forest">
                {openPlates}
              </Txt>
              <Txt variant="callout" color="inkSoft" style={{ flex: 1 }}>
                plates not bought (yet) because seats are still open – about {formatEUR(t.openSeatIngredientCents)} of per-plate ingredients
                that no one has to buy unless guests book.
              </Txt>
            </View>
            <Legend items={[{ color: chart.series1, label: 'Booked plates (incl. host)' }, { color: chart.track, label: 'Open seats', outline: true }]} />
            {impact.upcoming.slice(0, 8).map((row) => (
              <PressableCard
                key={row.dinner.id}
                elevated={false}
                tone="cream"
                padding={space.md}
                onPress={() =>
                  row.dinner.hostId === currentUser.id
                    ? router.push({ pathname: '/host/shopping/[id]', params: { id: row.dinner.id } })
                    : router.push({ pathname: '/dinner/[id]', params: { id: row.dinner.id } })
                }
                style={{ gap: 6 }}>
                <View style={styles.rowHead}>
                  <Txt variant="footnote" weight="600" numberOfLines={1} style={{ flex: 1 }}>
                    {row.dinner.title}
                  </Txt>
                  <Txt variant="footnote" color="muted">
                    shop for {row.confirmedServings} of {row.fullTableServings}
                  </Txt>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { flex: row.confirmedServings, backgroundColor: chart.series1 }]} />
                  {row.fullTableServings - row.confirmedServings > 0 ? <View style={{ flex: row.fullTableServings - row.confirmedServings }} /> : null}
                </View>
              </PressableCard>
            ))}
          </Card>
        )}
      </View>

      {/* Completed dinners */}
      <View style={{ gap: space.md }}>
        <SectionHeader title="Measured after dinner" subtitle="Portions served and leftovers, as recorded by hosts." />
        {impact.completed.length === 0 ? (
          <Card tone="sand" elevated={false}>
            <EmptyState
              compact
              icon="recycle"
              title="No measurements yet"
              message="When hosts wrap up a dinner, served portions and leftovers show up here."
            />
          </Card>
        ) : (
          <Card style={{ gap: space.lg }}>
            <Legend
              items={[
                { color: chart.series2, label: 'Served' },
                { color: chart.series3, label: 'Leftover' },
                { color: chart.track, label: 'Planned, not prepared', outline: true },
              ]}
            />
            {impact.completed.map(({ dinner, report }) => {
              const notPrepared = Math.max(0, report.plannedServings - report.portionsPrepared);
              return (
                <View key={dinner.id} style={{ gap: 6 }} accessible accessibilityLabel={`${dinner.title}: ${report.portionsServed} served, ${report.leftoverPortions} leftover, ${report.plannedServings} planned`}>
                  <View style={styles.rowHead}>
                    <Txt variant="footnote" weight="600" numberOfLines={1} style={{ flex: 1 }}>
                      {dinner.title}
                    </Txt>
                    <Txt variant="caption" color="muted">
                      {formatShortDate(dinner.startsAt)}
                    </Txt>
                  </View>
                  <View style={[styles.track, { width: `${(Math.max(report.plannedServings, report.portionsPrepared) / maxPlanned) * 100}%` }]}>
                    <View style={[styles.fill, { flex: report.portionsServed, backgroundColor: chart.series2 }]} />
                    {report.leftoverPortions > 0 ? <View style={[styles.fill, { flex: report.leftoverPortions, backgroundColor: chart.series3 }]} /> : null}
                    {notPrepared > 0 ? <View style={{ flex: notPrepared }} /> : null}
                  </View>
                  <Txt variant="caption" color="muted">
                    {report.portionsServed} served · {report.leftoverPortions} leftover · {report.plannedServings} planned
                    {report.leftoverPortions > 0 ? ` · ${LEFTOVER_HANDLING_LABEL[report.leftoverHandling].toLowerCase()}` : ''}
                  </Txt>
                </View>
              );
            })}
          </Card>
        )}
        {Object.keys(impact.leftoverHandling).length > 0 ? (
          <Card style={{ gap: space.sm }}>
            <Txt variant="title3">What happened to leftovers</Txt>
            {(Object.entries(impact.leftoverHandling) as [LeftoverHandling, number][]).map(([k, v]) => (
              <View key={k} style={styles.rowHead}>
                <Txt variant="callout" color="inkSoft" style={{ flex: 1 }}>
                  {LEFTOVER_HANDLING_LABEL[k]}
                </Txt>
                <Txt variant="callout" weight="700">
                  {v} {v === 1 ? 'dinner' : 'dinners'}
                </Txt>
              </View>
            ))}
          </Card>
        ) : null}
      </View>

      {/* Cost sharing */}
      <View style={{ gap: space.md }}>
        <SectionHeader title="Cost sharing" subtitle="Simulated contributions, net of refunds." />
        {impact.money.count === 0 ? (
          <Card tone="sand" elevated={false}>
            <EmptyState compact icon="euro" title="No contributions yet" message="Reserve a seat to see how costs are shared." />
          </Card>
        ) : (
          <Card style={{ gap: space.md }}>
            <View style={styles.headline}>
              <Txt variant="number">{formatEUR(impact.money.totalCents)}</Txt>
              <Txt variant="footnote" color="muted" style={{ flex: 1 }}>
                from {impact.money.count} {impact.money.count === 1 ? 'seat' : 'seats'} · avg. {formatEUR(avgPerGuest)} per guest
              </Txt>
            </View>
            <View style={styles.split}>
              {[impact.money.ingredientCents, impact.money.hostCents, impact.money.platformCents].map((v, i) =>
                v > 0 ? <View key={i} style={{ flex: v, backgroundColor: [chart.series1, chart.series2, chart.series3][i] }} /> : null,
              )}
            </View>
            <SplitRow color={chart.series1} label="Ingredients (to hosts for shopping)" value={impact.money.ingredientCents} total={impact.money.totalCents} />
            <SplitRow color={chart.series2} label="Host preparation" value={impact.money.hostCents} total={impact.money.totalCents} />
            <SplitRow color={chart.series3} label="Eat&Meet platform fee" value={impact.money.platformCents} total={impact.money.totalCents} />
            {t.reportsWithSpend > 0 ? (
              <Txt variant="footnote" color="muted">
                {t.reportsWithSpend} hosts recorded receipts: {formatEUR(t.actualSpendCents)} actual vs {formatEUR(t.estimatedBudgetCents)} estimated.
              </Txt>
            ) : null}
          </Card>
        )}
      </View>

      {/* Assumptions */}
      <Card tone="sand" elevated={false} style={{ gap: space.md }}>
        <View style={styles.rowHead}>
          <Icon name="info" size={18} color={colors.inkSoft} />
          <Txt variant="title3" style={{ flex: 1 }}>
            Assumptions & limits
          </Txt>
        </View>
        {[
          'All figures are calculated from demo data stored on this device – not from real users.',
          'Leftover portions are host estimates, not weighed.',
          '“Plates not bought” compares planning for confirmed diners with planning for a full table. It is not a measured reduction in food waste.',
          'We do not calculate CO₂ savings. Validating real impact needs a pilot that compares how participants would otherwise eat.',
          'Next steps: receipt photos, weighed leftovers and a Groningen pilot.',
        ].map((line) => (
          <View key={line} style={styles.bullet}>
            <View style={styles.dot} />
            <Txt variant="footnote" color="inkSoft" style={{ flex: 1 }}>
              {line}
            </Txt>
          </View>
        ))}
      </Card>
    </TabScreen>
  );
}

function MechanismStep({ icon, n, title, body, last }: { icon: IconName; n: number; title: string; body: string; last?: boolean }) {
  return (
    <View style={styles.mech}>
      <View style={{ alignItems: 'center' }}>
        <View style={styles.mechIcon}>
          <Icon name={icon} size={16} color={colors.forest} />
        </View>
        {!last ? <View style={styles.mechLine} /> : null}
      </View>
      <View style={{ flex: 1, gap: 2, paddingBottom: last ? 0 : space.sm }}>
        <Txt variant="callout" weight="700" color="onDark">
          {n}. {title}
        </Txt>
        <Txt variant="footnote" color="onDarkMuted">
          {body}
        </Txt>
      </View>
    </View>
  );
}

function Kpi({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card style={styles.kpi} padding={space.lg}>
      <Txt variant="number">{value}</Txt>
      <Txt variant="caption" weight="700">
        {label}
      </Txt>
      {detail ? (
        <Txt variant="caption" color="muted">
          {detail}
        </Txt>
      ) : null}
    </Card>
  );
}

function Legend({ items }: { items: { color: string; label: string; outline?: boolean }[] }) {
  return (
    <View style={styles.legend}>
      {items.map((i) => (
        <View key={i.label} style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: i.color }, i.outline && { borderWidth: 1, borderColor: colors.lineStrong }]} />
          <Txt variant="caption" color="inkSoft">
            {i.label}
          </Txt>
        </View>
      ))}
    </View>
  );
}

function SplitRow({ color, label, value, total }: { color: string; label: string; value: number; total: number }) {
  return (
    <View style={styles.rowHead}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Txt variant="callout" color="inkSoft" style={{ flex: 1 }}>
        {label}
      </Txt>
      <Txt variant="callout" weight="600" style={{ fontVariant: ['tabular-nums'] }}>
        {formatEUR(value)}
      </Txt>
      <Txt variant="caption" color="muted" style={{ width: 36, textAlign: 'right' }}>
        {total ? Math.round((value / total) * 100) : 0}%
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  kpi: { width: '47.8%', flexGrow: 1, gap: 2 },
  headline: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  track: {
    flexDirection: 'row',
    height: 14,
    gap: 2,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: chart.track,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineStrong,
  },
  fill: { borderRadius: 3 },
  split: { flexDirection: 'row', height: 14, gap: 2, borderRadius: 4, overflow: 'hidden' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  mech: { flexDirection: 'row', gap: space.md },
  mechIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
  mechLine: { flex: 1, width: 2, backgroundColor: 'rgba(220,233,220,0.35)', marginTop: 4 },
  bullet: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.muted, marginTop: 7 },
});
