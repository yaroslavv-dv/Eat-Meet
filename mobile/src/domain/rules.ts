import { assessCompatibility } from './compatibility';
import { ALCOHOL_KEYWORDS, PRICING, RULES } from './constants';
import { formatWhen, HOUR_MS, hoursUntil } from './dates';
import { formatEUR } from './money';
import { computePricing } from './pricing';
import { activeReservationFor, dinnerAllergens, reviewForReservation, seatsLeft } from './selectors';
import type { AppData, Contribution, Dinner, ID, Reservation } from './types';

// ---------------------------------------------------------------------------
// Dinner drafts
// ---------------------------------------------------------------------------

/** The fields a host edits in the Create Dinner flow. */
export type DinnerDraft = Pick<
  Dinner,
  | 'title'
  | 'description'
  | 'startsAt'
  | 'durationMinutes'
  | 'neighborhood'
  | 'areaHint'
  | 'privateAddress'
  | 'guestSeats'
  | 'hostEats'
  | 'mealImage'
  | 'tableImage'
  | 'menu'
  | 'ingredients'
  | 'diet'
  | 'dietaryTags'
  | 'extraAllergens'
  | 'alcohol'
  | 'social'
  | 'ageGroup'
  | 'houseRules'
  | 'hostCompensationCents'
>;

export type DraftStep = 'basics' | 'photos' | 'menu' | 'preferences' | 'costs';
export const DRAFT_STEPS: DraftStep[] = ['basics', 'photos', 'menu', 'preferences', 'costs'];

export type FieldErrors = Record<string, string>;

export function earliestStart(now: Date): Date {
  return new Date(now.getTime() + RULES.publishLeadTimeHours * HOUR_MS);
}

/** The 24-hour rule: a dinner must be published at least 24 hours before it starts. */
export function meetsPublishLeadTime(startsAt: string, now: Date): boolean {
  return new Date(startsAt).getTime() >= earliestStart(now).getTime();
}

const NON_ALCOHOLIC = /(alcohol[\s-]?free|non[\s-]?alcoholic|0[.,]0%?|ginger beer|root beer|wine vinegar|cider vinegar)/gi;

/** True when text names an alcoholic drink. Alcohol may never be part of the paid budget. */
export function mentionsAlcohol(text: string): boolean {
  const cleaned = text.toLowerCase().replace(NON_ALCOHOLIC, ' ');
  return ALCOHOL_KEYWORDS.some((word) => new RegExp(`\\b${word}\\b`, 'i').test(cleaned));
}

