import {
  AGE_GROUP_LABEL,
  ALLERGEN_LABEL,
  DIETARY_TAG_LABEL,
  DIET_ORDER,
  GUEST_DIET_LABEL,
  SOCIAL_LABEL,
} from './constants';
import { dinnerAllergens } from './selectors';
import type { Allergen, DietClass, Dinner, Preferences } from './types';

export type IssueSeverity = 'block' | 'warn' | 'info';

export interface CompatibilityIssue {
  kind: 'allergen' | 'diet' | 'dietary_tag' | 'alcohol' | 'social' | 'age';
  severity: IssueSeverity;
  message: string;
}

export interface Compatibility {
  issues: CompatibilityIssue[];
  positives: string[];
  allergenConflicts: Allergen[];
  /** A declared allergen matches one of the guest's allergies. Booking is disabled. */
  blocked: boolean;
  /** The dish is less restrictive than the guest's diet – booking needs an explicit acknowledgement. */
  needsDietAcknowledgement: boolean;
  /** No blocks or warnings – used by the "Matches me" filter. */
  matches: boolean;
}

export function dietRank(diet: DietClass): number {
  return DIET_ORDER.indexOf(diet);
}

/** A dish is suitable for a diet when it is at most as permissive as that diet. */
export function dietSuits(dish: DietClass, guestDiet: DietClass): boolean {
  return dietRank(dish) <= dietRank(guestDiet);
}

const DISH_CONTENT: Record<DietClass, string> = {
  vegan: 'is fully plant-based',
  vegetarian: 'may contain dairy or eggs',
  pescatarian: 'contains fish or seafood',
  omnivore: 'contains meat',
};

export function assessCompatibility(prefs: Preferences, dinner: Dinner): Compatibility {
  const issues: CompatibilityIssue[] = [];
  const positives: string[] = [];

  // 1. Allergies – medically relevant, blocking.
  const declared = dinnerAllergens(dinner);
  const allergenConflicts = declared.filter((a) => prefs.allergies.includes(a));
  allergenConflicts.forEach((a) =>
    issues.push({
      kind: 'allergen',
      severity: 'block',
      message: `The host declared ${ALLERGEN_LABEL[a].toLowerCase()}, which you listed as an allergy.`,
    }),
  );
  if (prefs.allergies.length > 0 && allergenConflicts.length === 0) {
    positives.push('None of your listed allergens are declared');
  }

  // 2. Diet – lifestyle choice, needs acknowledgement when it does not fit.
  const dietFits = dietSuits(dinner.diet, prefs.diet);
  if (!dietFits) {
    issues.push({
      kind: 'diet',
      severity: 'warn',
      message: `This dinner ${DISH_CONTENT[dinner.diet]}, and you eat ${GUEST_DIET_LABEL[prefs.diet].toLowerCase()}.`,
    });
  } else if (prefs.diet !== 'omnivore') {
    positives.push(`Suitable for your ${GUEST_DIET_LABEL[prefs.diet].toLowerCase()} diet`);
  }

  // 3. Other dietary requirements (halal, gluten-free, …).
  prefs.dietaryTags.forEach((tag) => {
    if (dinner.dietaryTags.includes(tag)) {
      positives.push(`Marked ${DIETARY_TAG_LABEL[tag].toLowerCase()} by the host`);
    } else {
      issues.push({
        kind: 'dietary_tag',
        severity: 'warn',
        message: `Not marked ${DIETARY_TAG_LABEL[tag].toLowerCase()}. Check with the host before you book.`,
      });
    }
  });

  // 4. Alcohol.
  if (prefs.alcohol === 'alcohol_free_only') {
    if (dinner.alcohol === 'alcohol_free') positives.push('Alcohol-free, as you prefer');
    else
      issues.push({
        kind: 'alcohol',
        severity: 'warn',
        message: 'Guests may bring alcohol to this dinner. You prefer alcohol-free dinners.',
      });
  }

  // 5. Social style – informational only.
  if (prefs.social === dinner.social || dinner.social === 'flexible' || prefs.social === 'flexible') {
    positives.push(`${SOCIAL_LABEL[dinner.social]} atmosphere`);
  } else {
    issues.push({
      kind: 'social',
      severity: 'info',
      message: `The host planned a “${SOCIAL_LABEL[dinner.social]}” dinner. You usually prefer “${SOCIAL_LABEL[prefs.social]}”.`,
    });
  }

  // 6. Age group – a voluntary social preference, never a restriction.
  if (
    dinner.ageGroup !== 'any' &&
    !prefs.ageGroups.includes('any') &&
    prefs.ageGroups.length > 0 &&
    !prefs.ageGroups.includes(dinner.ageGroup)
  ) {
    issues.push({
      kind: 'age',
      severity: 'info',
      message: `The host suggests a ${AGE_GROUP_LABEL[dinner.ageGroup]} crowd. Every adult is welcome to book.`,
    });
  }

  const blocked = allergenConflicts.length > 0;
  return {
    issues,
    positives,
    allergenConflicts,
    blocked,
    needsDietAcknowledgement: !dietFits,
    matches: !blocked && !issues.some((i) => i.severity === 'warn'),
  };
}
