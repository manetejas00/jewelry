import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {errorResponse, validationError} from '../server/errors.js';

test('errorResponse correctly normalizes database constraints and sanitizes 500s', () => {
  // 1. Generic unexpected errors must return 500 with sanitized message
  const secretError = new Error('SELECT * FROM staff WHERE password_hash = "secret"');
  const res500 = errorResponse(secretError);
  assert.equal(res500.status, 500);
  assert.equal(res500.body.error, 'The request could not be completed. Please try again.');
  assert.doesNotMatch(JSON.stringify(res500), /password_hash|secret|SELECT/);

  // 2. Validation errors must preserve status and message
  const vErr = validationError('Custom validation failure', 422);
  const resVal = errorResponse(vErr);
  assert.equal(resVal.status, 422);
  assert.equal(resVal.body.error, 'Custom validation failure');

  // 3. SQLite unique constraint violation maps to 409 Conflict
  const sqliteUnique = Object.assign(new Error('UNIQUE constraint failed: products.sku'), {
    code: 'SQLITE_CONSTRAINT'
  });
  const resSqlite = errorResponse(sqliteUnique);
  assert.equal(resSqlite.status, 409);
  assert.equal(resSqlite.body.error, 'A record with this identifier already exists.');

  // 4. MySQL unique constraint (ER_DUP_ENTRY) maps to 409 Conflict
  const mysqlUnique = Object.assign(new Error('Duplicate entry for key products.sku'), {
    code: 'ER_DUP_ENTRY'
  });
  const resMysql = errorResponse(mysqlUnique);
  assert.equal(resMysql.status, 409);
  assert.equal(resMysql.body.error, 'A record with this identifier already exists.');

  // 5. Foreign key violations map to 400 Bad Request
  const fkError = Object.assign(new Error('FOREIGN KEY constraint failed'), {
    code: 'SQLITE_CONSTRAINT'
  });
  const resFk = errorResponse(fkError);
  assert.equal(resFk.status, 400);
  assert.equal(resFk.body.error, 'Referenced record was not found.');
});

test('server global error handler logs full diagnostic context for status >= 500', () => {
  const indexJs = fs.readFileSync('server/index.js', 'utf8');
  assert.match(indexJs, /event:\s*'request_failed'/, 'Must log request_failed event');
  assert.match(indexJs, /requestId:\s*req\.requestId/, 'Must include requestId in log');
  assert.match(indexJs, /message:\s*err\?\.message/, 'Must log error message');
  assert.match(indexJs, /stack:\s*err\?\.stack/, 'Must log stack trace');
  assert.match(indexJs, /url:\s*req\.originalUrl/, 'Must log request URL');
});

test('frontend ErrorBoundary is properly implemented and wraps application root', () => {
  const boundaryJsx = fs.readFileSync('src/ErrorBoundary.jsx', 'utf8');
  assert.match(boundaryJsx, /class ErrorBoundary extends React\.Component/, 'ErrorBoundary must be a class component');
  assert.match(boundaryJsx, /getDerivedStateFromError/, 'Must implement getDerivedStateFromError');
  assert.match(boundaryJsx, /componentDidCatch/, 'Must implement componentDidCatch');
  assert.match(boundaryJsx, /Something interrupted this view/, 'Must have branded fallback copy');

  const mainJsx = fs.readFileSync('src/main.jsx', 'utf8');
  assert.match(mainJsx, /import ErrorBoundary from '\.\/ErrorBoundary\.jsx'/, 'main.jsx must import ErrorBoundary');
  assert.match(mainJsx, /<ErrorBoundary>\s*<BrowserRouter>/, 'App must be wrapped in ErrorBoundary');
});

test('common admin components exist, export correctly, and are integrated into admin views', () => {
  assert.ok(fs.existsSync('src/admin/components/CommonFilterBar.jsx'), 'CommonFilterBar must exist');
  assert.ok(fs.existsSync('src/admin/components/CommonStatusBadge.jsx'), 'CommonStatusBadge must exist');
  assert.ok(fs.existsSync('src/admin/components/CommonEmptyState.jsx'), 'CommonEmptyState must exist');
  assert.ok(fs.existsSync('src/admin/components/CommonModal.jsx'), 'CommonModal must exist');

  const filterBarJsx = fs.readFileSync('src/admin/components/CommonFilterBar.jsx', 'utf8');
  assert.match(filterBarJsx, /export function CommonFilterBar/, 'CommonFilterBar must export component');

  const badgeJsx = fs.readFileSync('src/admin/components/CommonStatusBadge.jsx', 'utf8');
  assert.match(badgeJsx, /export function CommonStatusBadge/, 'CommonStatusBadge must export component');

  const mainJsx = fs.readFileSync('src/main.jsx', 'utf8');
  assert.match(mainJsx, /<CommonFilterBar/, 'main.jsx must render CommonFilterBar');
  assert.match(mainJsx, /<CommonStatusBadge/, 'main.jsx must render CommonStatusBadge');
});

test('src/api.js intercepts network failure TypeErrors and normalizes messages', () => {
  const apiJs = fs.readFileSync('src/api.js', 'utf8');
  assert.match(apiJs, /Unable to connect to the server/, 'api.js must provide friendly network error advice');
  assert.match(apiJs, /session-expired/, 'api.js must dispatch session-expired event on 401/403');
});
