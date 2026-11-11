/**
 * Eat&Meet domain models.
 *
 * Everything here is plain, serialisable data so the same shapes can be stored
 * locally today and sent to a real backend later. Money is always stored in
 * integer euro cents. Dates are ISO-8601 strings.
 */

export type ID = string;
export type ISODate = string;
export type Cents = number;

// ---------------------------------------------------------------------------
// Preferences & food information
// ---------------------------------------------------------------------------

/** What a dish contains, ordered from most to least restrictive. */
export type DietClass = 'vegan' | 'vegetarian' | 'pescatarian' | 'omnivore';

/** Additional dietary requirements that are not allergies. */
export type DietaryTag = 'halal' | 'kosher' | 'gluten_free' | 'lactose_free' | 'no_pork';

/** The 14 allergens that must be declared under EU Regulation 1169/2011. */
export type Allergen =
  | 'gluten'
  | 'crustaceans'
  | 'eggs'
  | 'fish'
  | 'peanuts'
  | 'soy'
  | 'milk'
  | 'tree_nuts'
  | 'celery'
  | 'mustard'
  | 'sesame'
  | 'sulphites'
  | 'lupin'
  | 'molluscs';

export type AlcoholPreference = 'alcohol_free_only' | 'no_preference' | 'alcohol_ok';
export type AlcoholPolicy = 'alcohol_free' | 'alcohol_possible';

export type SocialStyle = 'eat_meet' | 'just_eat' | 'flexible';

export type AgeGroup = '18_24' | '25_34' | '35_plus' | 'any';

export type Neighborhood =
  | 'Binnenstad'
  | 'Oosterpoort'
  | 'Schildersbuurt'
  | 'Zeeheldenbuurt'
  | 'Korrewegwijk'
  | 'De Hoogte'
  | 'Paddepoel'
  | 'Selwerd'
  | 'Helpman'
  | 'Corpus den Hoorn';

export interface Preferences {
  diet: DietClass;
  dietaryTags: DietaryTag[];
  dietaryNotes: string;
  /** Medically relevant – kept separate from lifestyle diet choices. */
  allergies: Allergen[];
  allergyNotes: string;
  alcohol: AlcoholPreference;
  /** Voluntary social preference, never used to exclude anyone automatically. */
  ageGroups: AgeGroup[];
  social: SocialStyle;
}

export interface HostProfile {
  headline: string;
  hostingSince: ISODate;
}

export interface User {
  id: ID;
  firstName: string;
  lastName: string;
  /** All accounts must be adults. Used only to show an age, never to filter. */
  birthYear: number;
  neighborhood: Neighborhood;
  bio: string;
  avatarColor: string;
  joinedAt: ISODate;
  preferences: Preferences;
  hostProfile?: HostProfile;
  /** Demo personas can be selected in the profile switcher. */
  demoPersona?: { label: string; defaultMode: AppMode };
}

// ---------------------------------------------------------------------------
// Dinners
// ---------------------------------------------------------------------------

/** Image reference that stays serialisable: bundled demo asset or a picked file URI. */
export type ImageRef = { kind: 'demo'; key: string } | { kind: 'uri'; uri: string };

export type IngredientUnit = 'g' | 'kg' | 'ml' | 'l' | 'pcs' | 'tbsp' | 'tsp' | 'bunch' | 'can' | 'pack';

/**
 * `per_serving` quantities scale with the number of diners.
 * `whole_dinner` quantities (spices, oil, a bunch of herbs) are bought once.
 */
export type IngredientScaling = 'per_serving' | 'whole_dinner';

export interface Ingredient {
  id: ID;
  name: string;
  quantity: number;
  unit: IngredientUnit;
  scaling: IngredientScaling;
  /** Estimated cost for `quantity` (per serving or for the whole dinner). */
  estimatedCostCents: Cents;
  allergens: Allergen[];
}

export interface Menu {
  mainDish: string;
  sides: string[];
  dessert: string;
  /** Non-alcoholic drinks only. Alcohol is never part of the shared budget. */
  drinks: string;
}

export type DinnerStatus = 'draft' | 'published' | 'cancelled' | 'completed';

/** Status shown to people – adds the derived "fully booked" and "awaiting wrap-up" states. */
export type DinnerDisplayStatus = DinnerStatus | 'fully_booked' | 'awaiting_completion';

export interface PriceBreakdown {
  /** Diners the budget was planned for (guest seats + host if eating). */
  plannedServings: number;
  ingredientBudgetCents: Cents;
  ingredientShareCents: Cents;
  hostCompensationCents: Cents;
  platformFeeCents: Cents;
  totalPerGuestCents: Cents;
}

