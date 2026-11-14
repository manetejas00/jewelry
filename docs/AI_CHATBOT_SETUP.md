# AI chatbot setup

The storefront chatbot is available only to signed-in customers. Each customer account gets 10 user messages per day by default. The count is stored in the database, shared by every browser and device, and resets at midnight in `Asia/Kolkata`. Clearing a conversation does not restore messages. Guests are asked to log in or register.

Catalogue copy in the merchant studio is a separate feature. It keeps using `AI_BASE_URL`. The chatbot uses `AI_API_URL` when that variable is set, and otherwise falls back to `AI_BASE_URL`, then to the official OpenAI chat completions URL.

## Architecture

```text
Chat widget (src/ChatWidget.jsx)
  -> customer session + CSRF
  -> server/chat/routes.js
       -> service.js            quota, history, provider call
       -> repository.js         transactions and quota rows
       -> ai-provider.js        OpenAI-compatible chat completions
       -> knowledge.js          published catalogue and policies
       -> admin.js              dashboard, users, analytics, audit
```

The API key is read only from the server environment. It is not returned by `/api/config`, `/api/chat/availability`, or any admin response. Admin screens show whether a key is configured and the API host, not the secret.

Business facts sent to the model come from published products and coins, plus delivery, returns, and contact text already configured for the site. The default instructions live in `server/chat/system-prompt.js`. An owner can replace that text from AI Chatbot → Configuration. The saved prompt is stored in the `settings` table. The API key is not.

## Environment variables

| Variable | Purpose |
|---|---|
| `AI_ENABLED` | `true` by default. `false` hides the chatbot even if the studio setting is on. |
| `AI_API_KEY` | Server-only bearer token. Required before the widget is shown. |
| `AI_API_URL` | Chat completions base URL. Default `https://api.openai.com/v1`. No query string or embedded credentials. |
| `AI_MODEL` | Default model when the studio has not saved an override. Code default `gpt-4o-mini`. |
| `AI_MAX_DAILY_MESSAGES` | Default account limit. `10`. Studio owners can override this. |
| `AI_DAILY_RESET_TIMEZONE` | IANA timezone. Default `Asia/Kolkata`. |
| `AI_MAX_INPUT_LENGTH` | Maximum user message length. Default `2000`. |
| `AI_MAX_RESPONSE_TOKENS` | `max_tokens` sent to the provider. Default `1000`. |
| `AI_BASE_URL` | Existing catalogue-copy endpoint. Used for chat only when `AI_API_URL` is empty. |

Set these in the host environment or the untracked `.env`. Do not commit a real key. Restart the Node process after changing them.

The studio can change the model, daily limit, timezone, input length, response tokens, retention, provider label, system prompt, and the on/off switch. It cannot change the API key or the URL that receives that key. That stays in the environment so a studio setting cannot redirect the secret to another host.

## Database

```bash
npm run migrate
```

Migration `017_chatbot.js` creates:

- `chat_daily_usage` — one row per customer per Kolkata date, with a unique `(user_id, usage_date)` key
- `chat_conversations` and `chat_messages`
- `chatbot_user_settings` — optional per-customer limit and access switch
- `chatbot_usage_logs` — reservation, success, refund, tokens, estimated cost, idempotency key
- `chatbot_admin_audit_logs` — staff changes

Usage rows are kept after a conversation is deleted so the daily count and analytics remain. Conversation text older than the retention period (default 365 days, minimum 7) is deleted by the hourly cleanup task.

## Daily quota

1. The server reads the signed-in customer id from the session. A user id or limit in the JSON body is ignored.
2. The usage date is the calendar date in the configured timezone.
3. The effective limit is the customer override, or the studio default, or the environment default.
4. Inside a transaction the server inserts the day’s row if needed, then increments `message_count` only when it is still below the limit.
5. The same request id (`idempotencyKey`) cannot charge the account twice. A repeat of a finished reply returns the stored reply.
6. If the provider returns an error, times out, or sends an unusable body before a reply exists, the reserved count is decremented and the log is marked `refunded`.
7. A reservation that is still `reserved` after two minutes is refunded. The customer did not receive a reply.
8. At the next midnight in the configured timezone, reads and writes use a new `usage_date`. No separate reset job is required.

The widget shows Daily Limit, Used Today, Remaining, and a progress bar. At the limit it disables the composer and shows: “You've reached your daily limit of 10 AI messages. Your free messages will reset at midnight. Please come back tomorrow.” The number matches the account’s actual limit.

## HTTP API

Customer routes require a customer session. POST and DELETE also require `x-customer-csrf`.

