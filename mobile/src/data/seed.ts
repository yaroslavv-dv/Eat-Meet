/**
 * Demonstration data for Groningen. All dates are generated relative to the
 * moment the demo is seeded, so upcoming dinners are always in the future and
 * past dinners always in the past. Use "Reset demo data" in Profile to reseed.
 *
 * Every person, address and listing here is fictional.
 */
import { atTime } from '../domain/dates';
import { computePricing } from '../domain/pricing';
import type {
  Allergen,
  AppData,
  Contribution,
  Dinner,
  ID,
  ImageRef,
  Ingredient,
  IngredientUnit,
  Preferences,
  Reservation,
  ReservationStatus,
  Review,
  SustainabilityReport,
  User,
} from '../domain/types';

const img = (key: string): ImageRef => ({ kind: 'demo', key });

const prefs = (p: Partial<Preferences>): Preferences => ({
  diet: 'omnivore',
  dietaryTags: [],
  dietaryNotes: '',
  allergies: [],
  allergyNotes: '',
  alcohol: 'no_preference',
  ageGroups: ['any'],
  social: 'flexible',
  ...p,
});

function ing(
  id: string,
  name: string,
  quantity: number,
  unit: IngredientUnit,
  scaling: 'ps' | 'wd',
  euros: number,
  allergens: Allergen[] = [],
): Ingredient {
  return {
    id,
    name,
    quantity,
    unit,
    scaling: scaling === 'ps' ? 'per_serving' : 'whole_dinner',
    estimatedCostCents: Math.round(euros * 100),
    allergens,
  };
}

