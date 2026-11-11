# Eat&Meet – mobile app

**Share a table. Share the cost. Make a connection.**

Eat&Meet connects people who like to cook (hosts) with people who want an affordable home-cooked meal and, if they feel like it, new company (guests). Guests chip in for ingredients, hosts earn a small capped preparation fee, and a transparent platform fee funds Eat&Meet. Menus are published at least 24 hours ahead and hosts shop for *confirmed* diners, which is the mechanism for less unnecessary food buying.

Prototype for the Green Business Challenge – AI Edition 2026 (Groningen). **This build contains no AI features.**

---

## Run it on an iPhone (Expo Go)

```bash
cd mobile
npm install          # first time only
npx expo start       # then scan the QR code with the iPhone camera → opens in Expo Go
```

- Phone and laptop must be on the same Wi-Fi. If the venue Wi-Fi blocks this, use `npx expo start --tunnel`.
- Expo Go must support **SDK 58** (update Expo Go from the App Store if it complains).
- Everything runs in Expo Go – no development build, accounts, API keys or paid services.

### Checks

```bash
npm run typecheck      # TypeScript
npm run lint           # ESLint (eslint-config-expo)
npm run test:domain    # 26 business-rule tests (pricing, 24 h rule, capacity, allergens, cancellations, reviews, persistence)
```

---

## Demo script (≈ 5 minutes)

Before presenting: **Profile → Demo controls → Reset demo data**. All dates are generated relative to *now*, so the demo always has upcoming dinners, one dinner from yesterday awaiting wrap-up and several completed ones. Switch person/role at any time with the **name pill (top right)** or **Profile → Switch demo profile**.

| Scene | Who | Steps |
|---|---|---|
| 1. Guest discovers & books | **Sofia · Guest** | Discover → chips *Vegetarian*, *Alcohol-free*, *Eat & Meet* → **Wild mushroom risotto night** → show menu, ingredients, allergens, host scores, price split → **Reserve a seat** → tick safety acknowledgements → terms → **Confirm demo** → “You’re at the table!” (address now revealed). Back on the listing: seats went from 4 → 3 left. Bonus: open **Indonesian gado-gado evening** – booking is blocked because Sofia listed a peanut allergy. |
| 2. Host manages | **Marieke · Host** | Dashboard shows the new booking and contributions → open the risotto → guest list with *Allergies at this table: Peanuts (Sofia)* → **Shopping list**: “4 plates, not 7” → tick items as bought, type actual costs. |
| 3. Host creates a dinner | **Marieke · Host** | **Create a dinner** → *Fill in an example* (or type) → pick demo photos → *Use example menu & ingredients* → preferences → costs (live budget, prep fee, platform fee) → Review → **Publish**. Try a start time less than 24 h away first to show the rule blocking it. |
| 4. Guest books the new dinner | **Sofia · Guest** | Discover → search “gnocchi” → reserve → seats drop → appears under **My dinners**. |
| 5. Impact | either | **Marieke**: Dashboard → *Wrap up dinner* for yesterday’s soup (attendance, portions, leftovers). **Sofia**: My dinners → Past → *Rate food & hygiene* (only possible now). Then the **Impact** tab: planned vs booked plates, measured portions/leftovers, cost split, and the explicit assumptions. |

---

## What’s implemented

**Guest:** onboarding with adult confirmation · preferences (diet, other needs, *separate* EU-14 allergy section, alcohol, age group, social style) · Discover with search and working filters (date, price, diet, atmosphere, seats, neighbourhood, alcohol-free, allergen-safe, “fits me”) · dinner details (photos, host, ratings from real review records, menu, ingredients, allergens, atmosphere, privacy-aware location, price breakdown) · 3-step reservation (safety acknowledgements → contribution & cancellation terms → simulated confirmation) · My dinners (upcoming / past / cancelled) · cancellation with refund rules · reviews (food quality/taste/overall + hygiene), only after attendance, once per reservation · report a concern.

