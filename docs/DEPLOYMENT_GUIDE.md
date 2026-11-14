# Production Deployment Guide

## Overview
This document outlines the standard deployment procedure, environment variables, preflight verification, database migrations, asset checks, and post-deployment validation for Veyora Jewels.

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
APP_URL=https://test3.avinyacarefoundation.org
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
npm ci
```

### Step 2: Run Database Migrations
Runs all migrations including `020_kurta_module_and_remove_combos.js`:
```bash
npm run migrate
```

### Step 3: Run Seeders (Fresh / Staging Deployments)
Idempotently seeds categories and the 4 Chicken Curry Kurta styles across all 7 sizes (XS–XXXL = 28 variants):
```bash
node seeders/CategorySeeder.js
node seeders/KurtaSeeder.js
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

### Step 6: Full Preflight Verification
Runs automated tests, production build, and asset validation:
```bash
npm run check
```

### Step 7: Restart Application Service
```bash
pm2 restart veyora || npm run start
```

### Step 8: Live Post-Deployment Acceptance Gate
Run the independent verification script against the live host:
```bash
node scripts/verify-deployment.js https://test3.avinyacarefoundation.org
```

---

## 4. Rollback Procedure
If an issue occurs in production:
1. **Application Rollback:** Revert git commit: `git revert HEAD` and trigger deployment.
2. **Database Rollback:** If migration rollback is required:
   ```bash
   node scripts/rollback.js
   ```
3. **Cache Purge:** In Hostinger or CDN panel, clear static asset caches for `/assets/products/*` and `/assets/banners/*`.
