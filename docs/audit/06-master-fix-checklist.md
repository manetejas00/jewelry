# Master Prioritized Fix Checklist & Remediation Matrix

**Project:** Veyora Jewels (E-Commerce Platform)  
**Audit Date:** 2026-11-11  
**Auditor:** Automated Engineering Pair (Antigravity)  
**Status:** Audit Completed · Ready for Local Implementation

---

## 1. Prioritization Strategy

Issues are prioritized according to operational and user impact:
- **P0 (Critical):** Immediate production observability, server diagnostics, data integrity, and unhandled 500 logging.
- **P1 (High):** Major application error handling, React crash prevention (Error Boundary), and network error normalization.
- **P2 (Medium):** Reusable admin component architecture, code duplication reduction, and common listings.
- **P3 (Low):** Code quality, styling consistency, and final deployment documentation.

---

## 2. Master Issue Register

### P0 Issues: Critical Security & Observability

#### [P0-01] Missing Diagnostic Context in Backend 500 Error Logging
- **Module / File:** `server/index.js` (Lines 706-710)
- **Description:** Global error handler discards `err.message` and `err.stack` when HTTP status >= 500.
- **Severity:** P0 (Critical)
- **Reproduction Steps:**
  1. Trigger an uncaught error in any route handler (e.g. `throw new Error('Database connection failed')`).
  2. Inspect stdout/stderr logs.
- **Actual Behavior:** Logs `{event:'request_failed', requestId:'...', method:'GET', status:500}` with no message or stack trace.
- **Expected Behavior:** Logs `{event:'request_failed', requestId:'...', method:'GET', url:'...', status:500, message:'...', stack:'...', timestamp:'...'}` while keeping the client response sanitized.
- **Proposed Solution:** Update error handling middleware in `server/index.js` to print structured JSON containing error message, stack, request URL, method, and timestamp, safely redacting sensitive data.
- **Verification Criteria:** Trigger a synthetic 500 error in a unit test and assert that `console.error` receives the error message and stack trace.

---

#### [P0-02] Database Constraint Violations Fall Through to Generic 500s
- **Module / File:** `server/errors.js` (Function `errorResponse`)
- **Description:** When SQLite (`SQLITE_CONSTRAINT`) or MySQL (`ER_DUP_ENTRY`) throws a unique key violation, `errorResponse(err)` treats it as an internal server error (500) rather than a 409 Conflict.
- **Severity:** P0 (High/Critical)
- **Reproduction Steps:**
  1. Submit a duplicate product SKU or duplicate review without explicit route-level catch.
  2. Observe HTTP 500 status returned to client.
- **Actual Behavior:** Returns HTTP 500 with message `"The request could not be completed. Please try again."`
- **Expected Behavior:** Returns HTTP 409 Conflict with message `"A record with this identifier already exists."`
- **Proposed Solution:** In `server/errors.js`, inspect `err.code` and message for SQLite and MySQL duplicate constraint signatures, normalizing them to status 409.
- **Verification Criteria:** Unit test verifying `errorResponse({code: 'SQLITE_CONSTRAINT'})` returns `{status: 409}`.

---

### P1 Issues: Major Application Error Handling

#### [P1-01] Missing React Root Error Boundary
- **Module / File:** `src/ErrorBoundary.jsx` & `src/main.jsx`
- **Description:** Absence of an Error Boundary means any unhandled render exception causes React 18 to completely unmount the component tree, producing a blank white screen.
- **Severity:** P1 (High)
- **Reproduction Steps:**
  1. Introduce a runtime render error inside a child component (e.g. accessing property of undefined).
  2. Load the page in the browser.
- **Actual Behavior:** Screen turns completely blank with no navigational recovery.
- **Expected Behavior:** Renders an elegant fallback UI ("Something interrupted this view") with options to "Reload Page" or "Return to Storefront".
- **Proposed Solution:** Implement `src/ErrorBoundary.jsx` with lifecycle methods `getDerivedStateFromError` and `componentDidCatch`, wrapping `<App />` in `src/main.jsx`.
- **Verification Criteria:** Render a test component that throws inside `ErrorBoundary` and verify fallback UI is rendered.

---

#### [P1-02] Raw Browser Network Errors in API Client
- **Module / File:** `src/api.js` (Function `request`)
- **Description:** When fetch fails due to offline network or server down, it throws raw browser exceptions like `"TypeError: Failed to fetch"` or `"NetworkError"`.
- **Severity:** P1 (High)
- **Reproduction Steps:**
  1. Turn off network connectivity in browser DevTools.
  2. Attempt an action that invokes `api(...)`.
