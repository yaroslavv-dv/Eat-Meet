import { assessCompatibility, dietSuits } from './compatibility';
import { addDays, startOfDay } from './dates';
import { dinnerPricing } from './pricing';
import { seatsLeft } from './selectors';
import type { AppData, DietClass, Dinner, Neighborhood, Preferences, SocialStyle } from './types';

export type DateFilter = 'any' | 'today' | 'tomorrow' | 'week' | 'weekend';

export interface DiscoverFilters {
  query: string;
  date: DateFilter;
  maxPriceCents: number | null;
  /** Show dinners suitable for this diet (null = any). */
  suitableFor: DietClass | null;
  alcoholFreeOnly: boolean;
  social: SocialStyle[];
  /** 0 = include fully booked dinners. */
  minSeats: number;
  neighborhoods: Neighborhood[];
  hideAllergenConflicts: boolean;
  matchesMe: boolean;
}

export const DEFAULT_FILTERS: DiscoverFilters = {
  query: '',
  date: 'any',
  maxPriceCents: null,
  suitableFor: null,
  alcoholFreeOnly: false,
  social: [],
  minSeats: 0,
  neighborhoods: [],
  hideAllergenConflicts: false,
  matchesMe: false,
};

export const DATE_FILTER_LABEL: Record<DateFilter, string> = {
  any: 'Any date',
  today: 'Today',
  tomorrow: 'Tomorrow',
  week: 'Next 7 days',
  weekend: 'This weekend',
};

/** Number of active filters, excluding the search query. */
export function activeFilterCount(f: DiscoverFilters): number {
  return [
    f.date !== 'any',
    f.maxPriceCents != null,
    f.suitableFor != null,
    f.alcoholFreeOnly,
    f.social.length > 0,
    f.minSeats > 0,
    f.neighborhoods.length > 0,
    f.hideAllergenConflicts,
    f.matchesMe,
  ].filter(Boolean).length;
}

function matchesDate(startsAt: string, filter: DateFilter, now: Date): boolean {
  if (filter === 'any') return true;
  const start = new Date(startsAt);
  const today = startOfDay(now);
  const day = startOfDay(start).getTime();
  switch (filter) {
    case 'today':
      return day === today.getTime();
    case 'tomorrow':
      return day === addDays(today, 1).getTime();
    case 'week':
      return start.getTime() < addDays(today, 8).getTime();
    case 'weekend': {
      // Saturday and Sunday of the current week (or the coming one if today is not in it).
      const dow = today.getDay();
      const daysToSaturday = dow === 0 ? -1 : 6 - dow;
      const saturday = addDays(today, daysToSaturday).getTime();
      const monday = addDays(today, daysToSaturday + 2).getTime();
      return day >= saturday && day < monday;
    }
  }
}

function matchesQuery(data: AppData, dinner: Dinner, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const host = data.users[dinner.hostId];
  const haystack = [
    dinner.title,
    dinner.description,
    dinner.menu.mainDish,
    dinner.menu.dessert,
    ...dinner.menu.sides,
    dinner.neighborhood,
    dinner.areaHint,
    host?.firstName ?? '',
    ...dinner.ingredients.map((i) => i.name),
  ]
    .join(' ')
    .toLowerCase();
  return q.split(/\s+/).every((term) => haystack.includes(term));
}

export function applyFilters(
  data: AppData,
  dinners: Dinner[],
  filters: DiscoverFilters,
  prefs: Preferences,
  now: Date,
): Dinner[] {
  return dinners.filter((d) => {
    if (!matchesQuery(data, d, filters.query)) return false;
    if (!matchesDate(d.startsAt, filters.date, now)) return false;
    if (filters.maxPriceCents != null && dinnerPricing(d).totalPerGuestCents > filters.maxPriceCents) return false;
    if (filters.suitableFor && !dietSuits(d.diet, filters.suitableFor)) return false;
    if (filters.alcoholFreeOnly && d.alcohol !== 'alcohol_free') return false;
    if (filters.social.length > 0 && !filters.social.includes(d.social)) return false;
    if (filters.minSeats > 0 && seatsLeft(data, d) < filters.minSeats) return false;
    if (filters.neighborhoods.length > 0 && !filters.neighborhoods.includes(d.neighborhood)) return false;
    if (filters.hideAllergenConflicts || filters.matchesMe) {
      const compat = assessCompatibility(prefs, d);
      if (filters.hideAllergenConflicts && compat.blocked) return false;
      if (filters.matchesMe && !compat.matches) return false;
    }
    return true;
  });
}
