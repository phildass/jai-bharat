# Deployment Guide

## Overview

This guide covers deployment of the Jai Bharat Super-App to production:

| Service | Domain |
|---------|--------|
| **Web App** (Next.js) | https://app.jaibharat.cloud |
| **Backend API** (Node.js/Express) | https://api.jaibharat.cloud |
| **Mobile App** (React Native) | Android / iOS stores |

## Architecture

```
                   ┌────────────────────────────────┐
                   │   app.jaibharat.cloud (Web)    │
                   │     Next.js – apps/web          │
                   └────────────────┬───────────────┘
                                    │ NEXT_PUBLIC_API_BASE_URL
                   ┌────────────────▼───────────────┐
React Native  ───► │  api.jaibharat.cloud (API)     │
                   │    Node/Express – /backend      │
                   └────────────────┬───────────────┘
                                    │ SUPABASE_SERVICE_ROLE_KEY (server only)
                                    │ LOCATIONIQ_API_KEY (server only)
                   ┌────────────────▼───────────────┐
                   │         Supabase DB/Auth        │
                   └────────────────────────────────┘
```

## Environment Variables

Copy `.env.example` to `.env` in the repo root and fill in values.

### Backend (`/backend`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (from Supabase → Settings → Database) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only** – never expose to browser/mobile |
| `LOCATIONIQ_API_KEY` | Reverse geocoding – never expose to client |
| `PORT` | Default `8080` |
| `NODE_ENV` | `production` in prod |
| `AIENTER_WEBHOOK_SECRET` | Webhook HMAC secret |

### Web App (`/apps/web`)

Create `/apps/web/.env.local` (copy from `.env.local.example`):

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | Browser-facing API URL (safe to expose) |

## Quick Start (Local Development)

```bash
# 1. Clone and install
git clone https://github.com/phildass/jai-bharat
cd jai-bharat
cp .env.example .env  # fill in values

# 2. Start backend API (http://localhost:8080)
npm run api:dev

# 3. Start web app (http://localhost:3000)
cp apps/web/.env.local.example apps/web/.env.local
npm run web:dev

# 4. Seed sample jobs
npm run api:seed

# 5. Smoke test
npm run api:smoke
```

## Backend Deployment (api.jaibharat.cloud)

### Railway / Render / Fly.io

```bash
# Set environment variables on the platform, then:
cd backend
npm start    # node server.js
```

Healthcheck endpoint: `GET /health` → `{ "ok": true, "version": "...", "timestamp": "..." }`

### Docker

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ ./
EXPOSE 8080
CMD ["node", "server.js"]
```

```bash
docker build -t jai-bharat-api .
docker run -p 8080:8080 --env-file .env jai-bharat-api
```

### CORS

The backend allows:
- `https://app.jaibharat.cloud`
- `https://jaibharat.cloud`
- `http://localhost:*` (dev only)

## Web App Deployment (app.jaibharat.cloud)

### Vercel (recommended)

```bash
cd apps/web
npx vercel deploy --prod

# Set environment variable in Vercel dashboard:
# NEXT_PUBLIC_API_BASE_URL = https://api.jaibharat.cloud
```

### Self-hosted (Node.js)

```bash
cd apps/web
npm run build
npm start        # next start -p 3000
```

### Self-hosted (Static export + CDN)

```bash
# In apps/web/next.config.js, add: output: 'export'
npm run build
# Upload apps/web/out/ to S3, GCS, or Cloudflare Pages
```

## Supabase Setup

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref <your-project-ref>

# Run migrations
supabase db push

# Or apply migrations manually via Supabase SQL editor:
# Copy contents of supabase/migrations/001_initial_schema.sql
```

### Database URL

From Supabase dashboard → Settings → Database → Connection string.
Use the **pooler** connection string for production (port 6543 with pgBouncer).

## Root Convenience Scripts

```bash
npm run api:dev      # Start backend with nodemon
npm run api:start    # Start backend (production)
npm run api:seed     # Seed 40 sample government jobs
npm run api:smoke    # Quick smoke test (/health + /api/jobs)
npm run web:dev      # Start Next.js web app in dev mode
npm run web:build    # Build Next.js web app
npm run web:start    # Start Next.js web app (production)
```

## SSL/TLS

```nginx
server {
    listen 443 ssl http2;
    server_name api.jaibharat.cloud;

    ssl_certificate /etc/letsencrypt/live/jaibharat.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/jaibharat.cloud/privkey.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name app.jaibharat.cloud;

    ssl_certificate /etc/letsencrypt/live/jaibharat.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/jaibharat.cloud/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Security Checklist

- [x] `SUPABASE_SERVICE_ROLE_KEY` only in backend environment, never in browser bundle
- [x] `LOCATIONIQ_API_KEY` only in backend environment, never in browser bundle
- [x] CORS restricted to known origins
- [x] Rate limiting on all API endpoints
- [x] Input validation on all query parameters
- [x] HTTPS / SSL certificates
- [x] Security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy)

## Health Check / Monitoring

