# Govt Jobs Search – Feature Documentation

Phase 1 of the Jai Bharat Govt Jobs Search product: keyword search, state/district filters, results + detail pages, "Jobs Near Me" (map + radius), ingestion framework, and seed data.

---

## 1. Environment Variables

Add these to your `.env` file (copy `.env.example` as a template):

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string, e.g. `postgresql://user:pass@localhost:5432/jai_bharat` |
| `LOCATIONIQ_API_KEY` | ✅ for `/api/geo/reverse` | Server-side only reverse-geocoding key. Get a free key at [locationiq.com](https://locationiq.com). **Never expose this to the browser/client.** |
| `PORT` | optional | Backend port (default: `3000`) |
| `NODE_ENV` | optional | `development` or `production` |

---

## 2. Database Setup

### 2a. Apply migrations

```bash
# From repo root
psql "$DATABASE_URL" -f database/schema.sql
psql "$DATABASE_URL" -f backend/db/schema.sql
psql "$DATABASE_URL" -f backend/db/jobs_migration.sql
```

The `jobs_migration.sql` file:
- Enables `pg_trgm` extension for fuzzy search
- Creates `job_sources`, `jobs`, and `geo_cache` tables
- Adds GIN indexes for full-text search and trigram matching
- Installs a trigger that auto-updates `jobs.search_vector` on insert/update

### 2b. Seed sample data

```bash
cd backend
DATABASE_URL="postgresql://..." npm run seed
# or
DATABASE_URL="postgresql://..." node seeds/seed_jobs.js
```

This inserts **40 realistic sample jobs** across 15+ Indian states with lat/lon, so both `/api/jobs` and `/api/jobs/nearby` return results immediately.

---

## 3. Running the Backend

```bash
cd backend
npm install
npm start           # production
npm run dev         # with nodemon hot-reload
```

---

## 4. API Reference

### 4a. `GET /api/jobs` – Search jobs

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `q` | string | Keyword search (title, organisation, category) |
| `state` | string | Filter by state (case-insensitive) |
| `district` | string | Filter by district |
| `category` | string | Filter by category (e.g. `Engineering`, `Police`) |
| `qualification` | string | Filter by qualification |
| `status` | string | `open` \| `closed` \| `result_out` \| `upcoming` |
| `sort` | string | `latest` (default) \| `closing_soon` \| `relevance` |
| `page` | number | Page number (default: 1) |
| `pageSize` | number | Results per page (default: 20, max: 100) |

**Response:**
```json
{
  "results": [ { "id": 1, "title": "...", "organisation": "...", ... } ],
  "total": 40,
  "page": 1,
  "pageSize": 20,
  "facets": {
    "states": ["Delhi", "Maharashtra", ...],
    "categories": ["Banking", "Engineering", ...],
    "statuses": ["open", "upcoming"]
  }
}
```

**curl example:**
```bash
# All open jobs
curl "http://localhost:3000/api/jobs?status=open&sort=latest"

# Search for "engineer" in Maharashtra
curl "http://localhost:3000/api/jobs?q=engineer&state=Maharashtra"

# Closing soon, page 2
curl "http://localhost:3000/api/jobs?sort=closing_soon&page=2&pageSize=10"
```

---

### 4b. `GET /api/jobs/:id` – Job detail

```bash
curl "http://localhost:3000/api/jobs/1"
```

Returns the full job row as JSON.

---

### 4c. `GET /api/jobs/nearby` – Proximity search

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `lat` | number | User latitude (required) |
| `lon` | number | User longitude (required) |
| `radiusKm` | number | `10` \| `25` (default) \| `50` \| `100` |
| `limit` | number | Max results (default: 20, max: 100) |

**Response:** same as `/api/jobs` but each result also has `distanceKm`.

**curl example:**
```bash
# Jobs within 25 km of Mumbai (Bandra)
curl "http://localhost:3000/api/jobs/nearby?lat=19.0596&lon=72.8295&radiusKm=25"

# Jobs within 50 km of Delhi
curl "http://localhost:3000/api/jobs/nearby?lat=28.6139&lon=77.2090&radiusKm=50&limit=10"
```

---

### 4d. `GET /api/geo/reverse` – Reverse geocoding proxy

Proxies LocationIQ, **server-side only**. Results are cached in `geo_cache` for 24 hours.

```bash
curl "http://localhost:3000/api/geo/reverse?lat=19.0760&lon=72.8777"
```

Response:
```json
{
  "display_name": "Mumbai, Mumbai City, Maharashtra, India",
  "address": { "city": "Mumbai", "state": "Maharashtra", "country": "India" },
  "lat": "19.0760",
  "lon": "72.8777"
}
```

---

## 5. Ingestion Framework

Configuration is in `backend/ingestion/sources.json`.

### Source config format

```json
{
  "id": "my-source",
  "name": "Human-readable name",
  "base_url": "https://...",
  "type": "rss | html | pdf",
  "active": true,
  "config": {
    "defaultOrg": "Organisation Name",
    "defaultState": "State",
    "defaultCategory": "Category"
  }
}
```

### Running the ingestion runner

```bash
cd backend
DATABASE_URL="postgresql://..." node ingestion/runner.js
```

Only sources with `"active": true` are processed. Each adapter deduplicates by SHA-256 hash of `(title + organisation + source_url)`.

### Adapters

| File | Type | Description |
|---|---|---|
| `ingestion/rss.js` | RSS | Parses RSS/Atom feeds via `rss-parser` |
| `ingestion/html.js` | HTML | Extracts job list items via CSS selectors using `node-html-parser` |
| `ingestion/pdf.js` | PDF | Downloads PDF + extracts printable text (Phase 1 naive stub) |
| `ingestion/dedup.js` | — | SHA-256 deduplication helper |
| `ingestion/runner.js` | — | Orchestrator: reads sources.json, runs adapters, bulk-inserts new jobs |

---

## 6. Frontend Screens (React Native)

| Screen | Route | File |
|---|---|---|
| Jobs Search | `Jobs` | `src/screens/jobs/JobsSearchScreen.tsx` |
| Job Detail | `JobDetail` | `src/screens/jobs/JobDetailScreen.tsx` |
| Jobs Near Me | `JobsNearMe` | `src/screens/jobs/JobsNearMeScreen.tsx` |

Navigation is wired in `src/navigation/AppNavigator.tsx`.  
The "Near Me" screen uses `react-native-webview` + Leaflet (CDN) for the map.

---

## 7. Verification Checklist

- [ ] Migrations applied without errors (`jobs`, `job_sources`, `geo_cache` tables exist)
- [ ] Seed data inserted (40 rows in `jobs`)
- [ ] `GET /api/jobs` returns results with `total > 0`
- [ ] `GET /api/jobs?q=engineer` returns relevant results
- [ ] `GET /api/jobs/nearby?lat=28.6139&lon=77.2090&radiusKm=50` returns jobs with `distanceKm`
- [ ] `GET /api/geo/reverse?lat=28.6139&lon=77.2090` returns address (requires `LOCATIONIQ_API_KEY`)
- [ ] `/api/geo/reverse` result is cached (second call faster, no external request)
- [ ] React Native app: Home → "Search Govt Jobs" button navigates to Jobs screen
- [ ] Jobs screen shows list of jobs, filters work, pagination loads more
- [ ] Tapping a job opens Job Detail screen with "View Notification" link
- [ ] Jobs Near Me: "Enable Location" button requests permission and shows map + list
- [ ] `LOCATIONIQ_API_KEY` is NOT included in any client-side bundle or API response
