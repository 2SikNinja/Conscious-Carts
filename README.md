# Conscious Carts

[![CI](https://github.com/2SikNinja/Conscious-Carts/actions/workflows/ci.yml/badge.svg)](https://github.com/2SikNinja/Conscious-Carts/actions/workflows/ci.yml)

Search, scan, and compare grocery products, then get an AI nutrition analysis tailored to your allergies, diets, and goals.

Built with **Next.js** (App Router, TypeScript, Tailwind CSS), **Firebase** (Auth, Firestore, Cloud Functions in Python), the **USDA FoodData Central** API, and **Gemini** structured output.

## Features

- **Search** branded and whole foods from the USDA database, with filters and infinite scroll
- **Barcode scanning** with a phone or laptop camera, plus manual entry
- **Health score** from A to E on every product, computed from its nutrients
- **AI analysis** with a verdict, allergens, diet fit, notable ingredients, and tips
- **Dietary profile** of allergies, diets, goals, and ingredients to avoid, applied to every analysis
- **Compare** up to 4 products side by side with charts
- **Healthier swaps** grounded in real products that score higher and fit your profile
- **Favorites** and **guest mode**, with an in-place upgrade to a full account

## How it fits together

```
Next.js web app (Vercel)
  ├─ Firebase Auth (email + guest)
  ├─ Firestore: profile, favorites
  └─ Callable Cloud Functions (Python)
       ├─ USDA FoodData Central
       └─ Gemini (structured JSON)
     Firestore caches: foods, analyses, swaps, barcodes
     Firestore quotas: per-user daily AI limit
```

API keys live only in Google Secret Manager. The app talks to the backend exclusively through callable functions, which verify the user's Firebase ID token.

## Project layout

```
src/
  app/               Next.js routes, layout, metadata
  lib/firebase/      Firebase config validation and lazy client setup
functions/
  main.py            callable endpoints
  fdc_client.py      USDA client
  nutrition.py       normalization and health score (pure, tested)
  dietary_profile.py profile validation and allergen keyword checks
  ai.py              Gemini prompts and Pydantic schemas
  store.py           Firestore caching and quotas
  tests/             pytest suite
firestore.rules      per-user access rules
```

## Getting started

Requirements: Node.js 22.12+, Python 3.13, and the Firebase CLI (`npm install -g firebase-tools`).

### 1. Firebase project

In the [Firebase console](https://console.firebase.google.com/):

1. Upgrade to the **Blaze** plan (required for Cloud Functions and Secret Manager; personal use stays within the free tier).
2. **Authentication**: enable the **Email/Password** and **Anonymous** providers. Add your deployed domain under Authorized domains.
3. **Firestore**: create a database in production mode.
4. **Project settings > Your apps**: add a Web app and copy its config.

### 2. Backend secrets

Get a [Gemini API key](https://aistudio.google.com/apikey) and a [USDA API key](https://api.data.gov/signup/), then:

```bash
firebase login
firebase functions:secrets:set USDA_API_KEY
firebase functions:secrets:set GEMINI_API_KEY
firebase deploy --only firestore,functions
```

Non-secret settings (model name and daily AI limits) are in `functions/.env`.

### 3. Web app

```bash
npm install
cp .env.example .env.local   # then fill in the Firebase web config
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To develop against local emulators instead, set `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true`, put backend secrets in `functions/.secret.local` (git-ignored), and run `firebase emulators:start`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate route types and run the TypeScript compiler |
| `npm test` | Unit tests with Vitest |
| `npm run build` | Production build |

Backend tests:

```bash
cd functions
python3.13 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt pytest
python -m pytest tests
```

## Security decisions

- **No keys in the client or the repo.** The USDA and Gemini keys live in Secret Manager and are only read by Cloud Functions. The Firebase web config in `.env.local` identifies the project but grants nothing on its own.
- **Every endpoint requires a signed-in user** (guests included), verified from the Firebase ID token.
- **Per-user daily AI limits** (40 for accounts, 10 for guests). Cached results do not count.
- **Firestore rules** let users read and write only their own profile and favorites, validate the shape of what they write, and block client access to caches and quota counters.
- **Untrusted text stays data.** Profile values are validated against allowlists before they reach a prompt, and the prompt tells the model to ignore instructions inside product data.

## Data and disclaimer

Nutrition data comes from [USDA FoodData Central](https://fdc.nal.usda.gov/). Health scores and AI analysis are informational and can be wrong. Always read the package label, and talk to a doctor or dietitian about allergies or medical diets.