```bash
# API health
curl https://api.jaibharat.cloud/health
# → { "ok": true, "version": "1.0.0", "timestamp": "..." }

# Jobs endpoint
curl "https://api.jaibharat.cloud/api/jobs?pageSize=1"

# Geo proxy
curl "https://api.jaibharat.cloud/api/geo/reverse?lat=28.6139&lon=77.2090"
```

---

**Last Updated**: February 2026  
**Version**: 2.0

```
┌─────────────────────────────────────┐
│         CDN (Static Assets)         │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│      Load Balancer (Nginx)          │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│        API Gateway                   │
└─────────────────────────────────────┘
                 ↓
      ┌──────────────────┐
      │   Microservices  │
      ├──────────────────┤
      │ Auth Service     │
      │ User Service     │
      │ Jobs Service     │
      │ Content Service  │
      │ Progress Service │
      │ Voice Service    │
      └──────────────────┘
                 ↓
      ┌──────────────────┐
      │    Databases     │
      ├──────────────────┤
      │ PostgreSQL       │
      │ MongoDB          │
      │ Redis            │
      └──────────────────┘
```

## Environment Setup

### 1. Production Environment Variables

Create `.env.production`:

```bash
# App
NODE_ENV=production
APP_NAME=Jai Bharat
APP_VERSION=1.0.0

# API
API_BASE_URL=https://api.jaibharat.cloud/v1
API_TIMEOUT=10000

# Authentication
JWT_SECRET=<your-secret-key>
JWT_EXPIRY=3600
REFRESH_TOKEN_EXPIRY=604800

# Database
DATABASE_URL=postgresql://user:pass@host:5432/jaibharat
MONGODB_URL=mongodb://user:pass@host:27017/jaibharat
REDIS_URL=redis://host:6379

# External APIs
API_SETU_KEY=<api-key>
API_SETU_URL=https://api.setu.co
OGD_API_KEY=<api-key>
NCS_API_KEY=<api-key>

# DigiLocker
DIGILOCKER_CLIENT_ID=<client-id>
DIGILOCKER_CLIENT_SECRET=<client-secret>
DIGILOCKER_REDIRECT_URI=https://jaibharat.cloud/auth/digilocker/callback

# WhatsApp Business API
WHATSAPP_API_KEY=<api-key>
WHATSAPP_PHONE_ID=<phone-id>
WHATSAPP_BUSINESS_ID=<business-id>

# Bhashini API
BHASHINI_API_KEY=<api-key>
BHASHINI_USER_ID=<user-id>

# AI/ML
GEMINI_API_KEY=<api-key>

# Cloud Storage
AWS_ACCESS_KEY_ID=<access-key>
AWS_SECRET_ACCESS_KEY=<secret-key>
AWS_S3_BUCKET=jaibharat-assets
AWS_REGION=ap-south-1

# Monitoring
SENTRY_DSN=<sentry-dsn>
LOG_LEVEL=info

# Mobile Push Notifications
FCM_SERVER_KEY=<fcm-key>
APNS_KEY_ID=<apns-key>
APNS_TEAM_ID=<team-id>
```

## Backend Deployment

### 1. Docker Setup

Create `Dockerfile`:

```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - postgres
      - mongodb
      - redis

  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: jaibharat
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  mongodb:
    image: mongo:6
    environment:
      MONGO_INITDB_DATABASE: jaibharat
    volumes:
      - mongo_data:/data/db

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - api

volumes:
  postgres_data:
  mongo_data:
  redis_data:
```

### 2. Kubernetes Deployment

Create `k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jai-bharat-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: jai-bharat-api
  template:
    metadata:
      labels:
        app: jai-bharat-api
    spec:
      containers:
      - name: api
        image: gcr.io/jai-bharat/api:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        envFrom:
        - secretRef:
            name: jai-bharat-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
---
apiVersion: v1
kind: Service
metadata:
  name: jai-bharat-api
spec:
  selector:
    app: jai-bharat-api
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

### 3. Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace jai-bharat

# Create secrets
kubectl create secret generic jai-bharat-secrets \
  --from-env-file=.env.production \
  -n jai-bharat

# Apply deployment
kubectl apply -f k8s/deployment.yaml -n jai-bharat

# Check status
kubectl get pods -n jai-bharat
kubectl get services -n jai-bharat
```

## Mobile App Deployment

### Android Deployment

#### 1. Build Release APK

```bash
cd android
./gradlew assembleRelease
```

Output: `android/app/build/outputs/apk/release/app-release.apk`

#### 2. Build Release AAB (for Play Store)

```bash
cd android
./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

#### 3. Sign the Build

Create `android/app/keystore.properties`:

```properties
storePassword=<store-password>
keyPassword=<key-password>
keyAlias=jai-bharat
storeFile=../jai-bharat.keystore
```

#### 4. Upload to Google Play Console

1. Go to Google Play Console
2. Create new app "Jai Bharat"
3. Upload AAB file
4. Fill in store listing details
5. Set up pricing & distribution
6. Submit for review

### iOS Deployment

#### 1. Build Release

```bash
# Install pods
cd ios
pod install

# Build
xcodebuild -workspace JaiBharat.xcworkspace \
  -scheme JaiBharat \
  -configuration Release \
  -archivePath build/JaiBharat.xcarchive \
  archive
