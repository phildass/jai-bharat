# Testing & Deployment Runbook

This guide covers how to run both the **backend API** and the **Next.js web app** on the server using PM2, so that the web can successfully call the API.

---

## Prerequisites

```bash
npm install -g pm2        # install PM2 globally (once)
cd /var/www/jai-bharat
npm install               # install root deps (if any)
cd backend && npm install
cd ../apps/web && npm install && npm run build
```

---

## D1) Backend under PM2

```bash
# Set required environment variables
export PORT=8080
export TEST_DATA_MODE=true          # use seed data (no real DB needed for testing)
export CORS_ORIGINS=https://bharat.jaibharat.cloud,http://72.60.203.189:3001,http://localhost:3001

# Start (or restart if already running)
pm2 start "npm run start" \
  --name jai-bharat-api \
  --cwd /var/www/jai-bharat/backend \
  --env PORT=8080 \
  --env TEST_DATA_MODE=true \
  --env CORS_ORIGINS="https://bharat.jaibharat.cloud,http://72.60.203.189:3001,http://localhost:3001"
```

Verify the backend is healthy:

```bash
curl http://localhost:8080/health
# Expected: {"ok":true,"version":"...","timestamp":"..."}

curl "http://localhost:8080/api/jobs"
# Expected: {"results":[...],"total":5,...}
```

---

## D2) Web under PM2 on port 3001

> Port 3001 is used to avoid conflict with any other service on port 3000.

```bash
# Create .env.local with the correct API base URL
cat > /var/www/jai-bharat/apps/web/.env.local <<'EOF'
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_APP_DOWNLOAD_URL=/downloads/jai-bharat.apk
EOF

# Build the Next.js app (required after any code change)
cd /var/www/jai-bharat/apps/web && npm run build

# Start under PM2
pm2 start "npx next start -p 3001" \
  --name jai-bharat-web \
  --cwd /var/www/jai-bharat/apps/web
```

Verify the web is up:

```bash
curl http://localhost:3001
# Should return HTML redirecting to /jobs
```

---

## D3) Required environment variables summary

### Backend (`/var/www/jai-bharat/backend/.env` or PM2 env)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | Port the API listens on |
| `NODE_ENV` | `development` | Node environment |
| `DATABASE_URL` | — | PostgreSQL connection string (not needed if TEST_DATA_MODE=true) |
| `TEST_DATA_MODE` | `false` | Set to `true` to return seed jobs data without a DB |
| `CORS_ORIGINS` | _(built-in defaults)_ | Comma-separated extra allowed CORS origins |
| `LOCATIONIQ_API_KEY` | — | For reverse-geocoding in "Near Me" feature |

Built-in CORS origins (always allowed):
- `https://app.jaibharat.cloud`
- `https://jaibharat.cloud`
- `https://bharat.jaibharat.cloud`
- `http://bharat.jaibharat.cloud`
- `http://72.60.203.189:3001`
- `http://localhost:*`
- `http://127.0.0.1:*`

### Web (`/var/www/jai-bharat/apps/web/.env.local`)

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8080` | Backend API base URL (exposed to browser) |
| `NEXT_PUBLIC_APP_DOWNLOAD_URL` | `/downloads/jai-bharat.apk` | APK download link for "Download App" button |

---

## PM2 Management

```bash
pm2 list                          # see all processes
pm2 logs jai-bharat-api           # tail backend logs
pm2 logs jai-bharat-web           # tail web logs
pm2 restart jai-bharat-api        # restart backend
pm2 restart jai-bharat-web        # restart web
pm2 stop jai-bharat-api           # stop backend
pm2 save                          # persist process list across reboots
pm2 startup                       # configure PM2 to start on boot
```

---

## Nginx Configuration (for `bharat.jaibharat.cloud`)

Ensure Nginx proxies port 3001 for the web and optionally port 8080 for the API:

```nginx
# /etc/nginx/sites-available/bharat.jaibharat.cloud
server {
    listen 80;
    server_name bharat.jaibharat.cloud;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

For the API subdomain (`api.jaibharat.cloud`):

```nginx
server {
    listen 80;
    server_name api.jaibharat.cloud;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Reload Nginx after changes:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## Quick test (all-in-one)

```bash
# 1. Start backend in test-data mode
TEST_DATA_MODE=true PORT=8080 node /var/www/jai-bharat/backend/server.js &

# 2. Verify health
curl http://localhost:8080/health

# 3. Verify jobs
curl "http://localhost:8080/api/jobs" | python3 -m json.tool | head -30
```
