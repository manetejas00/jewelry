# Production Deployment Guide

## Overview
This document outlines the standard deployment procedure, environment variables, preflight verification, database migrations, and rollbacks for Veyora Jewels.

---

## 1. Prerequisites
- **Node.js**: v20+ LTS or v22+
- **Database**: SQLite3 (`better-sqlite3`) for staging / single-node or MySQL 8.0 for clustered deployment.
- **Image Processing**: `sharp` v0.35.5+ compiled with WebP and libvips support.

---

## 2. Environment Configuration (`.env`)
Ensure the following environment variables are defined in production:

```ini
NODE_ENV=production
PORT=3000
APP_URL=https://veyora.example.com
BRAND_NAME=Veyora Jewels

# Database (SQLite default or MySQL)
DATABASE_CLIENT=better-sqlite3
DATABASE_PATH=private/store.sqlite

# Merchant & Contact
MERCHANT_READY=true
MERCHANT_EMAIL=concierge@veyora.example.com
FREE_SHIPPING_INR=25000
SHIPPING_INR=250

# Security
SESSION_SECRET=super-secret-random-32-byte-hex-string
```

---

## 3. Step-by-Step Deployment Routine

### Step 1: Install Dependencies
```bash
npm ci --omit=dev
```

### Step 2: Run Database Migrations
Runs all migrations including `019_categories_and_combos.js`:
```bash
npm run migrate
```

### Step 3: Run Database Seeders (Preview / Fresh Deployments)
Idempotently inserts categories, kurta styles, and combos without duplicating existing records:
```bash
npm run seed:preview
```

### Step 4: Asset Integrity Check
Verify that all 464 product image assets exist and have no hash collisions:
```bash
npm run assets:check
```

### Step 5: Build Production Client Assets
Compile the React 19 application using Vite:
```bash
npm run build
```

### Step 6: Execute Automated Test Suite
Run all 208 unit and integration tests:
```bash
npm test
```

### Step 7: Launch Service
Start the production Node.js Express server:
```bash
npm start
```
Or via PM2 / systemd:
```bash
pm2 start server/index.js --name "veyora-production" -i max
```

---

## 4. Verification Checkpoints
After starting the server:
1. `GET /health/ready` -> Expected HTTP 200 OK.
2. `GET /robots.txt` -> Expected valid robots rules.
3. `GET /sitemap.xml` -> Expected `<urlset>` containing categories, products, and combos.
4. `GET /api/categories` -> Expected array of active categories.
5. `GET /api/combos` -> Expected array of published combos.
6. `GET /` -> Verify Homepage Hero Showcase starts video and cycles properly.

---

## 5. Rollback Strategy
If any issues arise during deployment:
1. Revert to previous Git release tag:
   ```bash
   git checkout tags/v1.X.X
   ```
2. Re-run client build:
   ```bash
   npm run build
   ```
3. Restart process manager:
   ```bash
   pm2 restart veyora-production
   ```
4. Database rollbacks (if needed):
   ```bash
   node scripts/migrate-rollback.js
   ```
