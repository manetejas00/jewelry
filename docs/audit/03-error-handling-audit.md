# Error Handling & Exception Management Audit

**Project:** Veyora Jewels (E-Commerce Platform)  
**Audit Date:** 2026-11-11  
**Auditor:** Automated Engineering Pair (Antigravity)  
**Scope:** Backend (Node.js/Express/Knex) & Frontend (React 18/Fetch API)

---

## 1. Executive Summary

Error handling is a critical pillar of high-availability enterprise e-commerce systems. When failures occur—whether due to database connection dropped packets, network timeouts, stale pricing, invalid customer inputs, or concurrent checkout races—the application must:
1. Fail gracefully without crashing or exposing raw stack traces.
2. Return consistent, predictable HTTP status codes and actionable error messages to the client.
3. Log full diagnostic context (request ID, method, URL, error message, stack trace, and timestamp) securely to the server logs without leaking credentials or customer PII.
4. Provide immediate, non-cryptic recovery actions to storefront customers and admin staff.

This audit evaluates the entire error handling lifecycle from client request to database query and back.

---

## 2. Backend Error Handling Architecture

### 2.1 Current Implementation

In `server/errors.js`:
```javascript
export function validationError(message, status = 400) {
  return Object.assign(new Error(message), { status, expose: true });
}

export function errorResponse(err) {
  if (err.type === 'entity.parse.failed') return { status: 400, body: { error: 'Request body must be valid JSON' } };
  if (err.type === 'entity.too.large') return { status: 413, body: { error: 'Request exceeds the allowed size' } };
  if (err.expose) return { status: err.status || 400, body: { error: err.message, ...(err.quote ? { quote: err.quote } : {}) } };
  return { status: 500, body: { error: 'The request could not be completed. Please try again.' } };
}
```

In `server/index.js` (line 706):
```javascript
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const out = errorResponse(err);
  if (out.status >= 500) {
    console.error(JSON.stringify({
      event: 'request_failed',
      requestId: req.requestId,
      method: req.method,
      status: out.status
    }));
  }
  res.status(out.status).json(out.body);
});
```

### 2.2 Critical Gaps Identified on the Backend

#### Gap 1: Incomplete Production Error Logging (Severity: P0)
- **Problem:** When an internal server error (HTTP 500) occurs, `server/index.js` logs only `{event:'request_failed', requestId:req.requestId, method:req.method, status:out.status}`.
- **Deficiency:** It completely omits `err.message`, `err.stack`, and `req.originalUrl`.
- **Consequence:** In production VPS environments (Hostinger/PM2/Docker), operations engineers and developers cannot diagnose why a 500 error occurred. It forces guessing and blind troubleshooting.
- **Solution:** Enrich the structured JSON log with `message: err.message`, `stack: err.stack`, `url: req.originalUrl`, `timestamp: new Date().toISOString()`, and `code: err.code || null`. Ensure sensitive request bodies (passwords, tokens) are never printed in logs.

#### Gap 2: Database Constraint Violations Fall Through to Generic 500s (Severity: P1)
- **Problem:** When a database unique constraint (e.g., duplicate product SKU, duplicate coin SKU, or duplicate review submission) or foreign key check fails at the database level:
  - SQLite throws `SQLITE_CONSTRAINT` / `UNIQUE constraint failed`.
  - MySQL2 throws `ER_DUP_ENTRY` (errno 1062).
- **Deficiency:** Unless manually caught in every single route handler, these errors lack `expose: true` and are transformed by `errorResponse(err)` into a vague 500: `"The request could not be completed. Please try again."`
- **Consequence:** The client is misled into thinking the server suffered an internal crash instead of knowing that a conflict (HTTP 409) or bad input (HTTP 400) occurred.
- **Solution:** Enhance `errorResponse(err)` in `server/errors.js` to recognize database constraint errors across SQLite and MySQL, automatically translating them to friendly HTTP 409 Conflict or 400 Bad Request responses.

#### Gap 3: Uncaught Database Connectivity Failures (Severity: P1)
- **Problem:** When MySQL or SQLite drops a connection (`ECONNREFUSED`, `PROTOCOL_CONNECTION_LOST`, `ETIMEDOUT`), queries reject with uncaught promise rejections if not wrapped in `route(...)`.
- **Audit Finding:** While route handlers use `const route = f => (req, res, next) => Promise.resolve(f(req, res, next)).catch(next);`, background intervals (like `server/daily.js`) must also wrap external network requests in safe catch blocks to prevent process crashes.

---

## 3. Frontend Error Handling Architecture

### 3.1 Current Implementation

In `src/api.js`:
```javascript
export async function request(url, body, method, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('/api' + url, {
      signal: controller.signal,
      method: method || (body ? 'POST' : 'GET'),
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': sessionStorage.getItem('csrf') || '',
        'x-customer-csrf': sessionStorage.getItem('customer-csrf') || ''
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    let data;
    try {
      data = await res.json();
    } catch {
      throw Error('The server returned an unexpected response. Please try again.');
    }
    if (!res.ok) {
      const error = Error(data.error || 'Something went wrong');
      error.quote = data.quote;
      error.status = res.status;
      throw error;
    }
    return data;
  } catch (e) {
    if (e.name === 'AbortError') throw Error('The request timed out. Please try again.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
```