- **Actual Behavior:** Raw `Failed to fetch` error displayed to user.
- **Expected Behavior:** Normalized, friendly error: `"Unable to connect to Veyora servers. Please check your internet connection."`
- **Proposed Solution:** In `src/api.js`, catch `TypeError` during `fetch()` and replace message with friendly network advice.
- **Verification Criteria:** Unit test mocking fetch rejection with `TypeError` asserting normalized message.

---

#### [P1-03] Silent Session Error Swallowing in Admin Studio
- **Module / File:** `src/main.jsx` (L595)
- **Description:** `api('/admin/session').then(...).catch(() => {})` silences unexpected server failures. If a 500 error occurs during session retrieval, the admin panel remains indefinitely on a blank loading screen.
- **Severity:** P1 (High)
- **Reproduction Steps:**
  1. Cause `/api/admin/session` to return 500.
  2. Load `/admin`.
- **Actual Behavior:** Admin shows `"Opening merchant studio…"` forever or falls back silently without an error prompt.
- **Expected Behavior:** Renders clear error message if an unexpected 500 occurs, while cleanly treating 401/403 as the unauthenticated login state.
- **Proposed Solution:** Update session retrieval to check `err.status`: if not 401/403, set `error` state.
- **Verification Criteria:** Verified via unit test simulating 500 response on `/admin/session`.

---

### P2 Issues: Reusable Component Architecture

#### [P2-01] Duplicated Filter Bar Logic Across Admin Modules
- **Module / File:** `src/main.jsx` (`AdminProductList` and `CoinsAdmin`)
- **Description:** Identical search input, status select, stock select, pricing mode select, and reset button logic duplicated across products and coins.
- **Severity:** P2 (Medium)
- **Proposed Solution:** Extract reusable `CommonFilterBar` into `src/admin/components/CommonFilterBar.jsx`. Refactor `AdminProductList` and `CoinsAdmin` to use this component while preserving identical DOM classes and layout.
- **Verification Criteria:** Visual layout, interaction, filter clearing, and existing unit tests pass without regressions.

---

#### [P2-02] Unified Reusable Status Badge Component
- **Module / File:** `src/admin/components/CommonStatusBadge.jsx`
- **Description:** Scattered styling and logic for status badges (`published`, `draft`, `pending`, `approved`, `rejected`, `active`, `paused`).
- **Severity:** P2 (Medium)
- **Proposed Solution:** Extract `CommonStatusBadge` component that accepts `status` and `label` props and renders appropriate luxury badge styles.
- **Verification Criteria:** Badges render identically in both catalogue rows and review rows.

---

#### [P2-03] Reusable Luxury Empty State Component
- **Module / File:** `src/admin/components/CommonEmptyState.jsx`
- **Description:** Empty states are hand-coded across 8+ different views with varying markup.
- **Severity:** P2 (Medium)
- **Proposed Solution:** Extract `CommonEmptyState` component with customizable icon, title, description, and action button.
- **Verification Criteria:** Rendered empty states maintain exact typography and spacing.

---

#### [P2-04] Reusable Modal Dialog Component
- **Module / File:** `src/admin/components/CommonModal.jsx`
- **Description:** Product creation, coin editing, and review details duplicate modal backdrop and keyboard event listeners.
- **Severity:** P2 (Medium)
- **Proposed Solution:** Extract `CommonModal` supporting backdrop clicks, ESC key listener, and focus trapping.
- **Verification Criteria:** Modals open, close with ESC key, and backdrop click works seamlessly.

---

### P3 Issues: Code Quality, Verification & Documentation

#### [P3-01] Automated Test Suite Expansion
- **Module / File:** `tests/`
- **Description:** Add comprehensive regression tests for:
  - Error logging & normalization (`tests/errors.test.js`)
  - Common admin components (`tests/admin-components.test.js`)
- **Severity:** P3 (Quality Assurance)
- **Verification Criteria:** All tests pass alongside existing 137 tests with zero test failures.

---

#### [P3-02] Final Audit Documentation & Deployment Preparation
- **Module / File:** `docs/audit/07-final-audit-report.md` & `docs/audit/08-deployment-checklist.md`
- **Description:** Complete comprehensive audit summary and step-by-step deployment and rollback guide.
- **Severity:** P3 (Documentation)
- **Verification Criteria:** Files created and committed cleanly to git repository.
