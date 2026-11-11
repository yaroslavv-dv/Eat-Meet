import type { ImageRef } from '@/domain/types';

/**
 * Bundled demonstration photos (Unsplash licence, see assets/images/demo/CREDITS.md).
 * They are stock images – the UI labels them "Demo photo" so they are never
 * mistaken for a real host's dinner or home.
 */
export const DEMO_IMAGES = {
  'meals/risotto': require('@/assets/images/demo/meals/risotto.jpg'),
  'meals/shakshuka': require('@/assets/images/demo/meals/shakshuka.jpg'),
  'meals/curry': require('@/assets/images/demo/meals/curry.jpg'),
  'meals/salmon': require('@/assets/images/demo/meals/salmon.jpg'),
  'meals/dumplings': require('@/assets/images/demo/meals/dumplings.jpg'),
  'meals/buddha-bowl': require('@/assets/images/demo/meals/buddha-bowl.jpg'),
  'meals/gado-gado': require('@/assets/images/demo/meals/gado-gado.jpg'),
  'meals/lasagne': require('@/assets/images/demo/meals/lasagne.jpg'),
  'meals/penne': require('@/assets/images/demo/meals/penne.jpg'),
  'meals/ramen': require('@/assets/images/demo/meals/ramen.jpg'),
  'meals/red-curry-soup': require('@/assets/images/demo/meals/red-curry-soup.jpg'),
  'meals/skewers': require('@/assets/images/demo/meals/skewers.jpg'),
  'meals/green-salad': require('@/assets/images/demo/meals/green-salad.jpg'),
  'meals/grain-bowl': require('@/assets/images/demo/meals/grain-bowl.jpg'),
  'meals/pizza': require('@/assets/images/demo/meals/pizza.jpg'),
  'tables/green-dining': require('@/assets/images/demo/tables/green-dining.jpg'),
  'tables/wooden-table': require('@/assets/images/demo/tables/wooden-table.jpg'),
  'tables/bright-table': require('@/assets/images/demo/tables/bright-table.jpg'),
  'tables/shared-plates': require('@/assets/images/demo/tables/shared-plates.jpg'),
  'tables/friends-table': require('@/assets/images/demo/tables/friends-table.jpg'),
  'tables/garden-table': require('@/assets/images/demo/tables/garden-table.jpg'),
  'tables/rustic-table': require('@/assets/images/demo/tables/rustic-table.jpg'),
  'onboarding/cooking-together': require('@/assets/images/demo/onboarding/cooking-together.jpg'),
  'onboarding/dinner-friends': require('@/assets/images/demo/onboarding/dinner-friends.jpg'),
  'onboarding/ingredients': require('@/assets/images/demo/onboarding/ingredients.jpg'),
  'onboarding/hands-cooking': require('@/assets/images/demo/onboarding/hands-cooking.jpg'),
  'onboarding/host-kitchen': require('@/assets/images/demo/onboarding/host-kitchen.jpg'),
} as const;

export type DemoImageKey = keyof typeof DEMO_IMAGES;

export const MEAL_DEMO_KEYS: DemoImageKey[] = [
  'meals/green-salad',
  'meals/grain-bowl',
  'meals/pizza',
  'meals/penne',
  'meals/lasagne',
  'meals/ramen',
  'meals/risotto',
  'meals/curry',
];

export const TABLE_DEMO_KEYS: DemoImageKey[] = [
  'tables/green-dining',
  'tables/wooden-table',
  'tables/bright-table',
  'tables/shared-plates',
  'tables/friends-table',
  'tables/garden-table',
];

export function demoImage(key: DemoImageKey): ImageRef {
  return { kind: 'demo', key };
}

/** Bundled asset id (number) or a file URI, in the shape expo-image expects. */
export function imageSource(ref: ImageRef | null | undefined): number | { uri: string } | null {
  if (!ref) return null;
  if (ref.kind === 'uri') return { uri: ref.uri };
  return (DEMO_IMAGES as Record<string, number>)[ref.key] ?? null;
}

export function isDemoImage(ref: ImageRef | null | undefined): boolean {
  return ref?.kind === 'demo';
}
