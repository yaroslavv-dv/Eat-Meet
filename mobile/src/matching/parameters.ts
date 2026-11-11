export const FOOD_PREFERENCES = [
  'vegetarian',
  'vegan',
  'pescatarian',
  'meat',
  'no restrictions',
  'no nuts',
  'no gluten',
  'no dairy',
  'halal',
  'kosher',
] as const;

export type FoodPreference = (typeof FOOD_PREFERENCES)[number];

export const EMBEDDING_MODEL = 'text-embedding-3-small';