export function validateStep(step: DraftStep, draft: DinnerDraft, now: Date): FieldErrors {
  const e: FieldErrors = {};
  switch (step) {
    case 'basics': {
      if (draft.title.trim().length < 4) e.title = 'Give your dinner a name of at least 4 characters.';
      else if (draft.title.trim().length > 60) e.title = 'Keep the name under 60 characters.';
      if (draft.description.trim().length < 20)
        e.description = 'Describe the evening in at least 20 characters.';
      const start = new Date(draft.startsAt);
      if (Number.isNaN(start.getTime())) e.startsAt = 'Choose a valid date and time.';
      else if (!meetsPublishLeadTime(draft.startsAt, now))
        e.startsAt = `Dinners must be published at least ${RULES.publishLeadTimeHours} hours before they start. The earliest possible start is ${formatWhen(earliestStart(now), now)}.`;
      if (
        !Number.isFinite(draft.durationMinutes) ||
        draft.durationMinutes < RULES.minDurationMinutes ||
        draft.durationMinutes > RULES.maxDurationMinutes
      )
        e.durationMinutes = 'Duration must be between 1 and 5 hours.';
      if (!draft.neighborhood) e.neighborhood = 'Choose a neighbourhood.';
      if (draft.privateAddress.trim().length < 5)
        e.privateAddress = 'Add the address you will share with confirmed guests.';
      if (!Number.isInteger(draft.guestSeats) || draft.guestSeats < 1)
        e.guestSeats = 'You need at least 1 guest seat.';
      else if (draft.guestSeats > RULES.maxGuestSeats)
        e.guestSeats = `Eat&Meet dinners have at most ${RULES.maxGuestSeats} guest seats.`;
      break;
    }
    case 'photos': {
      if (!draft.mealImage) e.mealImage = 'Add a photo that represents the meal.';
      if (!draft.tableImage) e.tableImage = 'Add a photo of your dinner table or dining area.';
      break;
    }
    case 'menu': {
      if (draft.menu.mainDish.trim().length < 3) e.mainDish = 'Name the main dish.';
      const drinkText = [draft.menu.drinks, ...draft.menu.sides, draft.menu.dessert].join(' ');
      if (mentionsAlcohol(drinkText))
        e.drinks = 'Only non-alcoholic drinks can be part of the menu. Alcohol is never included in the shared budget.';
      if (draft.ingredients.length === 0) e.ingredients = 'Add at least one ingredient.';
      draft.ingredients.forEach((ing, index) => {
        if (ing.name.trim().length < 2) e[`ingredient.${index}.name`] = 'Name this ingredient.';
        else if (mentionsAlcohol(ing.name))
          e[`ingredient.${index}.name`] = 'Alcohol (including cooking wine) cannot be part of the shared budget.';
        if (!Number.isFinite(ing.quantity) || ing.quantity <= 0)
          e[`ingredient.${index}.quantity`] = 'Quantity must be more than 0.';
        if (!Number.isInteger(ing.estimatedCostCents) || ing.estimatedCostCents < 0)
          e[`ingredient.${index}.cost`] = 'Enter a price of €0.00 or more.';
      });
      const hasIngredientErrors = Object.keys(e).some((k) => k.startsWith('ingredient.'));
      if (hasIngredientErrors && !e.ingredients) e.ingredients = 'Some ingredients need attention.';
      break;
    }
    case 'preferences': {
      const allergens = dinnerAllergens(draft);
      if ((draft.diet === 'vegan' || draft.diet === 'vegetarian') && (allergens.includes('fish') || allergens.includes('crustaceans') || allergens.includes('molluscs')))
        e.diet = 'Your ingredients include fish or seafood, so the dinner cannot be vegetarian or vegan.';
      else if (draft.diet === 'vegan' && (allergens.includes('milk') || allergens.includes('eggs')))
        e.diet = 'Your ingredients include milk or eggs, so the dinner cannot be vegan.';
      break;
    }
    case 'costs': {
      if (draft.hostCompensationCents < 0) e.hostCompensationCents = 'Compensation cannot be negative.';
      if (draft.hostCompensationCents > PRICING.hostCompensationMaxCents)
        e.hostCompensationCents = `Host compensation is capped at ${formatEUR(PRICING.hostCompensationMaxCents)} per guest.`;
      const pricing = computePricing(draft);
      if (pricing.ingredientBudgetCents <= 0) e.budget = 'Add estimated prices so guests know what they contribute.';
      break;
    }
  }
  return e;
}

export function validateDraft(draft: DinnerDraft, now: Date): Record<DraftStep, FieldErrors> {
  return DRAFT_STEPS.reduce(
    (acc, step) => ({ ...acc, [step]: validateStep(step, draft, now) }),
    {} as Record<DraftStep, FieldErrors>,
  );
}

export function draftIsPublishable(draft: DinnerDraft, now: Date): boolean {
  return Object.values(validateDraft(draft, now)).every((errors) => Object.keys(errors).length === 0);
}

// ---------------------------------------------------------------------------
// Booking
// ---------------------------------------------------------------------------

export type BookingBlockCode =
  | 'not_found'
  | 'own_dinner'
  | 'not_published'
  | 'started'
  | 'full'
  | 'already_booked'
  | 'allergen_conflict';

export type BookingCheck = { ok: true } | { ok: false; code: BookingBlockCode; message: string };

