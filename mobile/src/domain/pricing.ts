import { PRICING } from './constants';
import { clamp, roundToStep } from './money';
import type { Cents, Contribution, Dinner, Ingredient, IngredientUnit, PriceBreakdown, ShoppingItemState } from './types';

/**
 * Pricing model
 * -------------
 * 1. The host registers ingredients either per serving or for the whole dinner.
 * 2. The shopping budget is planned for every seat plus the host's own plate
 *    (when the host eats). The host pays for their own plate – guests never
 *    subsidise it – so the ingredient share is budget / planned servings.
 * 3. Host preparation compensation is a fixed amount per guest, capped.
 * 4. The platform fee is a percentage of (ingredients + compensation), clamped.
 *
 * All arithmetic uses integer cents. The ingredient share is rounded up to the
 * next cent so the host is never short because of rounding.
 */

export function plannedServings(guestSeats: number, hostEats: boolean): number {
  return Math.max(0, Math.floor(guestSeats)) + (hostEats ? 1 : 0);
}

export function lineQuantity(ingredient: Ingredient, diners: number): number {
  return ingredient.scaling === 'per_serving' ? ingredient.quantity * diners : ingredient.quantity;
}

export function lineCostCents(ingredient: Ingredient, diners: number): Cents {
  return ingredient.scaling === 'per_serving'
    ? Math.round(ingredient.estimatedCostCents * diners)
    : ingredient.estimatedCostCents;
}

/** True when quantity and cost are usable numbers (half-typed lines are ignored in totals). */
export function isCompleteIngredient(ing: Ingredient): boolean {
  return Number.isFinite(ing.quantity) && ing.quantity > 0 && Number.isInteger(ing.estimatedCostCents) && ing.estimatedCostCents >= 0;
}

export function ingredientBudgetCents(ingredients: Ingredient[], diners: number): Cents {
  return ingredients.reduce((sum, ing) => (isCompleteIngredient(ing) ? sum + lineCostCents(ing, diners) : sum), 0);
}

export function suggestHostCompensationCents(ingredientShareCents: Cents): Cents {
  const raw = ingredientShareCents * PRICING.hostCompensationSuggestedRate;
  return clamp(roundToStep(raw, PRICING.hostCompensationStepCents), 0, PRICING.hostCompensationMaxCents);
}

export function platformFeeCents(subtotalCents: Cents): Cents {
  if (subtotalCents <= 0) return 0;
  return clamp(
    Math.round(subtotalCents * PRICING.platformFeeRate),
    PRICING.platformFeeMinCents,
    PRICING.platformFeeMaxCents,
  );
}

export interface PricingInput {
  ingredients: Ingredient[];
  guestSeats: number;
  hostEats: boolean;
  hostCompensationCents: Cents;
}

export function computePricing(input: PricingInput): PriceBreakdown {
  const servings = plannedServings(input.guestSeats, input.hostEats);
  if (input.guestSeats < 1 || servings < 1) {
    return {
      plannedServings: servings,
      ingredientBudgetCents: 0,
      ingredientShareCents: 0,
      hostCompensationCents: 0,
      platformFeeCents: 0,
      totalPerGuestCents: 0,
    };
  }
  const budget = ingredientBudgetCents(input.ingredients, servings);
  const share = Math.ceil(budget / servings);
  const compensation = clamp(Math.round(input.hostCompensationCents), 0, PRICING.hostCompensationMaxCents);
  const fee = platformFeeCents(share + compensation);
  return {
    plannedServings: servings,
    ingredientBudgetCents: budget,
    ingredientShareCents: share,
    hostCompensationCents: compensation,
    platformFeeCents: fee,
    totalPerGuestCents: share + compensation + fee,
  };
}

/** Pricing for a dinner: the locked snapshot once published, otherwise a live estimate. */
export function dinnerPricing(dinner: Dinner): PriceBreakdown {
  return (
    dinner.pricing ??
    computePricing({
      ingredients: dinner.ingredients,
      guestSeats: dinner.guestSeats,
      hostEats: dinner.hostEats,
      hostCompensationCents: dinner.hostCompensationCents,
    })
  );
}

// ---------------------------------------------------------------------------
// Shopping list
// ---------------------------------------------------------------------------

export interface ShoppingLine {
  ingredient: Ingredient;
  quantity: number;
  estimatedCostCents: Cents;
  state: ShoppingItemState;
}

