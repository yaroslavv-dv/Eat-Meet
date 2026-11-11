import type {
  AppData,
  Allergen,
  Contribution,
  Dinner,
  DinnerDisplayStatus,
  ID,
  Reservation,
  Review,
  User,
} from './types';
import { ALLERGENS } from './constants';

/** Reservations that occupy a seat. */
export function isSeatHolding(r: Reservation): boolean {
  return r.status === 'confirmed' || r.status === 'attended' || r.status === 'no_show';
}

export function reservationsForDinner(data: AppData, dinnerId: ID): Reservation[] {
  return Object.values(data.reservations)
    .filter((r) => r.dinnerId === dinnerId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function seatsTaken(data: AppData, dinnerId: ID): number {
  return reservationsForDinner(data, dinnerId).filter(isSeatHolding).length;
}

export function seatsLeft(data: AppData, dinner: Dinner): number {
  return Math.max(0, dinner.guestSeats - seatsTaken(data, dinner.id));
}

export function dinnerDisplayStatus(data: AppData, dinner: Dinner, now: Date): DinnerDisplayStatus {
  if (dinner.status !== 'published') return dinner.status;
  if (new Date(dinner.startsAt).getTime() <= now.getTime()) return 'awaiting_completion';
  if (seatsLeft(data, dinner) === 0) return 'fully_booked';
  return 'published';
}

/** Allergens derived from ingredients plus the host's extra declarations, in EU order. */
export function dinnerAllergens(dinner: Pick<Dinner, 'ingredients' | 'extraAllergens'>): Allergen[] {
  const set = new Set<Allergen>(dinner.extraAllergens);
  dinner.ingredients.forEach((i) => i.allergens.forEach((a) => set.add(a)));
  return ALLERGENS.filter((a) => set.has(a));
}

export function activeReservationFor(data: AppData, dinnerId: ID, guestId: ID): Reservation | undefined {
  return Object.values(data.reservations).find(
    (r) => r.dinnerId === dinnerId && r.guestId === guestId && r.status !== 'cancelled',
  );
}

export function reservationsForGuest(data: AppData, guestId: ID): Reservation[] {
  return Object.values(data.reservations)
    .filter((r) => r.guestId === guestId)
    .sort((a, b) => {
      const da = data.dinners[a.dinnerId]?.startsAt ?? '';
      const db = data.dinners[b.dinnerId]?.startsAt ?? '';
      return da.localeCompare(db);
    });
}

export function dinnersForHost(data: AppData, hostId: ID): Dinner[] {
  return Object.values(data.dinners)
    .filter((d) => d.hostId === hostId)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export function contributionFor(data: AppData, reservation: Reservation): Contribution | undefined {
  return data.contributions[reservation.contributionId];
}

export function contributionsForDinner(data: AppData, dinnerId: ID): Contribution[] {
  return reservationsForDinner(data, dinnerId)
    .map((r) => data.contributions[r.contributionId])
    .filter((c): c is Contribution => Boolean(c));
}

export function reviewForReservation(data: AppData, reservationId: ID): Review | undefined {
  return Object.values(data.reviews).find((r) => r.reservationId === reservationId);
}

export function reviewsForHost(data: AppData, hostId: ID): Review[] {
  return Object.values(data.reviews)
    .filter((r) => r.hostId === hostId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export interface HostRatings {
  count: number;
  /** Average of quality, taste and overall. Null when there are no reviews. */
  food: number | null;
  hygiene: number | null;
  quality: number | null;
  taste: number | null;
  overall: number | null;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

/** Ratings are always computed from saved review records – never stored as a number. */
export function hostRatings(data: AppData, hostId: ID): HostRatings {
  const reviews = reviewsForHost(data, hostId);
  return {
    count: reviews.length,
    food: average(reviews.map((r) => (r.food.quality + r.food.taste + r.food.overall) / 3)),
    hygiene: average(reviews.map((r) => r.hygiene)),
    quality: average(reviews.map((r) => r.food.quality)),
    taste: average(reviews.map((r) => r.food.taste)),
    overall: average(reviews.map((r) => r.food.overall)),
  };
}

export function fullName(user: User | undefined): string {
  return user ? `${user.firstName} ${user.lastName}` : 'Unknown';
}

export function initials(user: User | undefined): string {
  if (!user) return '?';
  return `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();
}

export function isUpcoming(dinner: Dinner, now: Date): boolean {
  return new Date(dinner.startsAt).getTime() > now.getTime();
}

/** Published dinners that have not started yet, soonest first. */
export function discoverableDinners(data: AppData, now: Date): Dinner[] {
  return Object.values(data.dinners)
    .filter((d) => d.status === 'published' && isUpcoming(d, now))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