**Host:** dashboard (bookings, seats, contributions, prep fees, feedback, drafts, past dinners, dinners needing wrap-up) · 6-step Create Dinner wizard with validation, 24-hour publish rule, photo picker + labelled demo photos, structured ingredient editor (per plate / whole dinner, units, prices, allergens), live budget and pricing, preview, drafts · dinner management (guest dietary/allergy info, money split, cancel dinner with full refunds) · shopping list sized to confirmed diners with purchase tracking and actual costs · post-dinner wrap-up (attendance, diners, portions, leftovers and their fate).

**Platform:** sustainability/impact dashboard (no invented CO₂ numbers) · demo profile & role switcher · local persistence (survives app restarts) · trust & safety and business-model explanations in Profile.

### Business rules (all in `src/domain`, all tested)

- Money is integer **euro cents**. Ingredient share = shopping budget ÷ planned plates (host pays their own plate), rounded *up* so the host is never short.
- Host prep fee: host-set per guest, suggested at 25 % of the ingredient share, **capped at €6.00**.
- Platform fee: **10 %** of (ingredients + prep fee), min €0.50, max €2.00. Values live in `PRICING` in `src/domain/constants.ts`.
- Price is **locked when published**; booked guests are never re-priced.
- Publish only if the dinner starts **≥ 24 h** later. Seats are integers 1–12; overbooking is impossible.
- Allergen match → booking blocked. Diet mismatch → explicit acknowledgement required. Alcohol is never part of the budget (ingredients/drinks mentioning alcohol are rejected).
- Cancellation: full refund until 48 h before; after that the ingredient share is kept (host may have shopped); host cancellation refunds everyone.
- Reviews: only after the host confirms attendance of a completed dinner; one per reservation. Ratings are always computed from saved reviews.

---

## Project structure

```
mobile/
  src/app/                Expo Router routes (screens)
    (tabs)/               Discover|Dashboard · My dinners · Impact · Profile (labels follow the role)
    dinner/[id]           dinner details
    reserve/[id]          reservation flow (modal)
    reservation/[id]      confirmation, receipt, cancel, review entry
    review/[id]           review (modal)
    host/create           Create Dinner wizard (modal)
    host/dinner/[id]      manage bookings
    host/shopping/[id]    shopping list
    host/complete/[id]    post-dinner wrap-up (modal)
    onboarding, preferences, switch-profile, report/[id]
  src/domain/             typed models + pure business rules (no React) ← start here
  src/data/               seed data (Groningen), image registry, AsyncStorage repository
  src/services/payments   PaymentProvider interface + DemoPaymentProvider
  src/state/store.tsx     app store: loads/persists data, exposes typed actions
  src/components/         design system (ui/) and feature components
  src/features/           role-specific tab screens
  src/theme/tokens.ts     colours, type scale, spacing, radius, shadows, chart palette
  scripts/test-domain.mjs business-rule tests
  assets/images/demo/     demo photos (see CREDITS.md)
```

**Swapping in a backend later:** implement `AppRepository` (`src/data/repository.ts`) against an API and a real `PaymentProvider` (`src/services/payments.ts`); screens and rules don’t change. The pure functions in `src/domain/actions.ts` describe exactly what the server must enforce.

---

## Honest limitations

- **Demo only:** data lives on one phone (AsyncStorage). Two phones do not see each other’s bookings.
- **No real payments:** contributions are simulated, clearly labelled, with `DEMO-` references. No card data is collected.
- **Photos** are Unsplash stock images labelled “Demo photo”; hosts and addresses are fictional. Photos picked from the library are referenced from the phone’s cache, not uploaded anywhere.
- **Not yet addressed for launch:** identity verification, a regulated payment/payout provider, insurance, Dutch food-safety (NVWA) and tax questions for home cooks, GDPR processing of allergy data, moderation of reports.
- **Impact numbers** are planning differences and host-reported leftovers – not validated waste or CO₂ reductions.
- Built for iPhone first; Android should work (Expo Go) but was not tested on a device. The web build is only for quick previews (some native dialogs like confirmation alerts don’t appear on web).
