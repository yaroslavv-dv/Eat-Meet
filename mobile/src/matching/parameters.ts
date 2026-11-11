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

export const LOCATIONS = [
  { id: 'groningen-binnenstad', label: 'Groningen Binnenstad', latitude: 53.2189, longitude: 6.5675 },
  { id: 'groningen-helpman', label: 'Groningen Helpman', latitude: 53.1982, longitude: 6.5765 },
  { id: 'groningen-ten-boer', label: 'Groningen Ten Boer', latitude: 53.2757, longitude: 6.6948 },
] as const;

export type LocationId = (typeof LOCATIONS)[number]['id'];

export function locationById(id: LocationId) {
  const location = LOCATIONS.find((item) => item.id === id);
  if (!location) {
    throw new Error(`Unknown location: ${id}`);
  }
  return location;
}

export const EMBEDDING_MODEL = 'text-embedding-3-small';
