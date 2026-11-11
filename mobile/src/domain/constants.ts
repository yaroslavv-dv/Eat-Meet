import type {
  AgeGroup,
  Allergen,
  AlcoholPolicy,
  AlcoholPreference,
  ConcernReason,
  DietClass,
  DietaryTag,
  IngredientUnit,
  LeftoverHandling,
  Neighborhood,
  SocialStyle,
} from './types';

export const CITY = 'Groningen';

/**
 * Pricing configuration. Kept in one place so the business model can be tuned
 * (or loaded from a backend) without touching UI code.
 */
export const PRICING = {
  /** Suggested host compensation as a share of the ingredient contribution. */
  hostCompensationSuggestedRate: 0.25,
  hostCompensationStepCents: 50,
  /** Cap keeps Eat&Meet a cost-sharing platform rather than a restaurant. */
  hostCompensationMaxCents: 600,
  platformFeeRate: 0.1,
  platformFeeMinCents: 50,
  platformFeeMaxCents: 200,
} as const;

export const RULES = {
  /** Dinners must be published at least this long before they start. */
  publishLeadTimeHours: 24,
  /** Guests get a full refund when cancelling before this many hours. */
  freeCancellationHours: 48,
  maxGuestSeats: 12,
  minDurationMinutes: 60,
  maxDurationMinutes: 300,
} as const;

export const DIET_ORDER: DietClass[] = ['vegan', 'vegetarian', 'pescatarian', 'omnivore'];

export const DIET_LABEL: Record<DietClass, string> = {
  vegan: 'Vegan',
  vegetarian: 'Vegetarian',
  pescatarian: 'Pescatarian',
  omnivore: 'Includes meat',
};

/** How a guest describes their own diet. */
export const GUEST_DIET_LABEL: Record<DietClass, string> = {
  vegan: 'Vegan',
  vegetarian: 'Vegetarian',
  pescatarian: 'Pescatarian',
  omnivore: 'Omnivore (meat included)',
};

export const DIETARY_TAG_LABEL: Record<DietaryTag, string> = {
  halal: 'Halal',
  kosher: 'Kosher',
  gluten_free: 'Gluten-free',
  lactose_free: 'Lactose-free',
  no_pork: 'No pork',
};

export const ALLERGENS: Allergen[] = [
  'gluten',
  'crustaceans',
  'eggs',
  'fish',
  'peanuts',
  'soy',
  'milk',
  'tree_nuts',
  'celery',
  'mustard',
  'sesame',
  'sulphites',
  'lupin',
  'molluscs',
];

export const ALLERGEN_LABEL: Record<Allergen, string> = {
  gluten: 'Gluten',
  crustaceans: 'Crustaceans',
  eggs: 'Eggs',
  fish: 'Fish',
  peanuts: 'Peanuts',
  soy: 'Soy',
  milk: 'Milk',
  tree_nuts: 'Tree nuts',
  celery: 'Celery',
  mustard: 'Mustard',
  sesame: 'Sesame',
  sulphites: 'Sulphites',
  lupin: 'Lupin',
  molluscs: 'Molluscs',
};

export const ALCOHOL_PREFERENCE_LABEL: Record<AlcoholPreference, string> = {
  alcohol_free_only: 'Alcohol-free dinners only',
  no_preference: 'No preference',
  alcohol_ok: 'Alcohol may be present',
};

export const ALCOHOL_POLICY_LABEL: Record<AlcoholPolicy, string> = {
  alcohol_free: 'Alcohol-free dinner',
  alcohol_possible: 'Alcohol may be present',
};

export const ALCOHOL_POLICY_HINT: Record<AlcoholPolicy, string> = {
  alcohol_free: 'No alcohol is served or brought to this table.',
  alcohol_possible:
    'Guests may bring their own. Alcohol is never part of the shared food budget on Eat&Meet.',
};

export const SOCIAL_LABEL: Record<SocialStyle, string> = {
  eat_meet: 'Eat & Meet',
  just_eat: 'Just Eat',
  flexible: 'Flexible',
};

export const SOCIAL_HINT: Record<SocialStyle, string> = {
  eat_meet: 'Long table, conversation and getting to know each other.',
  just_eat: 'A relaxed shared meal – no pressure to socialise.',
  flexible: 'Come for the food, stay for the chat if you feel like it.',
};

export const AGE_GROUP_LABEL: Record<AgeGroup, string> = {
  '18_24': '18–24',
  '25_34': '25–34',
  '35_plus': '35+',
  any: 'Any adult age',
};

export const NEIGHBORHOODS: Neighborhood[] = [
  'Binnenstad',
  'Oosterpoort',
  'Schildersbuurt',
  'Zeeheldenbuurt',
  'Korrewegwijk',
  'De Hoogte',
  'Paddepoel',
  'Selwerd',
  'Helpman',
  'Corpus den Hoorn',
];

export const UNITS: IngredientUnit[] = ['g', 'kg', 'ml', 'l', 'pcs', 'tbsp', 'tsp', 'bunch', 'can', 'pack'];

export const LEFTOVER_HANDLING_LABEL: Record<LeftoverHandling, string> = {
  none: 'No leftovers',
  shared_with_guests: 'Shared with guests',
  stored: 'Stored for later',
  composted: 'Composted',
  discarded: 'Thrown away',
};

export const CONCERN_REASON_LABEL: Record<ConcernReason, string> = {
  safety: 'Food safety or allergen concern',
  hygiene: 'Hygiene concern',
  misleading: 'Listing is misleading',
  behaviour: 'Inappropriate behaviour',
  other: 'Something else',
};

export const HOUSE_RULE_SUGGESTIONS = [
  'Shoes off at the door',
  'There is a cat in the house',
  'Stairs only – no elevator',
  'Please arrive on time',
  'Quiet after 22:00 for the neighbours',
  'Help with the dishes is welcome',
];

/** Words that indicate alcohol – alcohol may never be part of the paid budget. */
export const ALCOHOL_KEYWORDS = [
  'wine',
  'wijn',
  'beer',
  'bier',
  'vodka',
  'rum',
  'gin',
  'whisky',
  'whiskey',
  'tequila',
  'prosecco',
  'champagne',
  'cava',
  'sake',
  'liqueur',
  'brandy',
  'cognac',
  'sherry',
  'port wine',
  'cider',
  'jenever',
  'vermouth',
  'mirin',
];