### 3.2 Critical Gaps Identified on the Frontend

#### Gap 1: Absence of a React Root Error Boundary (Severity: P1)
- **Problem:** React 18 will completely unmount the entire component tree if an unhandled JavaScript error is thrown during rendering or lifecycle execution.
- **Deficiency:** Currently, there is no `<ErrorBoundary>` class component in `src/`.
- **Consequence:** If an unhandled error occurs in an edge case (e.g., malformed image data, unexpected null in product specification, or order line item snapshot), the user is left with a blank white screen with no navigation or recovery options.
- **Solution:** Create `src/ErrorBoundary.jsx` and wrap the `<App />` root in `src/main.jsx`. Display an elegant branded fallback card ("Something interrupted this view") with buttons to "Reload Page" or "Return to Storefront".

#### Gap 2: Silent Error Swallowing (`.catch(() => {})`) (Severity: P2)
- **Problem:** Several asynchronous operations use `.catch(() => {})`:
  1. `src/main.jsx`: `api('/admin/session').then(...).catch(() => {})`
  2. `src/SearchAutocomplete.jsx`: `.catch(() => {})`
  3. `src/store.jsx`: `api('/coins').catch(() => [])`, `api('/offers').catch(() => [])`
- **Consequence:** If an admin session request fails due to network outage or 500 error, the admin UI is silently left in an uninitialized or broken state without notifying the administrator why data failed to load.
- **Solution:** Replace empty catch blocks with structured warning logs (`console.warn`) and, where applicable, update component error states to inform the user.

#### Gap 3: Raw Browser Network Errors (Severity: P2)
- **Problem:** When the user loses internet connection or the server goes down, `fetch()` throws a browser-specific `TypeError` (e.g. `"Failed to fetch"`, `"NetworkError when attempting to fetch resource"`, or `"Load failed"`).
- **Consequence:** Users see technical or cryptic error messages.
- **Solution:** Intercept `TypeError` in `src/api.js` and normalize it to: `"Unable to connect to Veyora servers. Please check your internet connection."`

#### Gap 4: Centralized Session Expiration Broadcast (Severity: P2)
- **Problem:** When an authenticated API call (such as saving customer state, loading order history, or performing an admin action) returns HTTP 401 or 403, there is no centralized event dispatched.
- **Consequence:** The user might remain on an authenticated view, repeatedly clicking buttons that fail with 401 Unauthorized errors until they manually refresh the page.
- **Solution:** Dispatch a window event `window.dispatchEvent(new CustomEvent('session-expired', { detail: { status: res.status } }))` when `res.status === 401 || res.status === 403`, allowing auth providers to cleanly prompt for re-authentication.

---

## 4. HTTP Status Code Mapping Matrix

| Scenario | HTTP Status Code | Response Body Format | Client Behavior |
| :--- | :---: | :--- | :--- |
| Valid request succeeded | `200 OK` | `{ ...data }` | Render data immediately |
| Missing or invalid input | `400 Bad Request` | `{"error": "Field X is required"}` | Display field validation error |
| Authentication required / token expired | `401 Unauthorized` | `{"error": "Please sign in to continue"}` | Prompt sign-in modal / redirect to login |
| Insufficient role / CSRF token mismatch | `403 Forbidden` | `{"error": "Staff access required"}` | Display permission denied notice |
| Resource not found | `404 Not Found` | `{"error": "Resource not found"}` | Show 404 empty state / not found view |
| Duplicate SKU or conflicting review | `409 Conflict` | `{"error": "Item with this SKU already exists"}` | Display conflict notification |
| Payload exceeds size limit (uploads) | `413 Payload Too Large`| `{"error": "Request exceeds allowed size"}` | Warn user to upload smaller image (<5MB) |
| Rate limit reached | `429 Too Many Requests`| `{"error": "Too many attempts. Try again later."}`| Show countdown / retry after duration |
| Uncaught server / DB error | `500 Internal Server Error`| `{"error": "The request could not be completed."}`| Display graceful failure + log diagnostic stack |
| Service unavailable / DB maintenance | `503 Service Unavailable`| `{"error": "Service temporarily unavailable"}`| Show retry banner |

---

## 5. Verification & Testing Strategy for Error Handling

1. **Unit & Integration Tests:**
   - Verify that `errorResponse(new Error('test'))` outputs status 500 with sanitized message.
   - Verify that `validationError('Custom message', 422)` preserves status and `expose: true`.
   - Verify that duplicate database inserts trigger 409 Conflict instead of 500.
2. **End-to-End Fault Injection:**
   - Simulate offline network in browser DevTools to verify normalized connection error message.
   - Trigger unhandled exception inside a component to verify `<ErrorBoundary>` rendering without blank screen.
   - Verify backend server logs output `requestId`, `message`, and `stack` on simulated 500 error.