export function createSeedData(now: Date = new Date()): AppData {
  const iso = (d: Date) => d.toISOString();
  const year = now.getFullYear();
  const daysAgo = (n: number) => iso(new Date(now.getTime() - n * 24 * 60 * 60 * 1000));

  // -------------------------------------------------------------------------
  // People
  // -------------------------------------------------------------------------
  const user = (u: Omit<User, 'joinedAt'> & { joinedDaysAgo?: number }): User => {
    const { joinedDaysAgo = 200, ...rest } = u;
    return { ...rest, joinedAt: daysAgo(joinedDaysAgo) };
  };

  const users: User[] = [
    user({
      id: 'u_sofia',
      firstName: 'Sofia',
      lastName: 'Martins',
      birthYear: year - 24,
      neighborhood: 'Selwerd',
      bio: 'Master’s student in Energy & Environmental Sciences. New to Groningen and looking for good food and good people.',
      avatarColor: '#E4775F',
      joinedDaysAgo: 40,
      preferences: prefs({
        diet: 'vegetarian',
        allergies: ['peanuts'],
        allergyNotes: 'Peanut allergy – I carry an EpiPen.',
        alcohol: 'alcohol_free_only',
        ageGroups: ['18_24', '25_34'],
        social: 'eat_meet',
      }),
      demoPersona: { label: 'Guest · student', defaultMode: 'guest' },
    }),
    user({
      id: 'u_marieke',
      firstName: 'Marieke',
      lastName: 'de Vries',
      birthYear: year - 34,
      neighborhood: 'Oosterpoort',
      bio: 'Speech therapist by day, home cook by night. I cook big pots of Italian comfort food and love a full table.',
      avatarColor: '#1F5E45',
      joinedDaysAgo: 320,
      preferences: prefs({ diet: 'omnivore', social: 'eat_meet', ageGroups: ['any'] }),
      hostProfile: { headline: 'Italian comfort food in the Oosterpoort', hostingSince: daysAgo(300) },
      demoPersona: { label: 'Host · home cook', defaultMode: 'host' },
    }),
    user({
      id: 'u_amira',
      firstName: 'Amira',
      lastName: 'Haddad',
      birthYear: year - 29,
      neighborhood: 'Schildersbuurt',
      bio: 'Recipes from my grandmother in Tunis, cooked in a tiny Groningen kitchen.',
      avatarColor: '#C9873A',
      preferences: prefs({ diet: 'vegetarian', dietaryTags: ['halal'] }),
      hostProfile: { headline: 'North African home cooking', hostingSince: daysAgo(150) },
    }),
    user({
      id: 'u_arjun',
      firstName: 'Arjun',
      lastName: 'Nair',
      birthYear: year - 23,
      neighborhood: 'Paddepoel',
      bio: 'PhD student at Zernike. Cooking Kerala food is how I stay close to home.',
      avatarColor: '#7A8F3E',
      preferences: prefs({ diet: 'vegan' }),
      hostProfile: { headline: 'Plant-based Kerala cooking', hostingSince: daysAgo(90) },
    }),
    user({
      id: 'u_lukas',
      firstName: 'Lukas',
      lastName: 'Bakker',
      birthYear: year - 31,
      neighborhood: 'Zeeheldenbuurt',
      bio: 'Grew up by the Wadden Sea. Fish, vegetables and long evenings in the garden.',
      avatarColor: '#3E6E8E',
      preferences: prefs({ diet: 'pescatarian' }),
      hostProfile: { headline: 'Seasonal Dutch cooking', hostingSince: daysAgo(210) },
    }),
    user({
      id: 'u_yuki',
      firstName: 'Yuki',
      lastName: 'Tanaka',
      birthYear: year - 27,
      neighborhood: 'Binnenstad',
      bio: 'Designer, dumpling enthusiast, and believer that folding food together breaks the ice.',
      avatarColor: '#9C5B7A',
      preferences: prefs({}),
      hostProfile: { headline: 'Hands-on Asian home cooking', hostingSince: daysAgo(120) },
    }),
    user({
      id: 'u_daan',
      firstName: 'Daan',
      lastName: 'Visser',
      birthYear: year - 38,
      neighborhood: 'Helpman',
      bio: 'Dad of two, weekend ramen nerd and part-time plant-based experimenter.',
      avatarColor: '#5E7D4F',
      preferences: prefs({}),
      hostProfile: { headline: 'Bowls, broths and big flavours', hostingSince: daysAgo(260) },
    }),
    user({
      id: 'u_sari',
      firstName: 'Sari',
      lastName: 'Wijaya',
      birthYear: year - 45,
      neighborhood: 'Korrewegwijk',
      bio: 'Indo-Dutch family recipes, passed down three generations.',
      avatarColor: '#B5654A',
      preferences: prefs({ diet: 'vegetarian' }),
      hostProfile: { headline: 'Indonesian family recipes', hostingSince: daysAgo(400) },
    }),
    user({
      id: 'u_noor',
      firstName: 'Noor',
      lastName: 'El Amrani',
      birthYear: year - 22,
      neighborhood: 'Korrewegwijk',
      bio: 'Psychology student.',
      avatarColor: '#8A6FB0',
      preferences: prefs({ diet: 'vegetarian', dietaryTags: ['halal'], alcohol: 'alcohol_free_only', social: 'eat_meet' }),
    }),
    user({
      id: 'u_tim',
      firstName: 'Tim',
      lastName: 'de Boer',
      birthYear: year - 28,
      neighborhood: 'Oosterpoort',
      bio: 'Software developer.',
      avatarColor: '#4F7C8A',
      preferences: prefs({ allergies: ['mustard'], social: 'eat_meet' }),
    }),
    user({
      id: 'u_lotte',
      firstName: 'Lotte',
      lastName: 'Jansen',
      birthYear: year - 26,
      neighborhood: 'De Hoogte',
      bio: 'Nurse at the UMCG.',
      avatarColor: '#C2697A',
      preferences: prefs({ diet: 'pescatarian' }),
    }),
    user({
      id: 'u_jonas',
      firstName: 'Jonas',
      lastName: 'Weber',
      birthYear: year - 25,
      neighborhood: 'Binnenstad',
      bio: 'Exchange student from Hamburg.',
      avatarColor: '#6B7F3A',
      preferences: prefs({ social: 'just_eat' }),
    }),
    user({
      id: 'u_elif',
      firstName: 'Elif',
      lastName: 'Kaya',
      birthYear: year - 30,
      neighborhood: 'Schildersbuurt',
      bio: 'Architect.',
      avatarColor: '#D08C5B',
      preferences: prefs({ diet: 'vegetarian', allergies: ['tree_nuts'] }),
    }),
    user({
      id: 'u_mateo',
      firstName: 'Mateo',
      lastName: 'Rossi',
      birthYear: year - 33,
      neighborhood: 'Corpus den Hoorn',
      bio: 'Researcher.',
      avatarColor: '#7E5A44',
      preferences: prefs({}),
    }),
    user({
      id: 'u_hannah',
      firstName: 'Hannah',
      lastName: 'Smit',
      birthYear: year - 41,
      neighborhood: 'Helpman',
      bio: 'Teacher.',
      avatarColor: '#5A7FA6',
      preferences: prefs({ allergies: ['crustaceans'] }),
    }),
    user({
      id: 'u_bram',
      firstName: 'Bram',
      lastName: 'Mulder',
      birthYear: year - 21,
      neighborhood: 'Paddepoel',
      bio: 'Bachelor student.',
      avatarColor: '#A0773C',
      preferences: prefs({ social: 'just_eat' }),
    }),
  ];

  // -------------------------------------------------------------------------
  // Dinners
  // -------------------------------------------------------------------------
  type DinnerSeed = Omit<
    Dinner,
    'pricing' | 'shopping' | 'createdAt' | 'updatedAt' | 'publishedAt' | 'completedAt' | 'cancelledAt'
  > & { publishedDaysBefore?: number };

  const makeDinner = (d: DinnerSeed): Dinner => {
    const { publishedDaysBefore = 6, ...rest } = d;
    const start = new Date(d.startsAt);
    const published = new Date(start.getTime() - publishedDaysBefore * 24 * 60 * 60 * 1000);
    const createdAt = iso(new Date(Math.min(published.getTime() - 2 * 60 * 60 * 1000, now.getTime() - 24 * 60 * 60 * 1000)));
    const isDraft = d.status === 'draft';
    return {
      ...rest,
      pricing: isDraft ? null : computePricing(d),
      shopping: {},
      createdAt,
      updatedAt: createdAt,
      publishedAt: isDraft ? undefined : iso(published),
      completedAt: d.status === 'completed' ? iso(new Date(start.getTime() + d.durationMinutes * 60 * 1000)) : undefined,
    };
  };

  const dinners: Dinner[] = [
    // ---------------- Upcoming ----------------
    makeDinner({
      id: 'din_risotto',
      hostId: 'u_marieke',
      status: 'published',
      title: 'Wild mushroom risotto night',
      description:
        'A slow, creamy risotto with wild mushrooms, fresh thyme and lemon, plus a rocket & pear salad. Long table, good conversation, and fresh mint tea to finish.',
      startsAt: iso(atTime(now, 3, 18, 30)),
      durationMinutes: 150,
      neighborhood: 'Oosterpoort',
      areaHint: 'Near De Oosterpoort concert hall',
      privateAddress: 'Meeuwerderweg 112-A, 9724 EV Groningen (demo address)',
      guestSeats: 6,
      hostEats: true,
      mealImage: img('meals/risotto'),
      tableImage: img('tables/green-dining'),
      menu: {
        mainDish: 'Wild mushroom & thyme risotto',
        sides: ['Rocket, pear & cheese salad', 'Toasted sourdough'],
        dessert: 'Lemon yoghurt cake',
        drinks: 'Fresh mint tea, homemade lemonade and sparkling water',
      },
      ingredients: [
        ing('ris_1', 'Arborio rice', 90, 'g', 'ps', 0.3),
        ing('ris_2', 'Mixed wild mushrooms', 130, 'g', 'ps', 1.65),
        ing('ris_3', 'Shallots', 35, 'g', 'ps', 0.18),
        ing('ris_4', 'Homemade vegetable stock', 300, 'ml', 'ps', 0.22, ['celery']),
        ing('ris_5', 'Vegetarian hard cheese', 25, 'g', 'ps', 0.6, ['milk']),
        ing('ris_6', 'Butter', 15, 'g', 'ps', 0.14, ['milk']),
        ing('ris_7', 'Rocket', 30, 'g', 'ps', 0.38),
        ing('ris_8', 'Pears', 0.5, 'pcs', 'ps', 0.28),
        ing('ris_9', 'Sourdough loaf', 1, 'pcs', 'wd', 3.95, ['gluten']),
        ing('ris_10', 'Flour, eggs & Greek yoghurt (cake)', 1, 'pack', 'wd', 4.2, ['gluten', 'eggs', 'milk']),
        ing('ris_11', 'Garlic', 1, 'pcs', 'wd', 0.55),
        ing('ris_12', 'Fresh thyme & parsley', 1, 'bunch', 'wd', 1.4),
        ing('ris_13', 'Lemons', 3, 'pcs', 'wd', 1.05),
        ing('ris_14', 'Fresh mint', 1, 'bunch', 'wd', 1.1),
        ing('ris_15', 'Olive oil', 60, 'ml', 'wd', 0.75),
      ],
      diet: 'vegetarian',
      dietaryTags: [],
      extraAllergens: [],
      alcohol: 'alcohol_free',
      social: 'eat_meet',
      ageGroup: 'any',
      houseRules: ['Shoes off at the door', 'There is a cat in the house', 'Stairs only – no elevator'],
      hostCompensationCents: 150,
    }),
    makeDinner({
      id: 'din_shakshuka',
      hostId: 'u_amira',
      status: 'published',
      title: 'Shakshuka & warm flatbread',
      description:
        'My grandmother’s shakshuka – eggs poached in a smoky tomato and pepper sauce – with warm flatbread, whipped feta and a crunchy herb salad. Chat, or simply enjoy the food.',
      startsAt: iso(atTime(now, 2, 18, 0)),
      durationMinutes: 120,
      neighborhood: 'Schildersbuurt',
      areaHint: 'Five minutes from the Noorderplantsoen',
      privateAddress: 'Van Ostadestraat 21, 9717 HT Groningen (demo address)',
      guestSeats: 5,
      hostEats: true,
      mealImage: img('meals/shakshuka'),
      tableImage: img('tables/bright-table'),
      menu: {
        mainDish: 'Smoky shakshuka with free-range eggs',
        sides: ['Warm za’atar flatbread', 'Whipped feta', 'Cucumber, mint & parsley salad'],
        dessert: 'Dates with orange & cinnamon',
        drinks: 'Fresh mint tea and sparkling water',
      },
      ingredients: [
        ing('sha_1', 'Free-range eggs', 2, 'pcs', 'ps', 0.6, ['eggs']),
        ing('sha_2', 'Chopped tomatoes', 0.5, 'can', 'ps', 0.45),
        ing('sha_3', 'Red peppers', 0.5, 'pcs', 'ps', 0.4),
        ing('sha_4', 'Onion', 0.5, 'pcs', 'ps', 0.1),
        ing('sha_5', 'Feta', 40, 'g', 'ps', 0.55, ['milk']),
        ing('sha_6', 'Flatbread dough (flour & yeast)', 120, 'g', 'ps', 0.25, ['gluten']),
        ing('sha_7', 'Cucumber', 0.25, 'pcs', 'ps', 0.15),
        ing('sha_8', 'Medjool dates', 3, 'pcs', 'ps', 0.6),
        ing('sha_9', 'Za’atar & sesame', 1, 'pack', 'wd', 2.2, ['sesame']),
        ing('sha_10', 'Smoked paprika & cumin', 1, 'pack', 'wd', 1.8),
        ing('sha_11', 'Fresh mint & parsley', 2, 'bunch', 'wd', 1.9),
        ing('sha_12', 'Olive oil', 80, 'ml', 'wd', 0.95),
        ing('sha_13', 'Oranges', 2, 'pcs', 'wd', 0.9),
      ],
      diet: 'vegetarian',
      dietaryTags: ['halal'],
      extraAllergens: [],
      alcohol: 'alcohol_free',
      social: 'flexible',
      ageGroup: 'any',
      houseRules: ['Please arrive on time', 'Help with the dishes is welcome'],
      hostCompensationCents: 150,
    }),
    makeDinner({
      id: 'din_curry',
      hostId: 'u_arjun',
      status: 'published',
      title: 'Kerala vegetable curry & rice',
      description:
        'A fragrant coconut vegetable curry from Kerala with lemon rice, cabbage thoran and fresh chutney. A calm, no-pressure dinner – perfect after a long day of lectures.',
      startsAt: iso(atTime(now, 4, 19, 0)),
      durationMinutes: 120,
      neighborhood: 'Paddepoel',
      areaHint: 'Close to the Zernike campus bus stop',
      privateAddress: 'Pleiadenlaan 8, 9742 GA Groningen (demo address)',
      guestSeats: 8,
      hostEats: true,
      mealImage: img('meals/curry'),
      tableImage: img('tables/friends-table'),
      menu: {
        mainDish: 'Coconut vegetable curry (avial)',
        sides: ['Lemon rice', 'Cabbage & coconut thoran', 'Coriander chutney'],
        dessert: 'Mango with lime',
        drinks: 'Spiced chai with soy milk, and water',
      },
      ingredients: [
        ing('cur_1', 'Basmati rice', 80, 'g', 'ps', 0.2),
        ing('cur_2', 'Carrot, green beans & potato', 200, 'g', 'ps', 0.7),
        ing('cur_3', 'Coconut milk', 0.25, 'can', 'ps', 0.38),
        ing('cur_4', 'White cabbage', 80, 'g', 'ps', 0.12),
        ing('cur_5', 'Grated coconut', 15, 'g', 'ps', 0.15),
        ing('cur_6', 'Mango', 0.33, 'pcs', 'ps', 0.45),
        ing('cur_7', 'Soy milk (for chai)', 100, 'ml', 'ps', 0.18, ['soy']),
        ing('cur_8', 'Turmeric, mustard seeds & curry leaves', 1, 'pack', 'wd', 2.6, ['mustard']),
        ing('cur_9', 'Fresh coriander & ginger', 1, 'pack', 'wd', 1.5),
        ing('cur_10', 'Limes & lemons', 4, 'pcs', 'wd', 1.4),
        ing('cur_11', 'Coconut oil', 50, 'ml', 'wd', 0.6),
        ing('cur_12', 'Black tea & chai spices', 1, 'pack', 'wd', 1.2),
      ],
      diet: 'vegan',
      dietaryTags: ['halal', 'gluten_free', 'lactose_free'],
      extraAllergens: [],
      alcohol: 'alcohol_free',
      social: 'just_eat',
      ageGroup: '18_24',
      houseRules: ['Shoes off at the door', 'Quiet after 22:00 for the neighbours'],
      hostCompensationCents: 100,
    }),
    makeDinner({
      id: 'din_salmon',
      hostId: 'u_lukas',
      status: 'published',
      title: 'Oven-baked salmon & spring greens',
      description:
        'Herb-crusted salmon with crushed new potatoes, green beans and a lemony dill dressing. Expect a chatty table – I love hearing where everyone is from.',
      startsAt: iso(atTime(now, 5, 19, 0)),
      durationMinutes: 150,
      neighborhood: 'Zeeheldenbuurt',
      areaHint: 'A few minutes from the Westerhaven',
      privateAddress: 'Tromptstraat 5, 9718 BL Groningen (demo address)',
      guestSeats: 4,
      hostEats: true,
      mealImage: img('meals/salmon'),
      tableImage: img('tables/garden-table'),
      menu: {
        mainDish: 'Herb-crusted baked salmon',
        sides: ['Crushed new potatoes', 'Green beans with almonds', 'Dill & lemon yoghurt'],
        dessert: 'Stroopwafel ice cream',
        drinks: 'Alcohol-free elderflower spritz and water',
      },
      ingredients: [
        ing('sal_1', 'Salmon fillet', 150, 'g', 'ps', 3.2, ['fish']),
        ing('sal_2', 'New potatoes', 200, 'g', 'ps', 0.35),
        ing('sal_3', 'Green beans', 100, 'g', 'ps', 0.45),
        ing('sal_4', 'Flaked almonds', 10, 'g', 'ps', 0.2, ['tree_nuts']),
        ing('sal_5', 'Greek yoghurt', 40, 'g', 'ps', 0.2, ['milk']),
        ing('sal_6', 'Stroopwafels', 1, 'pcs', 'ps', 0.3, ['gluten', 'eggs', 'milk', 'soy']),
        ing('sal_7', 'Vanilla ice cream', 80, 'ml', 'ps', 0.4, ['milk', 'eggs']),
        ing('sal_8', 'Breadcrumbs & herbs', 1, 'pack', 'wd', 1.6, ['gluten']),
        ing('sal_9', 'Fresh dill', 1, 'bunch', 'wd', 1.1),
        ing('sal_10', 'Lemons', 2, 'pcs', 'wd', 0.7),
        ing('sal_11', 'Elderflower cordial', 1, 'pcs', 'wd', 2.8),
      ],
      diet: 'pescatarian',
      dietaryTags: [],
      extraAllergens: [],
      alcohol: 'alcohol_possible',
      social: 'eat_meet',
      ageGroup: '25_34',
      houseRules: ['Please arrive on time'],
      hostCompensationCents: 200,
    }),
    makeDinner({
      id: 'din_dumplings',
      hostId: 'u_yuki',
      status: 'published',
      title: 'Pork & cabbage dumpling workshop',
      description:
        'We fold dumplings together, then steam and pan-fry them. You’ll learn the pleats, eat a lot and leave with new friends.',
      startsAt: iso(atTime(now, 6, 18, 0)),
      durationMinutes: 180,
      neighborhood: 'Binnenstad',
      areaHint: 'Near the Vismarkt',
      privateAddress: 'Oude Kijk in ’t Jatstraat 30, 9712 EK Groningen (demo address)',
      guestSeats: 6,
      hostEats: true,
      mealImage: img('meals/dumplings'),
      tableImage: img('tables/wooden-table'),
      menu: {
        mainDish: 'Pork & napa cabbage dumplings, steamed and pan-fried',
        sides: ['Smashed cucumber salad', 'Chilli-sesame dipping sauce'],
        dessert: 'Matcha & white chocolate cookies',
        drinks: 'Jasmine tea and water',
      },
      ingredients: [
        ing('dum_1', 'Minced pork', 80, 'g', 'ps', 0.95),
        ing('dum_2', 'Napa cabbage', 70, 'g', 'ps', 0.2),
        ing('dum_3', 'Dumpling wrappers', 10, 'pcs', 'ps', 0.55, ['gluten']),
        ing('dum_4', 'Cucumber', 0.5, 'pcs', 'ps', 0.3),
        ing('dum_5', 'Matcha cookies (homemade)', 2, 'pcs', 'ps', 0.45, ['gluten', 'eggs', 'milk']),
        ing('dum_6', 'Spring onion & ginger', 1, 'pack', 'wd', 1.2),
        ing('dum_7', 'Soy sauce', 60, 'ml', 'wd', 0.6, ['soy', 'gluten']),
        ing('dum_8', 'Toasted sesame oil', 30, 'ml', 'wd', 0.7, ['sesame']),
        ing('dum_9', 'Chilli crisp', 1, 'pcs', 'wd', 3.2, ['soy', 'sesame']),
        ing('dum_10', 'Jasmine tea', 1, 'pack', 'wd', 1.9),
      ],
      diet: 'omnivore',
      dietaryTags: [],
      extraAllergens: [],
      alcohol: 'alcohol_free',
      social: 'eat_meet',
      ageGroup: 'any',
      houseRules: ['Shoes off at the door', 'Help with the dishes is welcome'],
      hostCompensationCents: 250,
    }),
    makeDinner({
      id: 'din_bowls',
      hostId: 'u_daan',
      status: 'published',
      title: 'Rainbow buddha bowls',
      description:
        'Build-your-own bowls with roasted sweet potato, spiced chickpeas, avocado, pickled red cabbage and a tahini-lime dressing. Colourful and fully plant-based.',
      startsAt: iso(atTime(now, 1, 18, 30)),
      durationMinutes: 120,
      neighborhood: 'Helpman',
      areaHint: 'Near the Stadspark',
      privateAddress: 'Verlengde Hereweg 140, 9722 AJ Groningen (demo address)',
      guestSeats: 4,
      hostEats: true,
      mealImage: img('meals/buddha-bowl'),
      tableImage: img('tables/shared-plates'),
      menu: {
        mainDish: 'Build-your-own rainbow bowls',
        sides: ['Tahini-lime dressing', 'Quick-pickled red cabbage'],
        dessert: 'Dark chocolate with sea salt',
        drinks: 'Cold-brew hibiscus tea',
      },
      ingredients: [
        ing('bow_1', 'Quinoa', 70, 'g', 'ps', 0.4),
        ing('bow_2', 'Sweet potato', 150, 'g', 'ps', 0.35),
        ing('bow_3', 'Chickpeas', 0.5, 'can', 'ps', 0.4),
        ing('bow_4', 'Avocado', 0.5, 'pcs', 'ps', 0.6),
        ing('bow_5', 'Red cabbage', 60, 'g', 'ps', 0.1),
        ing('bow_6', 'Cherry tomatoes', 80, 'g', 'ps', 0.45),
        ing('bow_7', 'Tahini', 1, 'pcs', 'wd', 3.1, ['sesame']),
        ing('bow_8', 'Limes', 3, 'pcs', 'wd', 0.9),
        ing('bow_9', 'Dark chocolate', 1, 'pack', 'wd', 2.2, ['soy']),
        ing('bow_10', 'Hibiscus tea', 1, 'pack', 'wd', 2.5),
      ],
      diet: 'vegan',
      dietaryTags: ['gluten_free', 'lactose_free', 'halal'],
      extraAllergens: [],
      alcohol: 'alcohol_free',
      social: 'flexible',
      ageGroup: 'any',
      houseRules: ['There are two small kids at home'],
      hostCompensationCents: 100,
      publishedDaysBefore: 8,
    }),
    makeDinner({
      id: 'din_gadogado',
      hostId: 'u_sari',
      status: 'published',
      title: 'Indonesian gado-gado evening',
      description:
        'A Dutch-Indonesian favourite: vegetables, tofu, tempeh, egg and potato with a rich homemade peanut sauce and crispy kroepoek. A big table and plenty of stories.',
      startsAt: iso(atTime(now, 3, 19, 0)),
      durationMinutes: 150,
      neighborhood: 'Korrewegwijk',
      areaHint: 'Near the Korreweg shops',
      privateAddress: 'Bedumerweg 61, 9716 AA Groningen (demo address)',
      guestSeats: 6,
      hostEats: true,
      mealImage: img('meals/gado-gado'),
      tableImage: img('tables/rustic-table'),
      menu: {
        mainDish: 'Gado-gado with homemade peanut sauce',
        sides: ['Cassava kroepoek', 'Sambal on the side'],
        dessert: 'Spekkoek (layered spice cake)',
        drinks: 'Iced lemongrass tea',
      },
      ingredients: [
        ing('gad_1', 'Tofu', 80, 'g', 'ps', 0.4, ['soy']),
        ing('gad_2', 'Tempeh', 60, 'g', 'ps', 0.5, ['soy']),
        ing('gad_3', 'Eggs', 1, 'pcs', 'ps', 0.3, ['eggs']),
        ing('gad_4', 'Potatoes, beans, sprouts & cabbage', 220, 'g', 'ps', 0.7),
        ing('gad_5', 'Peanut butter & roasted peanuts', 60, 'g', 'ps', 0.55, ['peanuts']),
        ing('gad_6', 'Ketjap manis', 1, 'pcs', 'wd', 2.1, ['soy', 'gluten']),
        ing('gad_7', 'Cassava kroepoek', 1, 'pack', 'wd', 1.8),
        ing('gad_8', 'Spekkoek', 1, 'pcs', 'wd', 6.5, ['gluten', 'eggs', 'milk']),
        ing('gad_9', 'Lemongrass & limes', 1, 'pack', 'wd', 1.6),
        ing('gad_10', 'Sambal oelek', 1, 'pcs', 'wd', 1.4),
      ],
      diet: 'vegetarian',
      dietaryTags: [],
      extraAllergens: [],
      alcohol: 'alcohol_free',
      social: 'eat_meet',
      ageGroup: 'any',
      houseRules: ['Shoes off at the door'],
      hostCompensationCents: 150,
    }),

    // ---------------- Awaiting wrap-up (yesterday) ----------------
    makeDinner({
      id: 'din_soup',
      hostId: 'u_marieke',
      status: 'published',
      title: 'Thai red curry pumpkin soup',
      description:
        'Velvety pumpkin soup with vegan red curry paste and coconut, jasmine rice, crispy vegetable spring rolls and mango sticky rice for dessert.',
      startsAt: iso(atTime(now, -1, 19, 0)),
      durationMinutes: 120,
      neighborhood: 'Oosterpoort',
      areaHint: 'Near De Oosterpoort concert hall',
      privateAddress: 'Meeuwerderweg 112-A, 9724 EV Groningen (demo address)',
      guestSeats: 5,
      hostEats: true,
      mealImage: img('meals/red-curry-soup'),
      tableImage: img('tables/green-dining'),
      menu: {
        mainDish: 'Thai red curry pumpkin soup',
        sides: ['Jasmine rice', 'Vegetable spring rolls'],
        dessert: 'Mango sticky rice',
        drinks: 'Lemongrass tea and water',
      },
      ingredients: [
        ing('sou_1', 'Pumpkin', 250, 'g', 'ps', 0.45),
        ing('sou_2', 'Coconut milk', 0.25, 'can', 'ps', 0.38),
        ing('sou_3', 'Jasmine rice', 70, 'g', 'ps', 0.18),
        ing('sou_4', 'Firm tofu', 60, 'g', 'ps', 0.3, ['soy']),
        ing('sou_5', 'Vegetable spring rolls', 2, 'pcs', 'ps', 0.6, ['gluten', 'soy']),
        ing('sou_6', 'Vegan red curry paste', 1, 'pcs', 'wd', 1.9),
        ing('sou_7', 'Lime & coriander', 1, 'pack', 'wd', 1.5),
        ing('sou_8', 'Mango & sticky rice', 1, 'pack', 'wd', 4.2),
      ],
      diet: 'vegan',
      dietaryTags: ['lactose_free'],
      extraAllergens: [],
      alcohol: 'alcohol_free',
      social: 'eat_meet',
      ageGroup: 'any',
      houseRules: ['Shoes off at the door', 'There is a cat in the house'],
      hostCompensationCents: 150,
    }),

    // ---------------- Completed ----------------
    makeDinner({
      id: 'din_penne',
      hostId: 'u_marieke',
      status: 'completed',
      title: 'Penne arrabbiata & garden salad',
      description: 'Fiery tomato penne, a big garden salad and an alcohol-free tiramisu.',
      startsAt: iso(atTime(now, -13, 18, 30)),
      durationMinutes: 150,
      neighborhood: 'Oosterpoort',
      areaHint: 'Near De Oosterpoort concert hall',
      privateAddress: 'Meeuwerderweg 112-A, 9724 EV Groningen (demo address)',
      guestSeats: 6,
      hostEats: true,
      mealImage: img('meals/penne'),
      tableImage: img('tables/green-dining'),
      menu: {
        mainDish: 'Penne all’arrabbiata',
        sides: ['Garden salad'],
        dessert: 'Alcohol-free tiramisu',
        drinks: 'Lemonade and water',
      },
      ingredients: [
        ing('pen_1', 'Penne', 100, 'g', 'ps', 0.18, ['gluten']),
        ing('pen_2', 'Chopped tomatoes', 0.5, 'can', 'ps', 0.45),
        ing('pen_3', 'Vegetarian hard cheese', 20, 'g', 'ps', 0.48, ['milk']),
        ing('pen_4', 'Mixed salad leaves', 60, 'g', 'ps', 0.5),
        ing('pen_5', 'Garlic & chilli', 1, 'pack', 'wd', 0.9),
        ing('pen_6', 'Basil', 1, 'bunch', 'wd', 1.1),
        ing('pen_7', 'Olive oil', 60, 'ml', 'wd', 0.75),
        ing('pen_8', 'Mascarpone, eggs & ladyfingers', 1, 'pack', 'wd', 7.5, ['milk', 'eggs', 'gluten']),
      ],
      diet: 'vegetarian',
      dietaryTags: [],
      extraAllergens: [],
      alcohol: 'alcohol_free',
      social: 'eat_meet',
      ageGroup: 'any',
      houseRules: ['Shoes off at the door'],
      hostCompensationCents: 150,
    }),
    makeDinner({
      id: 'din_lasagne',
      hostId: 'u_marieke',
      status: 'completed',
      title: 'Sunday beef lasagne',
      description: 'Slow-cooked ragù, silky béchamel and a warm apple crumble.',
      startsAt: iso(atTime(now, -6, 18, 0)),
      durationMinutes: 150,
      neighborhood: 'Oosterpoort',
      areaHint: 'Near De Oosterpoort concert hall',
      privateAddress: 'Meeuwerderweg 112-A, 9724 EV Groningen (demo address)',
      guestSeats: 6,
      hostEats: true,
      mealImage: img('meals/lasagne'),
      tableImage: img('tables/green-dining'),
      menu: { mainDish: 'Beef lasagne', sides: ['Green salad'], dessert: 'Apple crumble', drinks: 'Water and iced tea' },
      ingredients: [
        ing('las_1', 'Beef mince', 110, 'g', 'ps', 1.1),
        ing('las_2', 'Lasagne sheets', 70, 'g', 'ps', 0.2, ['gluten', 'eggs']),
        ing('las_3', 'Passata', 150, 'ml', 'ps', 0.25),
        ing('las_4', 'Milk & butter (béchamel)', 120, 'ml', 'ps', 0.25, ['milk']),
        ing('las_5', 'Mozzarella & parmesan', 50, 'g', 'ps', 0.7, ['milk']),
        ing('las_6', 'Onion, carrot & celery', 120, 'g', 'ps', 0.3, ['celery']),
        ing('las_7', 'Herbs & garlic', 1, 'pack', 'wd', 1.3),
        ing('las_8', 'Green salad', 1, 'pack', 'wd', 1.9),
        ing('las_9', 'Apples, flour & butter (crumble)', 1, 'pack', 'wd', 4.6, ['gluten', 'milk']),
      ],
      diet: 'omnivore',
      dietaryTags: [],
      extraAllergens: [],
      alcohol: 'alcohol_free',
      social: 'eat_meet',
      ageGroup: 'any',
      houseRules: ['Shoes off at the door'],
      hostCompensationCents: 150,
    }),
    makeDinner({
      id: 'din_pizza',
      hostId: 'u_yuki',
      status: 'completed',
      title: 'Homemade pizza night',
      description: 'Hand-stretched pizzas with seasonal vegetables and a vanilla panna cotta.',
      startsAt: iso(atTime(now, -5, 18, 30)),
      durationMinutes: 150,
      neighborhood: 'Binnenstad',
      areaHint: 'Near the Vismarkt',
      privateAddress: 'Oude Kijk in ’t Jatstraat 30, 9712 EK Groningen (demo address)',
      guestSeats: 6,
      hostEats: true,
      mealImage: img('meals/pizza'),
      tableImage: img('tables/wooden-table'),
      menu: { mainDish: 'Vegetable pizzas', sides: ['Rocket salad'], dessert: 'Panna cotta with berries', drinks: 'Lemonade' },
      ingredients: [
        ing('piz_1', 'Pizza dough (flour & yeast)', 180, 'g', 'ps', 0.3, ['gluten']),
        ing('piz_2', 'Tomato sauce', 80, 'ml', 'ps', 0.2),
        ing('piz_3', 'Mozzarella', 70, 'g', 'ps', 0.65, ['milk']),
        ing('piz_4', 'Peppers, mushrooms & onion', 120, 'g', 'ps', 0.55),
        ing('piz_5', 'Rocket & basil', 1, 'pack', 'wd', 1.6),
        ing('piz_6', 'Olive oil', 50, 'ml', 'wd', 0.6),
        ing('piz_7', 'Cream, sugar & berries', 1, 'pack', 'wd', 4.8, ['milk']),
      ],
      diet: 'vegetarian',
      dietaryTags: [],
      extraAllergens: [],
      alcohol: 'alcohol_free',
      social: 'eat_meet',
      ageGroup: 'any',
      houseRules: ['Shoes off at the door'],
      hostCompensationCents: 200,
    }),
    makeDinner({
      id: 'din_ramen',
      hostId: 'u_daan',
      status: 'completed',
      title: 'Shoyu ramen night',
      description: 'Twelve-hour broth, chashu, soft eggs and all the toppings.',
      startsAt: iso(atTime(now, -9, 19, 0)),
      durationMinutes: 120,
      neighborhood: 'Helpman',
      areaHint: 'Near the Stadspark',
      privateAddress: 'Verlengde Hereweg 140, 9722 AJ Groningen (demo address)',
      guestSeats: 4,
      hostEats: true,
      mealImage: img('meals/ramen'),
      tableImage: img('tables/shared-plates'),
      menu: { mainDish: 'Shoyu ramen', sides: ['Pickled cucumber'], dessert: '', drinks: 'Barley tea' },
      ingredients: [
        ing('ram_1', 'Ramen noodles', 120, 'g', 'ps', 0.55, ['gluten']),
        ing('ram_2', 'Chicken & pork broth', 500, 'ml', 'ps', 0.9),
        ing('ram_3', 'Chashu pork', 70, 'g', 'ps', 0.95),
        ing('ram_4', 'Soft-boiled eggs', 1, 'pcs', 'ps', 0.3, ['eggs']),
        ing('ram_5', 'Shiitake & spring onion', 1, 'pack', 'wd', 2.4),
        ing('ram_6', 'Soy sauce & rice vinegar', 1, 'pack', 'wd', 1.5, ['soy', 'gluten']),
        ing('ram_7', 'Nori & sesame', 1, 'pack', 'wd', 1.8, ['sesame']),
      ],
      diet: 'omnivore',
      dietaryTags: [],
      extraAllergens: [],
      alcohol: 'alcohol_free',
      social: 'just_eat',
      ageGroup: 'any',
      houseRules: [],
      hostCompensationCents: 200,
    }),
    makeDinner({
      id: 'din_skewers',
      hostId: 'u_lukas',
      status: 'completed',
      title: 'Garden grill: skewers & salads',
      description: 'Chicken and halloumi skewers off the grill, warm flatbreads and a big tomato salad.',
      startsAt: iso(atTime(now, -4, 18, 30)),
      durationMinutes: 150,
      neighborhood: 'Zeeheldenbuurt',
      areaHint: 'A few minutes from the Westerhaven',
      privateAddress: 'Tromptstraat 5, 9718 BL Groningen (demo address)',
      guestSeats: 6,
      hostEats: true,
      mealImage: img('meals/skewers'),
      tableImage: img('tables/garden-table'),
      menu: { mainDish: 'Chicken & halloumi skewers', sides: ['Flatbreads', 'Tomato & cucumber salad'], dessert: 'Watermelon', drinks: 'Iced tea' },
      ingredients: [
        ing('ske_1', 'Chicken thigh', 150, 'g', 'ps', 1.3),
        ing('ske_2', 'Halloumi & vegetables', 80, 'g', 'ps', 0.85, ['milk']),
        ing('ske_3', 'Flatbreads', 1, 'pcs', 'ps', 0.35, ['gluten']),
        ing('ske_4', 'Garlic yoghurt sauce', 40, 'g', 'ps', 0.2, ['milk']),
        ing('ske_5', 'Tomato & cucumber salad', 120, 'g', 'ps', 0.4),
        ing('ske_6', 'Spices & marinade', 1, 'pack', 'wd', 1.9, ['mustard']),
        ing('ske_7', 'Watermelon', 1, 'pcs', 'wd', 3.2),
      ],
      diet: 'omnivore',
      dietaryTags: [],
      extraAllergens: [],
      alcohol: 'alcohol_possible',
      social: 'eat_meet',
      ageGroup: 'any',
      houseRules: [],
      hostCompensationCents: 200,
    }),

    // ---------------- Draft ----------------
    makeDinner({
      id: 'din_draft_stamppot',
      hostId: 'u_marieke',
      status: 'draft',
      title: 'Dutch stamppot evening',
      description: 'Classic boerenkool stamppot with vegetarian smoked sausage and gravy.',
      startsAt: iso(atTime(now, 9, 18, 30)),
      durationMinutes: 150,
      neighborhood: 'Oosterpoort',
      areaHint: 'Near De Oosterpoort concert hall',
      privateAddress: 'Meeuwerderweg 112-A, 9724 EV Groningen (demo address)',
      guestSeats: 6,
      hostEats: true,
      mealImage: null,
      tableImage: img('tables/green-dining'),
      menu: { mainDish: 'Boerenkool stamppot', sides: ['Vegetarian smoked sausage'], dessert: '', drinks: '' },
      ingredients: [
        ing('sta_1', 'Floury potatoes', 250, 'g', 'ps', 0.4),
        ing('sta_2', 'Curly kale', 120, 'g', 'ps', 0.5),
        ing('sta_3', 'Vegetarian smoked sausage', 1, 'pcs', 'ps', 1.2, ['soy']),
      ],
      diet: 'vegetarian',
      dietaryTags: [],
      extraAllergens: [],
      alcohol: 'alcohol_free',
      social: 'eat_meet',
      ageGroup: 'any',
      houseRules: [],
      hostCompensationCents: 100,
    }),
  ];

  // -------------------------------------------------------------------------
  // Reservations, contributions, reviews, reports
  // -------------------------------------------------------------------------
  const dinnerMap = Object.fromEntries(dinners.map((d) => [d.id, d])) as Record<ID, Dinner>;
  const reservations: Record<ID, Reservation> = {};
  const contributions: Record<ID, Contribution> = {};
  const reviews: Record<ID, Review> = {};
  const reports: Record<ID, SustainabilityReport> = {};
  let counter = 0;

  const book = (
    dinnerId: ID,
    guestId: ID,
    status: ReservationStatus,
    options: { bookedDaysBeforeStart?: number; cancelledDaysAgo?: number } = {},
  ): ID => {
    counter += 1;
    const dinner = dinnerMap[dinnerId];
    const pricing = dinner.pricing!;
    const start = new Date(dinner.startsAt).getTime();
    const created = iso(new Date(Math.min(start - (options.bookedDaysBeforeStart ?? 4) * 864e5, now.getTime() - 36e5)));
    const reservationId = `res_seed_${counter}`;
    const contributionId = `con_seed_${counter}`;
    const cancelledAt = options.cancelledDaysAgo != null ? daysAgo(options.cancelledDaysAgo) : undefined;
    reservations[reservationId] = {
      id: reservationId,
      dinnerId,
      guestId,
      status,
      createdAt: created,
      cancelledAt,
      cancelledBy: status === 'cancelled' ? 'guest' : undefined,
      contributionId,
      acknowledgements: { allergens: true, foodSafety: true, terms: true, dietDifference: false },
      noteToHost: '',
    };
    contributions[contributionId] = {
      id: contributionId,
      reservationId,
      provider: 'demo',
      providerReference: `demo_seed_${counter}`,
      ingredientShareCents: pricing.ingredientShareCents,
      hostCompensationCents: pricing.hostCompensationCents,
      platformFeeCents: pricing.platformFeeCents,
      totalCents: pricing.totalPerGuestCents,
      refundedCents: status === 'cancelled' ? pricing.totalPerGuestCents : 0,
      status:
        status === 'cancelled'
          ? 'demo_refunded'
          : status === 'attended' || status === 'no_show'
            ? 'demo_settled'
            : 'demo_authorized',
      createdAt: created,
      updatedAt: cancelledAt ?? created,
    };
    return reservationId;
  };

  const review = (
    reservationId: ID,
    [quality, taste, overall, hygiene]: [number, number, number, number],
    comment: string,
  ) => {
    const r = reservations[reservationId];
    const dinner = dinnerMap[r.dinnerId];
    const id = `rev_${reservationId}`;
    reviews[id] = {
      id,
      dinnerId: dinner.id,
      hostId: dinner.hostId,
      guestId: r.guestId,
      reservationId,
      food: { quality, taste, overall },
      hygiene,
      comment,
      createdAt: iso(new Date(new Date(dinner.startsAt).getTime() + 20 * 36e5)),
    };
  };

  const report = (dinnerId: ID, r: Omit<SustainabilityReport, 'dinnerId' | 'plannedServings' | 'recordedAt' | 'allPortionsServed' | 'estimatedBudgetCents'>) => {
    const dinner = dinnerMap[dinnerId];
    reports[dinnerId] = {
      dinnerId,
      plannedServings: dinner.pricing!.plannedServings,
      allPortionsServed: r.portionsServed >= r.portionsPrepared,
      estimatedBudgetCents: dinner.pricing!.ingredientBudgetCents,
      recordedAt: iso(new Date(new Date(dinner.startsAt).getTime() + 4 * 36e5)),
      ...r,
    };
  };

  // Upcoming
  book('din_risotto', 'u_noor', 'confirmed');
  book('din_risotto', 'u_tim', 'confirmed');
  book('din_shakshuka', 'u_sofia', 'confirmed', { bookedDaysBeforeStart: 3 });
  book('din_shakshuka', 'u_elif', 'confirmed');
  ['u_lotte', 'u_jonas', 'u_mateo', 'u_hannah', 'u_bram'].forEach((g) => book('din_curry', g, 'confirmed'));
  ['u_tim', 'u_lotte', 'u_mateo', 'u_hannah'].forEach((g) => book('din_salmon', g, 'confirmed'));
  book('din_dumplings', 'u_jonas', 'confirmed');
  book('din_bowls', 'u_sofia', 'cancelled', { bookedDaysBeforeStart: 6, cancelledDaysAgo: 3 });
  ['u_elif', 'u_bram', 'u_hannah'].forEach((g) => book('din_gadogado', g, 'confirmed'));

  // Yesterday – waiting for the host to confirm attendance
  ['u_sofia', 'u_noor', 'u_jonas'].forEach((g) => book('din_soup', g, 'confirmed', { bookedDaysBeforeStart: 5 }));

  // Completed: penne (13 days ago)
  const penSofia = book('din_penne', 'u_sofia', 'attended');
  const penNoor = book('din_penne', 'u_noor', 'attended');
  const penTim = book('din_penne', 'u_tim', 'attended');
  const penLotte = book('din_penne', 'u_lotte', 'attended');
  book('din_penne', 'u_elif', 'attended');
  review(penSofia, [5, 5, 5, 5], 'Felt like dinner at a friend’s place. Spotless kitchen and Marieke checked my allergy twice.');
  review(penNoor, [4, 5, 4, 5], 'Lovely evening and great conversation. The tiramisu was amazing.');
  review(penTim, [5, 4, 5, 4], 'Generous portions and a really warm host.');
  review(penLotte, [4, 4, 4, 5], 'Simple food done well. Would come again.');
  report('din_penne', {
    actualDiners: 6,
    portionsPrepared: 7,
    portionsServed: 6,
    leftoverPortions: 1,
    leftoverHandling: 'shared_with_guests',
    notes: 'One spare portion packed for a guest to take home.',
    actualSpendCents: dinnerMap.din_penne.pricing!.ingredientBudgetCents - 140,
  });

  // Completed: lasagne (6 days ago)
  const lasTim = book('din_lasagne', 'u_tim', 'attended');
  const lasJonas = book('din_lasagne', 'u_jonas', 'attended');
  const lasMateo = book('din_lasagne', 'u_mateo', 'attended');
  const lasBram = book('din_lasagne', 'u_bram', 'attended');
  book('din_lasagne', 'u_hannah', 'attended');
  review(lasTim, [5, 5, 5, 4], 'Best lasagne I have had in Groningen.');
  review(lasJonas, [4, 5, 5, 5], 'Cosy and welcoming. Very clean home.');
  review(lasMateo, [5, 5, 4, 5], 'Tastes like home. Grazie Marieke!');
  review(lasBram, [4, 4, 4, 4], 'Good food, nice people.');
  report('din_lasagne', {
    actualDiners: 6,
    portionsPrepared: 6,
    portionsServed: 6,
    leftoverPortions: 0,
    leftoverHandling: 'none',
    notes: 'Bought for 6 diners after the sixth seat stayed empty.',
    actualSpendCents: dinnerMap.din_lasagne.pricing!.ingredientBudgetCents - 260,
  });

  // Completed: pizza (5 days ago) – Sofia attended and can still review
  book('din_pizza', 'u_sofia', 'attended');
  const pizNoor = book('din_pizza', 'u_noor', 'attended');
  const pizElif = book('din_pizza', 'u_elif', 'attended');
  book('din_pizza', 'u_lotte', 'attended');
  book('din_pizza', 'u_mateo', 'no_show');
  review(pizNoor, [5, 5, 5, 5], 'Making our own pizzas was so much fun.');
  review(pizElif, [4, 5, 4, 4], 'Great dough! Yuki explained every allergen on the table.');
  report('din_pizza', {
    actualDiners: 5,
    portionsPrepared: 6,
    portionsServed: 5,
    leftoverPortions: 1,
    leftoverHandling: 'stored',
    notes: 'One guest did not show up. The spare dough ball went into the freezer.',
    actualSpendCents: null,
  });

  // Completed: ramen (9 days ago)
  const ramJonas = book('din_ramen', 'u_jonas', 'attended');
  const ramMateo = book('din_ramen', 'u_mateo', 'attended');
  const ramBram = book('din_ramen', 'u_bram', 'attended');
  book('din_ramen', 'u_tim', 'attended');
  review(ramJonas, [5, 5, 5, 4], 'That broth! Worth every cent.');
  review(ramMateo, [4, 4, 5, 4], 'Quiet, relaxed dinner – exactly what I wanted.');
  review(ramBram, [5, 5, 5, 5], 'Daan is a ramen wizard.');
  report('din_ramen', {
    actualDiners: 5,
    portionsPrepared: 5,
    portionsServed: 5,
    leftoverPortions: 0,
    leftoverHandling: 'none',
    notes: '',
    actualSpendCents: dinnerMap.din_ramen.pricing!.ingredientBudgetCents + 90,
  });

  // Completed: skewers (4 days ago)
  const skeMateo = book('din_skewers', 'u_mateo', 'attended');
  const skeHannah = book('din_skewers', 'u_hannah', 'attended');
  book('din_skewers', 'u_bram', 'attended');
  book('din_skewers', 'u_jonas', 'attended');
  review(skeMateo, [4, 4, 4, 4], 'Nice garden and good company.');
  review(skeHannah, [5, 4, 4, 5], 'Lukas clearly cares about hygiene – separate boards for everything.');
  report('din_skewers', {
    actualDiners: 5,
    portionsPrepared: 6,
    portionsServed: 5,
    leftoverPortions: 1,
    leftoverHandling: 'composted',
    notes: 'Bought for 6 before two seats stayed empty. Some leftover salad went to the compost.',
    actualSpendCents: dinnerMap.din_skewers.pricing!.ingredientBudgetCents - 410,
  });

  return {
    schemaVersion: 1,
    seededAt: iso(now),
    session: { currentUserId: 'u_sofia', mode: 'guest', onboarded: false, adultConfirmed: false },
    users: Object.fromEntries(users.map((u) => [u.id, u])),
    dinners: dinnerMap,
    reservations,
    contributions,
    reviews,
    reports,
    concerns: {},
  };
}
