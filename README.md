# Jai Bharat Super-App

**India Govt. Jobs. Everywhere. Anywhere. Every Job. From Peons to IAS and beyond**

## Overview

Jai Bharat is a Super-App and Digital Employment Concierge that seamlessly guides Indian youth through the government job preparation journey. It integrates multiple mini-apps into a unified platform with voice-first, local-first, and AI-first features.

## Architecture

### Modular Mini-App System

```
jai-bharat/                    # Parent Shell
├── src/
│   ├── core/                  # Core Shell functionality
│   │   ├── auth/             # SSO & Authentication
│   │   ├── navigation/       # Triple-gate navigation
│   │   └── shell/            # Shell container
│   ├── modules/              # Feature modules (symlinked)
│   ├── shared/               # Shared components & utilities
│   └── services/             # Backend services
├── modules/
│   ├── learn-govt-jobs/      # Foundation: SSC, Banking, Railways, Police
│   └── learn-ias/            # Elite: UPSC/State PSC prep
├── config/                   # Configuration files
└── docs/                     # Documentation
```

## Jobs Near Me & Job Search API

### Overview

Jai Bharat includes a full-featured **Jobs API** backed by Supabase Postgres, with:
- Keyword full-text search (PostgreSQL FTS + pg_trgm fuzzy matching)
- Filters (state, category, board, status) + pagination + facets
- "Jobs Near Me" using PostGIS `ST_DWithin` (or Haversine fallback)
- Server-side reverse geocoding via LocationIQ (key never exposed to client)

---

### Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (Supabase pooler URL) |
| `SUPABASE_URL` | ✅ | Supabase project URL (`https://xxxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service-role key (server-only) |
| `LOCATIONIQ_API_KEY` | ✅ | LocationIQ API key (server-only, never sent to client) |
| `PORT` | optional | Backend port (default `3000`) |
| `NODE_ENV` | optional | `development` or `production` |

---

### Running Supabase Migrations

#### Option A – Supabase CLI (recommended)

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize (first time only)
supabase init

# Start local Supabase stack
supabase start

# Apply migrations to local DB
supabase db push

# Apply migrations to remote Supabase project
supabase db push --db-url "$DATABASE_URL"
```

#### Option B – psql directly

```bash
psql "$DATABASE_URL" -f supabase/migrations/20240101000000_create_jobs.sql
```

---

### Seeding Sample Jobs

After running migrations, seed 40 sample jobs across India:

```bash
cd backend
npm run seed
# Or: node scripts/seed-jobs.js
```

---

### Running the Backend

```bash
cd backend
npm install
npm run dev   # development (nodemon)
npm start     # production
```

---

### API Endpoints

#### GET /api/jobs

Search and filter jobs.

```bash
# All active jobs
curl "http://localhost:3000/api/jobs"

# Keyword search
curl "http://localhost:3000/api/jobs?q=Engineer"

# Filter by state + category, paginate
curl "http://localhost:3000/api/jobs?state=Maharashtra&category=Police&page=2&limit=10"

# Sort by last date ascending
curl "http://localhost:3000/api/jobs?sort=last_date&order=asc"
```

Response includes `jobs`, `total`, `page`, `totalPages`, and `facets` (state/category/status counts).

#### GET /api/jobs/:id

```bash
curl "http://localhost:3000/api/jobs/<uuid>"
```

#### GET /api/jobs/nearby

```bash
# Jobs within 25 km of New Delhi
curl "http://localhost:3000/api/jobs/nearby?lat=28.6139&lon=77.2090&radiusKm=25"

# Jobs within 50 km of Mumbai
curl "http://localhost:3000/api/jobs/nearby?lat=19.0760&lon=72.8777&radiusKm=50&limit=20"
```

Response includes `jobs` (each with `distanceKm`), sorted nearest-first.

#### GET /api/geo/reverse

Server-side proxy to LocationIQ (key never sent to client):

```bash
curl "http://localhost:3000/api/geo/reverse?lat=28.6139&lon=77.2090"
```

---

### Smoke Tests

With the backend running and jobs seeded:

```bash
cd backend
BASE_URL=http://localhost:3000 npm run smoke-test
```

---

### Frontend (React Native)

The app includes three jobs screens accessible via bottom tab navigation:

| Screen | Description |
|--------|-------------|
| **Jobs** tab | Search bar + filters + paginated list |
| Job Detail | Full job info with Apply button |
| **Near Me** tab | "Enable Location" → radius selector → Leaflet/OSM map + job list |

The map uses [Leaflet](https://leafletjs.com/) + [OpenStreetMap](https://www.openstreetmap.org/) tiles, rendered inside a `react-native-webview`.

To install WebView native module:

```bash
npm install react-native-webview
cd ios && pod install   # iOS
# Android links automatically via autolinking
```

---



### 1. Triple-Gate Navigation
After login, users select their path:
- **Jai Bharat Core**: Real-time job alerts, hyper-local discovery
- **Learn Govt Jobs**: Speed-driven prep for SSC, Banking, Railways, Police
- **Learn IAS**: Deep analysis and essay writing for UPSC/State PSC

### 2. Unified Backend & SSO
- Single Sign-On across all modules
- User profile and documents (DigiLocker) persist across modules
- Payment history synchronized
- Progress portability between modules

### 3. Content Sync Engine
- Shared modules (History, Polity, Current Affairs) stored once
- Delivered adaptively based on exam type
- Progress in one module auto-syncs to relevant areas in others

### 4. Inclusive "Village First" Technology
- **Voice-to-Job Search**: Bhashini/NLP integration for voice queries
- **Hyper-local Discovery**: Geofencing for taluk/district-level jobs
- **Accessible UI**: Semantic icons, color coding, glanceable dashboard

### 5. Data Engine & API Integration
- API Setu, OGD, NCS for official job postings
- DigiLocker integration for user verification
- WhatsApp Business API for alerts and admit cards
- AI PDF parsing for recruitment notifications

### 6. Eligibility AI Filter
- AI-powered eligibility checking with Gemini/BharatGPT
- Category-specific relaxations, education, age criteria
- State/district quota rules
- Output: Perfect Match, Potential Match, Future Match

### 7. Mock-Test Bot & Career Ladder
- AI-powered mock interview and quiz bot
- Unified mock-test platform with adaptive papers
- Career ladder tracking from Group C/D to IAS

### 8. Security & Privacy
- DigiLocker integration for document management
- Ephemeral sessions for form submissions
- Data wiped post-submission
- WhatsApp receipt delivery

## Technology Stack

- **Frontend**: React Native (for cross-platform mobile)
- **Backend**: Node.js/Express (microservices architecture)
- **Authentication**: OAuth 2.0 + JWT for SSO
- **Database**: PostgreSQL (user data), MongoDB (content)
- **AI/ML**: Gemini API, BharatGPT integration
- **Voice**: Bhashini API
- **Location**: React Native Geolocation
- **APIs**: API Setu, Open Government Data, National Career Service

## Getting Started

### Prerequisites
- Node.js >= 16.x
- React Native CLI
- Android Studio / Xcode

### Installation

```bash
# Install dependencies
npm install

# Install module dependencies
cd modules/learn-govt-jobs && npm install
cd ../learn-ias && npm install
cd ../..

# Start the app
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## Module Integration

Modules are integrated as independent feature packages that can be loaded dynamically by the Shell. Each module exposes:

1. **Navigation Routes**: Registered with the Shell's navigation system
2. **Configuration**: Module metadata and capabilities
3. **Services**: Shared services for backend communication
4. **Components**: Reusable UI components

## Development

### Adding a New Module

1. Create module directory in `modules/`
2. Define module interface in `src/modules/interfaces.ts`
3. Register module in Shell configuration
4. Implement module routes and screens

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

## Documentation

- [Architecture Guide](docs/architecture.md)
- [Module Integration Guide](docs/module-integration.md)
- [API Documentation](docs/api.md)
- [Security & Privacy Model](docs/security.md)
- [Voice Integration Guide](docs/voice-integration.md)
- [Deployment Guide](docs/deployment.md)

## Roadmap

See [ROADMAP.md](docs/ROADMAP.md) for planned features and improvements.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

- Website: https://jaibharat.cloud
- Email: support@jaibharat.cloud
- Twitter: @JaiBharatApp

---

**Built with ❤️ for Bharat's Youth**
