# Conscious Cart

Search, scan, and compare grocery products, then get an AI nutrition analysis tailored to your allergies, diets, and goals.

Built with **Flutter Web** (also runs on Android and iOS), **Firebase** (Auth, Firestore, Hosting, Cloud Functions in Python), the **USDA FoodData Central** API, and **Gemini** structured output.

## Background

Conscious Cart started as a team project for Google's AI Hackathon in April 2024: a Flutter mobile app that searched USDA data and asked Gemini for a health analysis. This repository is a ground-up rebuild of that idea. It is web-first, keeps API keys on the server, returns structured AI output, and adds dietary profiles, barcode scanning, comparisons, and healthier swaps.

## Features

- **Search** hundreds of thousands of branded and whole foods, filtered by Brands or Whole foods, with infinite scroll.
- **Barcode scanning** with a phone or laptop camera (UPC-A, UPC-E, EAN-13, EAN-8), plus manual entry.
- **Health score** from A to E (0 to 100) on every product, computed from nutrients per 100 g. It is inspired by Nutri-Score but simplified and unofficial.
- **AI analysis** with a verdict, allergens, diet fit (vegan, keto, gluten-free, and more), notable ingredients, pros, cons, and tips.
- **Dietary profile**: allergies, diets, goals, and custom ingredients to avoid. Every analysis is personalized, and allergen keyword hits are flagged even if the model misses them.
- **Healthier swaps**: Gemini suggests alternatives, and the backend grounds them in real USDA products that score higher and pass your allergen checks.
- **Compare** up to 4 products side by side, with best values highlighted and a nutrient bar chart. Comparisons are shareable by link on web.
- **Favorites** saved to your account and sortable by health score.
- **Guest mode** with in-place upgrade to a full account, so nothing is lost.

## How it fits together

```
Flutter app (web / Android / iOS)
  ├─ Firebase Auth (email + guest)
  ├─ Firestore: users/{uid} profile, users/{uid}/favorites
  └─ Callable Cloud Functions (Python) ── USDA FoodData Central
                                       └─ Gemini (structured JSON)
     Firestore caches: foodCache, analysisCache, swapCache, barcodeCache
     Firestore quotas: usage/{uid}_ai_{day}
```

API keys live only in Google Secret Manager. The app talks exclusively to callable functions, which verify the user's Firebase ID token.

## Project layout

```
lib/
  core/        router, theme, labels, JSON helpers
  models/      Food, FoodSummary, HealthScore, FoodAnalysis, DietaryProfile
  services/    ApiService (callables), AuthService, UserRepository (Firestore)
  state/       Riverpod providers, search and compare controllers
  widgets/     shared UI (food tile, score badge, nutrition table, states)
  features/    auth, search, food detail, scan, compare, favorites, profile, shell
functions/
  main.py            callable endpoints
  fdc_client.py      USDA client
  nutrition.py       normalization and health score (pure, tested)
  dietary_profile.py profile validation and allergen keyword checks
  ai.py              Gemini prompts and Pydantic schemas
  store.py           Firestore caching and quotas
  tests/             pytest suite
```

## Setup

### 1. Rotate the old keys

The original hackathon repo committed a USDA key and a Gemini key in `functions/main.py`. Treat both as leaked:

- Delete the Gemini key in [Google AI Studio](https://aistudio.google.com/apikey) and create a new one.
- Request a new USDA key at [api.data.gov/signup](https://api.data.gov/signup/).

### 2. Firebase project

Use the existing `aihackathon-739ad` project (already set in `.firebaserc` and `lib/firebase_options.dart`) or create a new one and run `flutterfire configure`.

In the Firebase console:

1. Upgrade to the **Blaze** plan (required for Cloud Functions and Secret Manager; this app stays well within free tier usage for personal use).
2. **Authentication**: enable the **Email/Password** and **Anonymous** providers. Add your Hosting domain under Authorized domains.
3. **Firestore**: create a database in production mode.

### 3. Secrets and settings

```bash
firebase functions:secrets:set USDA_API_KEY
firebase functions:secrets:set GEMINI_API_KEY
```

Non-secret settings are in `functions/.env` (model name and daily AI limits).

### 4. Generate platform folders

This repo contains `lib/` and `web/` only. Generate the rest without touching the code:

```bash
flutter create . --platforms=web,android,ios --project-name conscious_cart
flutter pub get
```

For Android, set `minSdk = 24` in `android/app/build.gradle.kts`. For iOS camera scanning, add `NSCameraUsageDescription` to `ios/Runner/Info.plist`.

### 5. Run locally

```bash
flutter run -d chrome
```

Backend tests:

```bash
cd functions
python3.13 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt pytest
python -m pytest tests
```

To use the emulators, put local secrets in `functions/.secret.local` (git-ignored) and run `firebase emulators:start`.

### 6. Deploy

```bash
flutter build web --release
firebase deploy --only firestore,functions,hosting
```

## Cost and abuse controls

- Every endpoint requires a signed-in user (guests included).
- AI calls are capped per user per day (40 for accounts, 10 for guests). Cached results do not count.
- Analyses are cached per product and profile for 30 days, product details for 7 days.
- Functions are capped at 10 instances.
- Client access to caches and quota counters is blocked by `firestore.rules`.

## Data and disclaimer

Nutrition data comes from [USDA FoodData Central](https://fdc.nal.usda.gov/). Health scores and AI analysis are informational and can be wrong. Always read the package label, and talk to a doctor or dietitian about allergies or medical diets.