export function checkBookable(data: AppData, dinnerId: ID, guestId: ID, now: Date): BookingCheck {
  const dinner = data.dinners[dinnerId];
  const guest = data.users[guestId];
  if (!dinner || !guest) return { ok: false, code: 'not_found', message: 'This dinner is no longer available.' };
  if (dinner.hostId === guestId) return { ok: false, code: 'own_dinner', message: 'You are hosting this dinner.' };
  if (dinner.status !== 'published')
    return { ok: false, code: 'not_published', message: 'This dinner is not open for reservations.' };
  if (new Date(dinner.startsAt).getTime() <= now.getTime())
    return { ok: false, code: 'started', message: 'This dinner has already started.' };
  if (activeReservationFor(data, dinnerId, guestId))
    return { ok: false, code: 'already_booked', message: 'You already have a seat at this table.' };
  if (seatsLeft(data, dinner) <= 0) return { ok: false, code: 'full', message: 'This dinner is fully booked.' };
  const compat = assessCompatibility(guest.preferences, dinner);
  if (compat.blocked)
    return {
      ok: false,
      code: 'allergen_conflict',
      message: 'For your safety, you cannot book dinners that declare one of your listed allergens.',
    };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Cancellation
// ---------------------------------------------------------------------------

export interface CancellationQuote {
  allowed: boolean;
  reason?: string;
  fullRefund: boolean;
  refundCents: number;
  retainedCents: number;
  freeUntil: Date;
}

/**
 * Demo policy:
 *  - More than 48 h before the dinner: full refund.
 *  - Within 48 h: the ingredient share is kept (the host may already have
 *    shopped for you); host compensation and the platform fee are refunded.
 *  - After the start time: no cancellation.
 */
export function cancellationQuote(
  dinner: Dinner,
  reservation: Reservation,
  contribution: Contribution | undefined,
  now: Date,
): CancellationQuote {
  const freeUntil = new Date(new Date(dinner.startsAt).getTime() - RULES.freeCancellationHours * HOUR_MS);
  const base = { fullRefund: false, refundCents: 0, retainedCents: 0, freeUntil };
  if (reservation.status !== 'confirmed')
    return { ...base, allowed: false, reason: 'Only confirmed upcoming reservations can be cancelled.' };
  if (hoursUntil(dinner.startsAt, now) <= 0)
    return { ...base, allowed: false, reason: 'This dinner has already started.' };
  const total = contribution?.totalCents ?? 0;
  if (now.getTime() <= freeUntil.getTime()) {
    return { allowed: true, fullRefund: true, refundCents: total, retainedCents: 0, freeUntil };
  }
  const retained = contribution?.ingredientShareCents ?? 0;
  return { allowed: true, fullRefund: false, refundCents: total - retained, retainedCents: retained, freeUntil };
}

// ---------------------------------------------------------------------------
// Reviews & completion
// ---------------------------------------------------------------------------

export type Eligibility = { allowed: true } | { allowed: false; reason: string };

export function reviewEligibility(data: AppData, reservation: Reservation, now: Date): Eligibility {
  const dinner = data.dinners[reservation.dinnerId];
  if (!dinner) return { allowed: false, reason: 'This dinner no longer exists.' };
  if (reviewForReservation(data, reservation.id))
    return { allowed: false, reason: 'You already reviewed this dinner.' };
  if (reservation.status === 'cancelled') return { allowed: false, reason: 'Cancelled reservations cannot be reviewed.' };
  if (reservation.status === 'no_show')
    return { allowed: false, reason: 'The host marked this reservation as not attended.' };
  if (new Date(dinner.startsAt).getTime() > now.getTime())
    return { allowed: false, reason: 'Reviews open after the dinner has taken place.' };
  if (reservation.status !== 'attended' || dinner.status !== 'completed')
    return { allowed: false, reason: 'Reviews unlock once the host confirms who attended.' };
  return { allowed: true };
}

export function completionEligibility(dinner: Dinner, now: Date): Eligibility {
  if (dinner.status === 'completed') return { allowed: false, reason: 'This dinner is already completed.' };
  if (dinner.status !== 'published') return { allowed: false, reason: 'Only published dinners can be completed.' };
  if (new Date(dinner.startsAt).getTime() > now.getTime())
    return {
      allowed: false,
      reason: `You can wrap up this dinner once it has started (${formatWhen(dinner.startsAt, now)}).`,
    };
  return { allowed: true };
}

export function hostCancellationEligibility(dinner: Dinner, now: Date): Eligibility {
  if (dinner.status !== 'published') return { allowed: false, reason: 'Only published dinners can be cancelled.' };
  if (new Date(dinner.startsAt).getTime() <= now.getTime())
    return { allowed: false, reason: 'This dinner has already started.' };
  return { allowed: true };
}