export interface ShoppingItemState {
  purchased: boolean;
  actualCostCents?: Cents;
}

export interface Dinner {
  id: ID;
  hostId: ID;
  status: DinnerStatus;
  title: string;
  description: string;
  startsAt: ISODate;
  durationMinutes: number;
  neighborhood: Neighborhood;
  /** Approximate area shown publicly, e.g. "Near the Noorderplantsoen". */
  areaHint: string;
  /** Only revealed to guests with a confirmed reservation. */
  privateAddress: string;
  guestSeats: number;
  hostEats: boolean;
  mealImage: ImageRef | null;
  tableImage: ImageRef | null;
  menu: Menu;
  ingredients: Ingredient[];
  diet: DietClass;
  dietaryTags: DietaryTag[];
  /** Allergens declared on top of the ones derived from ingredients (cross-contact). */
  extraAllergens: Allergen[];
  alcohol: AlcoholPolicy;
  social: SocialStyle;
  ageGroup: AgeGroup;
  houseRules: string[];
  hostCompensationCents: Cents;
  /** Price snapshot locked at publication so booked guests are never re-priced. */
  pricing: PriceBreakdown | null;
  shopping: Record<ID, ShoppingItemState>;
  createdAt: ISODate;
  updatedAt: ISODate;
  publishedAt?: ISODate;
  cancelledAt?: ISODate;
  completedAt?: ISODate;
}

// ---------------------------------------------------------------------------
// Reservations, contributions, reviews
// ---------------------------------------------------------------------------

export type ReservationStatus = 'confirmed' | 'cancelled' | 'attended' | 'no_show';

export interface Reservation {
  id: ID;
  dinnerId: ID;
  guestId: ID;
  status: ReservationStatus;
  createdAt: ISODate;
  cancelledAt?: ISODate;
  cancelledBy?: 'guest' | 'host';
  contributionId: ID;
  acknowledgements: {
    allergens: boolean;
    foodSafety: boolean;
    terms: boolean;
    dietDifference: boolean;
  };
  /** Message for the host, e.g. arrival time. */
  noteToHost: string;
}

/**
 * A simulated contribution. `provider: 'demo'` makes it explicit that no money
 * moved. A real payment provider would store its own reference here.
 */
export type ContributionStatus = 'demo_authorized' | 'demo_refunded' | 'demo_partially_refunded' | 'demo_settled';

export interface Contribution {
  id: ID;
  reservationId: ID;
  provider: 'demo';
  providerReference: string;
  ingredientShareCents: Cents;
  hostCompensationCents: Cents;
  platformFeeCents: Cents;
  totalCents: Cents;
  refundedCents: Cents;
  status: ContributionStatus;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Review {
  id: ID;
  dinnerId: ID;
  hostId: ID;
  guestId: ID;
  reservationId: ID;
  food: { quality: number; taste: number; overall: number };
  /** Guest-reported cleanliness and food handling – not an official inspection. */
  hygiene: number;
  comment: string;
  createdAt: ISODate;
}

// ---------------------------------------------------------------------------
// Sustainability & trust
// ---------------------------------------------------------------------------

export type LeftoverHandling = 'none' | 'shared_with_guests' | 'stored' | 'composted' | 'discarded';

export interface SustainabilityReport {
  dinnerId: ID;
  plannedServings: number;
  actualDiners: number;
  portionsPrepared: number;
  portionsServed: number;
  allPortionsServed: boolean;
  /** Approximate leftover portions as estimated by the host. */
  leftoverPortions: number;
  leftoverHandling: LeftoverHandling;
  notes: string;
  estimatedBudgetCents: Cents;
  actualSpendCents: Cents | null;
  recordedAt: ISODate;
}

export type ConcernReason = 'safety' | 'hygiene' | 'misleading' | 'behaviour' | 'other';

export interface ConcernReport {
  id: ID;
  dinnerId: ID;
  reporterId: ID;
  reason: ConcernReason;
  details: string;
  createdAt: ISODate;
}

// ---------------------------------------------------------------------------
// App state
// ---------------------------------------------------------------------------

export type AppMode = 'guest' | 'host';

export interface Session {
  currentUserId: ID;
  mode: AppMode;
  onboarded: boolean;
  adultConfirmed: boolean;
}

export interface AppData {
  schemaVersion: 1;
  seededAt: ISODate;
  session: Session;
  users: Record<ID, User>;
  dinners: Record<ID, Dinner>;
  reservations: Record<ID, Reservation>;
  contributions: Record<ID, Contribution>;
  reviews: Record<ID, Review>;
  reports: Record<ID, SustainabilityReport>;
  concerns: Record<ID, ConcernReport>;
}

/** Result type returned by every business action. */
export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