| Method | Path | Behaviour |
|---|---|---|
| GET | `/api/chat/availability` | `{enabled, loginRequired}` only |
| GET | `/api/chat/usage` | Limit, used, remaining, reset time |
| GET | `/api/chat/history` | This customer’s conversations |
| POST | `/api/chat/conversations` | Start an empty conversation |
| POST | `/api/chat/message` | Reserve quota and request a reply |
| DELETE | `/api/chat/history` | Delete conversations, keep quota |
| DELETE | `/api/chat/conversations/:id` | Delete one owned conversation |

Staff routes use the existing merchant session. Viewers can read. Owners and managers can change a customer. Only an owner can change global settings. Mutations are audited.

| Method | Path |
|---|---|
| GET | `/api/admin/chatbot/dashboard` |
| GET | `/api/admin/chatbot/users` |
| GET | `/api/admin/chatbot/users/:id` |
| GET | `/api/admin/chatbot/users/:id/usage` |
| GET | `/api/admin/chatbot/users/:id/conversations` |
| PUT | `/api/admin/chatbot/users/:id/settings` |
| GET | `/api/admin/chatbot/analytics` |
| GET | `/api/admin/chatbot/logs` |
| PUT | `/api/admin/chatbot/settings` |
| GET | `/api/admin/chatbot/export` |
| DELETE | `/api/admin/chatbot/conversations/:id` |

Message posts are limited to 20 per minute per client, in addition to the global API limit. User text is length-checked and stored as text. The widget renders it as text, not HTML.

Estimated cost is filled only for known OpenAI list prices in `server/chat/constants.js` (`gpt-4o-mini`, `gpt-4o`, `gpt-4.1-mini`, `gpt-4.1`). Other models stay blank rather than showing a guessed price. Token totals still come from the provider usage object.

## Admin studio

Open Merchant studio → AI Chatbot.

- Overview counts customers, chatbot users, today’s messages, monthly messages, successes, failures, accounts at the limit, tokens, and estimated cost.
- Users can be searched by name or email, filtered by date, usage, and access, sorted, paged, and exported as CSV.
- A customer detail view shows today’s bar, lifetime totals, daily history, and conversation text.
- Owners and managers can set that customer’s daily limit or turn access off. The change applies on the next message.
- Analytics accept a date range and group the stored rows by day, week, and month.
- Logs list provider outcomes and staff audit rows.
- Configuration edits the non-secret settings above. The API key field does not exist.

## Tests

```bash
npm test
```

`tests/chatbot.test.js` covers guest rejection, ownership, the 10-message cap, refresh, clearing history, the next Kolkata day, shared account usage, custom limits, access disable and restore, concurrent reservations, provider 401, timeout, 429, invalid body, duplicate request ids, empty and oversized text, admin authorization, export, audit rows, and route rate limiting. Provider calls in these tests are injected fakes. They do not spend API credit.

The local Node on this machine must match the compiled `better-sqlite3` binary. This repository’s CI uses Node 22.

## Production

1. Set `AI_API_KEY` and, for OpenAI, `AI_API_URL=https://api.openai.com/v1`.
2. Keep `AI_ENABLED=true` only when the key and catalogue are ready.
3. Run `npm run migrate` against the production database before serving traffic.
4. Run `npm test` and `npm run build`.
5. Restart the Node process. Confirm `/api/chat/availability` returns `enabled: true` and that the JSON does not contain the key.
6. Sign in as a customer, send one message, refresh, and confirm Used Today stays incremented.
7. In the studio, confirm the dashboard counts that message and that the key is not visible.

Do not put `AI_API_KEY` in frontend code, `VITE_` variables, or the database. Existing Helmet, origin checks, customer CSRF, and staff CSRF rules also apply to these routes.

Automatic deployment is not part of this change. Ship only after the checks above pass on the target host.

## Troubleshooting

| Symptom | What to check |
|---|---|
| Widget never appears | `AI_ENABLED` is not `false`, studio chatbot is enabled, and `AI_API_KEY` is set. `/api/chat/availability` is `enabled: false` until all three are true. |
| 401 on send | Customer is not signed in. |
| 403 “Please reload” | Customer CSRF is missing. Reload so `/api/account/session` can store it. |
| 429 daily limit | Expected after the account’s limit. Clearing chat or signing in again will not reset it. Wait until midnight in the configured timezone. |
| 429 “Too many chat messages” | Short-term rate limit. Wait a minute. The daily count is not increased when this limiter rejects the request. |
| 503 after a send | Provider rejected the key or the chatbot is switched off. The reserved message is refunded. The server log event is `chat_completion` and does not include the key or the message text. |
| 504 | Provider timeout. The reservation is refunded. |
| Admin saves do nothing | Viewer accounts cannot change settings. Global settings require the owner role. |
| Cost shows “Unavailable” | The selected model is not in the price table. Tokens are still recorded. |
| Wrong reset time | `AI_DAILY_RESET_TIMEZONE` or the studio timezone must be a valid IANA name. |