export function buildShoppingList(dinner: Dinner, diners: number): ShoppingLine[] {
  return dinner.ingredients.map((ingredient) => ({
    ingredient,
    quantity: lineQuantity(ingredient, diners),
    estimatedCostCents: lineCostCents(ingredient, diners),
    state: dinner.shopping[ingredient.id] ?? { purchased: false },
  }));
}

export interface ShoppingTotals {
  estimatedCents: Cents;
  actualCents: Cents;
  /** Number of purchased items with a recorded actual cost. */
  recordedCount: number;
  purchasedCount: number;
  itemCount: number;
}

export function shoppingTotals(lines: ShoppingLine[]): ShoppingTotals {
  return lines.reduce<ShoppingTotals>(
    (acc, line) => {
      acc.estimatedCents += line.estimatedCostCents;
      acc.itemCount += 1;
      if (line.state.purchased) acc.purchasedCount += 1;
      if (line.state.actualCostCents != null) {
        acc.actualCents += line.state.actualCostCents;
        acc.recordedCount += 1;
      }
      return acc;
    },
    { estimatedCents: 0, actualCents: 0, recordedCount: 0, purchasedCount: 0, itemCount: 0 },
  );
}

// ---------------------------------------------------------------------------
// Quantities
// ---------------------------------------------------------------------------

function trimNumber(n: number, decimals = 2): string {
  return Number(n.toFixed(decimals)).toString();
}

/** Formats quantities and upgrades units where sensible: 1250 g → "1.25 kg". */
export function formatQuantity(quantity: number, unit: IngredientUnit): string {
  if (unit === 'g' && quantity >= 1000) return `${trimNumber(quantity / 1000)} kg`;
  if (unit === 'ml' && quantity >= 1000) return `${trimNumber(quantity / 1000)} l`;
  if (unit === 'pcs') return `${trimNumber(quantity, 1)} pcs`;
  if (unit === 'bunch') return `${trimNumber(quantity, 1)} ${quantity === 1 ? 'bunch' : 'bunches'}`;
  if (unit === 'can') return `${trimNumber(quantity, 1)} ${quantity === 1 ? 'can' : 'cans'}`;
  if (unit === 'pack') return `${trimNumber(quantity, 1)} ${quantity === 1 ? 'pack' : 'packs'}`;
  return `${trimNumber(quantity, unit === 'g' || unit === 'ml' ? 0 : 2)} ${unit}`;
}

// ---------------------------------------------------------------------------
// Money flows
// ---------------------------------------------------------------------------

export interface MoneySplit {
  count: number;
  totalCents: Cents;
  ingredientCents: Cents;
  hostCents: Cents;
  platformCents: Cents;
  refundedCents: Cents;
}

/**
 * Net amounts after refunds. Refunds are allocated in the order
 * platform fee → host compensation → ingredients, mirroring the cancellation
 * policy (late cancellations keep only the ingredient share).
 */
export function netContribution(c: Contribution): Omit<MoneySplit, 'count'> {
  let remaining = c.refundedCents;
  const platform = c.platformFeeCents - Math.min(remaining, c.platformFeeCents);
  remaining -= c.platformFeeCents - platform;
  const host = c.hostCompensationCents - Math.min(remaining, c.hostCompensationCents);
  remaining -= c.hostCompensationCents - host;
  const ingredients = c.ingredientShareCents - Math.min(remaining, c.ingredientShareCents);
  return {
    totalCents: c.totalCents - c.refundedCents,
    ingredientCents: ingredients,
    hostCents: host,
    platformCents: platform,
    refundedCents: c.refundedCents,
  };
}

export function sumContributions(contributions: Contribution[]): MoneySplit {
  return contributions.reduce<MoneySplit>(
    (acc, c) => {
      const net = netContribution(c);
      // Fully refunded contributions are listed as refunds, not as seats.
      if (net.totalCents > 0) acc.count += 1;
      acc.totalCents += net.totalCents;
      acc.ingredientCents += net.ingredientCents;
      acc.hostCents += net.hostCents;
      acc.platformCents += net.platformCents;
      acc.refundedCents += net.refundedCents;
      return acc;
    },
    { count: 0, totalCents: 0, ingredientCents: 0, hostCents: 0, platformCents: 0, refundedCents: 0 },
  );
}
