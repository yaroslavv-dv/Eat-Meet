/**
 * Impact metrics. These describe the *planning mechanism* (portions planned vs
 * booked vs served, recorded leftovers) using only data stored in the app.
 * Nothing here estimates CO₂ or claims validated waste reduction.
 */
import { lineCostCents, plannedServings, sumContributions, type MoneySplit } from './pricing';
import { isSeatHolding, isUpcoming, reservationsForDinner, seatsTaken } from './selectors';
import type { AppData, AppMode, Dinner, ID, LeftoverHandling, SustainabilityReport } from './types';

export type ImpactScope = { kind: 'community' } | { kind: 'mine'; userId: ID; mode: AppMode };

export interface PlanningRow {
  dinner: Dinner;
  fullTableServings: number;
  confirmedServings: number;
  /** Per-serving ingredient cost not (yet) needed because seats are still open. */
  openSeatIngredientCents: number;
}

export interface CompletedRow {
  dinner: Dinner;
  report: SustainabilityReport;
}

export interface ImpactSummary {
  upcoming: PlanningRow[];
  completed: CompletedRow[];
  totals: {
    dinnersPublished: number;
    dinnersCompleted: number;
    portionsPlanned: number;
    portionsPrepared: number;
    portionsServed: number;
    leftoverPortions: number;
    reportsWithSpend: number;
    estimatedBudgetCents: number;
    actualSpendCents: number;
    upcomingFullTableServings: number;
    upcomingConfirmedServings: number;
    openSeatIngredientCents: number;
  };
  leftoverHandling: Partial<Record<LeftoverHandling, number>>;
  money: MoneySplit;
}

function inScope(data: AppData, dinner: Dinner, scope: ImpactScope): boolean {
  if (scope.kind === 'community') return true;
  if (scope.mode === 'host') return dinner.hostId === scope.userId;
  return reservationsForDinner(data, dinner.id).some((r) => r.guestId === scope.userId && isSeatHolding(r));
}

export function computeImpact(data: AppData, scope: ImpactScope, now: Date): ImpactSummary {
  const dinners = Object.values(data.dinners).filter((d) => d.status !== 'draft' && inScope(data, d, scope));

  const upcoming: PlanningRow[] = dinners
    .filter((d) => d.status === 'published' && isUpcoming(d, now))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .map((dinner) => {
      const fullTableServings = plannedServings(dinner.guestSeats, dinner.hostEats);
      const confirmedServings = plannedServings(seatsTaken(data, dinner.id), dinner.hostEats);
      const openSeats = fullTableServings - confirmedServings;
      const perServingCost = dinner.ingredients
        .filter((i) => i.scaling === 'per_serving')
        .reduce((sum, i) => sum + lineCostCents(i, 1), 0);
      return { dinner, fullTableServings, confirmedServings, openSeatIngredientCents: perServingCost * openSeats };
    });

  const completed: CompletedRow[] = dinners
    .filter((d) => d.status === 'completed' && data.reports[d.id])
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
    .map((dinner) => ({ dinner, report: data.reports[dinner.id] }));

  const leftoverHandling: Partial<Record<LeftoverHandling, number>> = {};
  completed.forEach(({ report }) => {
    leftoverHandling[report.leftoverHandling] = (leftoverHandling[report.leftoverHandling] ?? 0) + 1;
  });

  const contributions = dinners.flatMap((d) =>
    reservationsForDinner(data, d.id)
      .filter((r) => scope.kind === 'community' || scope.mode === 'host' || r.guestId === scope.userId)
      .map((r) => data.contributions[r.contributionId])
      .filter((c) => c != null),
  );

  const reportsWithSpend = completed.filter((c) => c.report.actualSpendCents != null);

  return {
    upcoming,
    completed,
    leftoverHandling,
    money: sumContributions(contributions),
    totals: {
      dinnersPublished: dinners.filter((d) => d.status !== 'cancelled').length,
      dinnersCompleted: completed.length,
      portionsPlanned: completed.reduce((s, c) => s + c.report.plannedServings, 0),
      portionsPrepared: completed.reduce((s, c) => s + c.report.portionsPrepared, 0),
      portionsServed: completed.reduce((s, c) => s + c.report.portionsServed, 0),
      leftoverPortions: completed.reduce((s, c) => s + c.report.leftoverPortions, 0),
      reportsWithSpend: reportsWithSpend.length,
      estimatedBudgetCents: reportsWithSpend.reduce((s, c) => s + c.report.estimatedBudgetCents, 0),
      actualSpendCents: reportsWithSpend.reduce((s, c) => s + (c.report.actualSpendCents ?? 0), 0),
      upcomingFullTableServings: upcoming.reduce((s, r) => s + r.fullTableServings, 0),
      upcomingConfirmedServings: upcoming.reduce((s, r) => s + r.confirmedServings, 0),
      openSeatIngredientCents: upcoming.reduce((s, r) => s + r.openSeatIngredientCents, 0),
    },
  };
}