```

#### 2. Create IPA

```bash
xcodebuild -exportArchive \
  -archivePath build/JaiBharat.xcarchive \
  -exportPath build \
  -exportOptionsPlist ExportOptions.plist
```

#### 3. Upload to App Store Connect

```bash
# Using Application Loader or Transporter
xcrun altool --upload-app \
  -f build/JaiBharat.ipa \
  -u <apple-id> \
  -p <app-specific-password>
```

Or use Xcode:
1. Open Xcode
2. Product → Archive
3. Window → Organizer
4. Select archive → Distribute App
5. Upload to App Store

## CI/CD Pipeline

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '16'
      - run: npm ci
      - run: npm test

  build-android:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-java@v3
        with:
          distribution: 'temurin'
          java-version: '11'
      - uses: actions/setup-node@v3
        with:
          node-version: '16'
      - run: npm ci
      - run: cd android && ./gradlew bundleRelease
      - uses: actions/upload-artifact@v3
        with:
          name: app-bundle
          path: android/app/build/outputs/bundle/release/

  build-ios:
    needs: test
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '16'
      - run: npm ci
      - run: cd ios && pod install
      - run: xcodebuild ...
      - uses: actions/upload-artifact@v3
        with:
          name: ipa
          path: build/JaiBharat.ipa

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: google-github-actions/setup-gcloud@v0
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
      - run: gcloud builds submit --tag gcr.io/jai-bharat/api
      - run: kubectl apply -f k8s/deployment.yaml
```

## Database Migrations

### PostgreSQL

Use a migration tool like Knex or TypeORM:

```bash
# Create migration
npm run migration:create AddUsersTable

# Run migrations
npm run migration:run

# Rollback
npm run migration:rollback
```

### Backup Strategy

```bash
# Automated daily backups
0 2 * * * pg_dump -U user jaibharat > /backups/jaibharat_$(date +\%Y\%m\%d).sql
0 2 * * * mongodump --db jaibharat --out /backups/mongo_$(date +\%Y\%m\%d)

# Keep last 30 days
find /backups -name "*.sql" -mtime +30 -delete
```

## Monitoring & Logging

### Setup Monitoring

1. **Application Monitoring**: Sentry, New Relic
2. **Infrastructure Monitoring**: Prometheus + Grafana
3. **Log Aggregation**: ELK Stack or CloudWatch

### Health Checks

Create `/health` endpoint:

```typescript
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime(),
    version: process.env.APP_VERSION
  });
});
```

### Alerts

Setup alerts for:
- API response time > 1s
- Error rate > 1%
- CPU usage > 80%
- Memory usage > 85%
- Disk usage > 90%

## SSL/TLS Configuration

### Let's Encrypt Setup

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d jaibharat.cloud -d api.jaibharat.cloud

# Auto-renewal
sudo certbot renew --dry-run
```

### Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name api.jaibharat.cloud;

    ssl_certificate /etc/letsencrypt/live/jaibharat.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/jaibharat.cloud/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Scaling Strategy

### Horizontal Scaling

```bash
# Scale API pods
kubectl scale deployment jai-bharat-api --replicas=5 -n jai-bharat

# Auto-scaling
kubectl autoscale deployment jai-bharat-api \
  --cpu-percent=70 \
  --min=3 \
  --max=10 \
  -n jai-bharat
```

### Database Scaling

- Read replicas for read-heavy operations
- Connection pooling
- Query optimization
- Caching with Redis

## Performance Optimization

1. **CDN**: CloudFront/Cloudflare for static assets
2. **Caching**: Redis for session and API responses
3. **Compression**: Gzip/Brotli for API responses
4. **Image Optimization**: WebP format, lazy loading
5. **Code Splitting**: Lazy load modules

## Security Checklist

- [ ] HTTPS enabled with valid certificate
- [ ] API keys in environment variables
- [ ] Database credentials encrypted
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Security headers configured
- [ ] Regular security audits
- [ ] Dependency updates automated

## Post-Deployment

### Verification

```bash
# Check API health
curl https://api.jaibharat.cloud/health

# Check endpoints
curl https://api.jaibharat.cloud/v1/jobs

# Monitor logs
kubectl logs -f deployment/jai-bharat-api -n jai-bharat

# Check metrics
kubectl top pods -n jai-bharat
```

### Rollback Plan

```bash
# Rollback Kubernetes deployment
kubectl rollout undo deployment/jai-bharat-api -n jai-bharat

# Check rollout status
kubectl rollout status deployment/jai-bharat-api -n jai-bharat
```

## Maintenance

### Regular Tasks

**Daily:**
- Monitor error rates
- Check system health
- Review security logs

**Weekly:**
- Review performance metrics
- Check disk space
- Update dependencies

**Monthly:**
- Security audit
- Database optimization
- Cost review

**Quarterly:**
- Disaster recovery drill
- Architecture review
- Capacity planning

## Support

- DevOps: devops@jaibharat.cloud
- Deployment Issues: deploy@jaibharat.cloud
- Emergency: +91-XXXX-XXXXXX

---

**Last Updated**: February 2026
**Version**: 1.0
