# Admin Routing & Dynamic Sidebar Navigation Implementation

## 1. Overview
This implementation migrates the Merchant Studio admin panel navigation from a local state-only switcher to full URL-driven SPA routing using React Router. Every sidebar menu now has its own dedicated URL, supports browser refresh, direct navigation, browser back/forward history, nested route active state persistence, and mobile drawer accessibility.

---

## 2. Admin Route Mapping

| Sidebar Menu | URL / Path | Aliases | Component / View |
|---|---|---|---|
| **Dashboard** | `/admin/dashboard` | `/admin`, `/admin/` (auto-redirect) | Studio statistics, quick actions, feed health, order highlights |
| **Categories** | `/admin/categories` | — | `CategoriesAdmin` (CRUD, sort order, banner photo, status toggles) |
| **Products** | `/admin/products` | — | `AdminProductList` (Stock, prices, multi-angle photos, pagination) |
| **Chicken Curry Kurtas** | `/admin/chicken-curry-kurtas` | `/admin/kurtas` | `KurtasAdmin` (20+ styles, 60+ colors, sizes, stock, multi-angle) |
| **Coins** | `/admin/coins` | — | `CoinsAdmin` (Bullion catalogue, metal rates, weight, mint marks) |
| **Offers** | `/admin/offers` | — | `OffersAdmin` (Discount rules, banners, showcase cards) |
| **Reviews** | `/admin/reviews` | — | `ReviewsAdmin` (Customer reviews moderation, ratings, bulk status) |
| **Gold Rates** | `/admin/gold-rates` | — | Live rates table, purity-specific manual rates, sync logs |
| **Pricing Rules** | `/admin/pricing-rules` | — | `Rules` (Making charges, margin formula, currency rounding) |
| **Imports** | `/admin/imports` | — | CSV imports (Gold, Products, Coins), batch publishing, error logs |
| **Orders** | `/admin/orders` | — | Order fulfillment, customer lookup, status transitions, exports |
| **Customers** | `/admin/customers` | — | `CustomersAdmin` (Accounts, order count, spend, soft-delete, restore) |
| **Catalogue Copy** | `/admin/catalogue-copy` | `/admin/catalogue_copy` | `AiCopy` (AI descriptions, SEO titles, approval workflows) |
| **AI Chatbot** | `/admin/ai-chatbot` | `/admin/chatbot` | `ChatbotAdmin` (Conversation logs, user insights, assistant rules) |
| **Settings** | `/admin/settings` | — | `SettingsAdmin` (Store metadata, staff permissions, feed intervals) |

---

## 3. Dynamic Active Menu Architecture

### 3.1 Route Matching Logic (`matchAdminRoute`)
The active menu item is derived dynamically from `location.pathname` using a tiered matching algorithm:
1. **Exact Path Match**: `location.pathname === route.path` or matching registered aliases (e.g. `/admin/chicken-curry-kurtas` or `/admin/kurtas`).
2. **Nested / Subroute Prefix Match**: `location.pathname.startsWith(route.path + '/')`. For example:
   - `/admin/products/123/edit` keeps **Products** highlighted.
   - `/admin/orders/ORD-8912` keeps **Orders** highlighted.
   - `/admin/categories/4/edit` keeps **Categories** highlighted.
3. **Query Parameter Fallback**: Preserves backwards compatibility with legacy `?tab=...` URLs.
4. **Root & Fallback**: `/admin` and unknown admin subroutes gracefully redirect to `/admin/dashboard`.

### 3.2 Seamless Client-Side Navigation
Sidebar menu buttons were upgraded to React Router `<Link to={item.path}>`:
- No full page reload or flicker on navigation.
- Native browser back and forward button support.
- `aria-current="page"` applied dynamically to the active route for accessibility.
- State preservation across views.

---

## 4. UI & Visual Design (Merchant Studio Theme)

- **Sidebar Background**: Deep luxury green (`#18312e`).
- **Inactive Items**: Muted sage text (`#aebfb0`) with subtle hover highlight (`rgba(255, 255, 255, 0.06)`).
- **Active State**: Elevated background (`rgba(255, 255, 255, 0.1)`), light gold text (`#e7d9b7`), bold weight, and a crisp 3px solid gold indicator bar (`#c2ac76`) on the left border.
- **Top Header Breadcrumb**: Updates dynamically to reflect the current page (e.g. `VEYORA / STUDIO / CHICKEN CURRY KURTAS`).

---

## 5. Mobile Responsiveness & Drawer Navigation

- On viewports $\le$ 800px:
  - Header displays a mobile hamburger toggle button (`.admin-mobile-toggle`).
  - Sidebar behaves as an off-canvas drawer (`.admin-sidebar`), sliding in with a 280ms cubic-bezier transition (`transform: translateX(0)`).
  - Semi-transparent backdrop (`.admin-sidebar-backdrop`) renders behind the drawer.
  - Clicking any menu item, the close button (`.admin-mobile-close`), or the backdrop smoothly dismisses the drawer and navigates to the requested route.
- On desktop (> 800px):
  - Fixed 240px wide sidebar with thin custom scrollbar and immediate access.

---

## 6. Security & Session Handling

- All `/admin/*` routes check staff session authentication (`/api/admin/session`).
- Unauthenticated requests render the staff login view.
- Upon successful login, the user remains on their requested URL rather than being forcefully kicked back to root.
- Null session guards prevent 401 unhandled rejections during initial session checks.
- Sensitive endpoints require appropriate staff roles (`owner`, `manager`, `viewer`) and valid CSRF tokens.

---

## 7. Automated Test Verification

All 214 tests pass, including new automated verification in `tests/admin-routing.test.js`:
- Verified all 15 menu items map to their dedicated routes.
- Verified exact matching, nested route preservation, and alias resolution.
- Verified React Router Link rendering, dynamic active class, and header breadcrumbs.
- Verified CSS styling for dark green background, gold left border `#c2ac76`, and mobile drawer transitions.
