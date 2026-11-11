# Deployment & Rollback Checklist

**Project:** Veyora Jewels (E-Commerce Platform & Bullion Portal)  
**Date:** 2026-11-11  
**Target Host:** Hostinger Cloud VPS (`https://test3.avinyacarefoundation.org`)  
**Deployment Tooling:** Git / PM2 / Vite / Node.js 22

---

## 1. Pre-Deployment Verification (Local)

Run these checks locally prior to initiating production deployment:

- [x] **Git Cleanliness:** Ensure working directory has no uncommitted ad-hoc changes.
- [x] **Full Test Suite:** Run `npm test` — all 142 tests must pass.
- [x] **Production Build:** Run `npm run build` — `dist/` must generate with zero warnings.
- [x] **Asset Integrity:** Run `npm run assets:check` — all product & coin images verified with 0 errors.
- [x] **Preflight Script:** Run `npm run check` — composite check must exit code 0.

---

## 2. Server Deployment Procedure

When authorized to deploy to the live server:

### Step 1: Pull Staged Changes
```bash
git fetch origin
git checkout main
git pull origin main
```

### Step 2: Install Dependencies (if changed)
```bash
npm ci --omit=dev
```

### Step 3: Run Database Migrations (Idempotent)
```bash
npm run migrate
```
*(Note: No destructive migrations were added. Schema remains 100% backward-compatible).*

### Step 4: Build Frontend Assets
```bash
npm run build
```
Verify that `dist/index.html` and `dist/assets/` are generated.

### Step 5: Reload Node Application Gracefully
```bash
pm2 reload veyora-jewels || pm2 restart veyora-jewels
```

---

## 3. Post-Deployment Verification (Smoke Tests)

Execute the automated live feature verification script:
```bash
node scripts/test-live-features.js
```

Or perform manual verification of key endpoints:
1. **Storefront Homepage:** Visit `https://test3.avinyacarefoundation.org/` (HTTP 200).
2. **Bullion Market Bar:** Check live rates display on `/coins`.
3. **Product Detail Page:** Check `/products/atelier-pearl-collar` renders gallery and reviews.
4. **Coin Detail Page:** Check `/coins/product/COIN-AU-1G`.
5. **Health Check:** `curl -s https://test3.avinyacarefoundation.org/health/ready` (expect `{"status":"ok"}`).
6. **Admin Studio:** Visit `https://test3.avinyacarefoundation.org/admin` and verify:
   - Dashboard statistics cards render.
   - Products listing displays filter bar and `+ Add Product` button.
   - Coins listing displays filter bar and `+ Add Coin` button.
   - Reviews moderation listing displays stats and filter options.

---

## 4. Emergency Rollback Procedure

If any unexpected regression occurs in production:

### Step 1: Checkout Previous Known Good Commit
```bash
git log --oneline -n 5
git checkout <PREVIOUS_COMMIT_HASH>
```

### Step 2: Rebuild & Restart
```bash
npm run build
pm2 reload veyora-jewels
```

### Step 3: Verify Restoration
```bash
curl -I https://test3.avinyacarefoundation.org/health/ready
```
Verify that HTTP 200 is returned and catalogue is serving.
