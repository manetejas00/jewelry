# Popup and overflow audit

Date: 14 November 2026 (Asia/Kolkata).

## Scope and inventory

Searched the complete application source, public HTML/scripts, server-rendered output,
package dependencies, and all modal/overlay markup, positioning rules, Escape handlers,
portals, native confirmations, and page-level overflow writes. Generated `dist` output
is rebuilt from source; dependencies are not edited.

| Location | UI / callers | Original problem | Resolution and verification |
| --- | --- | --- | --- |
| `src/main.jsx`, `Modal` | Product size guide | Independent body overflow write; no shared ownership | Shared hook; phone open/close and background wheel check; restored original scroll Y 634.5 exactly |
| `src/main.jsx`, `BagDrawer` | Shopping bag, checkout navigation | Same independent lock could restore an incorrect overflow value | Shared Modal; tested concurrently with chat: closing cart leaves body fixed, closing chat releases it |
| `src/main.jsx`, `ProductForm` | Add product | Same Modal implementation; long content needs a bounded scroll area | Shared Modal; keyboard PageDown advanced internal scroll to 515.5px, no horizontal page overflow |
| `src/main.jsx`, `CoinForm` | Add coin | Same Modal implementation | Shared Modal; PageDown advanced internal scroll to 338.5px; Escape released lock |
| `src/main.jsx`, `OfferForm` | Create and edit promotional offers | Same Modal implementation | Both variants exercised; landscape 667×320 form was bounded to 280px, internally scrollable |
| `src/admin/components/CommonModal.jsx` | Customer view/edit, account deletion confirmation, chatbot user details (`CustomersAdmin.jsx`, `ChatbotAdmin.jsx`) | No background lock; Escape handlers could close multiple instances | Shared hook and topmost Escape; customer edit, confirmation/cancel switching, outside dismissal and chatbot details exercised |
| `src/ReviewsAdmin.jsx` | Review details, edit review, delete confirmation | All three independent backdrops had no lock or keyboard ownership | Each instance has its own shared token and focus boundary; all three exercised without submitting changes |
| `src/ImageViewer.jsx` | Product/coin touch gallery via `ProductMagicZoom`, home editorial image | Separate body overflow write; nested teardown could unlock another overlay | Shared hook; product, coin and editorial entry points exercised; zoom buttons, Escape, position restoration preserved |
| `src/Reviews.jsx` | Customer review photo lightbox | No lock, dialog semantics or Escape dismissal; close control could leave a short viewport | Shared hook, dialog semantics and focus handling; opened and dismissed with Escape; bounded photo height reserves room for close control |
| `src/main.jsx`, `Header` | Mobile navigation | Background scroll remained available | Shared hook, bounded internal scrolling; Escape, navigation cleanup, resize-to-desktop cleanup |
| `src/main.jsx`, `Header` | Account dropdown, Sign In / Register links | Background could scroll beneath dropdown | Shared hook on the open account menu; keyboard opening and Escape tested |
| `src/SearchAutocomplete.jsx` | Search bar and suggestion dropdown | Background could scroll; dropdown could extend below short screens | Shared hook for the full search overlay; keyboard behavior preserved; 667×320 results viewport 120px, content 355px, bottom exactly 320px |
| `src/ChatWidget.jsx` | Assistant panel, guest login/register prompt | Background remained scrollable, competing Escape handler | Shared hook while panel is actually rendered; open/close and simultaneous cart lock verified; chat log and short-screen panel remain scrollable |
| `src/InstallApp.jsx` | Installation instructions dialog | No lock; long help could exceed viewport | Shared hook, focus boundary, Escape and close button; phone flow exercised |

### Reviewed UI that intentionally does not lock the page

These are not blocking DOM popups. Adding a lock would remove existing functionality:

- `Account.jsx`: login, registration, profile, orders and password reset are ordinary
  pages / inline forms, not login/register modals.
- `Reviews.jsx`: review submission/edit form is an inline card; only its photo
  lightbox requires a lock.
- Collection filters, price brackets, sorting, admin table filters and native selects
  remain in normal flow. Browser-native select menus manage their own interaction.
- Product/coin **desktop hover magnifier** (`@zoom-image/core`) is a non-blocking
  image inspection aid. Its existing `disableScrollLock: true` is retained; touch
  full-screen zoom is managed by ImageViewer. No third-party dialog package exists.
- PhotoPicker saved-photo library, product/coin edit rows, media libraries, staff
  forms, AI copy drafting, and expandable information sections are inline content.
- Toasts (`store.jsx`), upload slot overlays, offer ribbons, offline notices and
  install banners/chips are non-blocking notifications or decorations.
- Product, coin and offer delete actions use browser-native `window.confirm`;
  installation may use browser-native `beforeinstallprompt`. These are managed by
  the browser, not competing DOM body-style implementations. No destructive actions
  or native installation confirmations were accepted during this audit.
- No additional product quick-view dialog, checkout modal, off-canvas implementation,
  or third-party popup system was found. BagDrawer uses the shared Modal.

## Root causes

1. Storefront Modal and ImageViewer independently saved/restored `body.style.overflow`.
   Closing one instance could unlock the background under another open popup.
2. Other overlays had no lock at all. Several independent Escape listeners could
   react to the same key and dismiss more than the active layer.
3. Overflow on `body` alone did not address mobile Safari dragging, scroll chaining,
   keyboard scrolling, scrollbar layout shifts, or restoration of exact scroll position.
4. Some overlays used `vh` or unbounded content without accounting for short landscape
   screens or the visual viewport when a software keyboard is open.

## Centralized solution

- `src/scroll-lock.js` owns **all** page-level changes. A Map of unique tokens provides
  reference counting; cleanup is idempotent and supports out-of-order release.
- The first token snapshots scroll X/Y and original inline style values/priorities.
  It locks html overflow, fixes body at the negative saved coordinates, and compensates
  for the missing scrollbar using existing computed right padding.
- Only the final release restores the saved styles and scroll position. Temporary
  scroll-behavior override prevents smooth-scroll animation during restoration.
- One set of capture listeners guards wheel, touch and scroll keys. Scrolling is
  allowed inside the active overlay when a scrollable ancestor has room in the
  requested direction; background and boundary chaining are prevented. Horizontal
  thumbnail scrolling remains available. ImageViewer explicitly owns its pinch,
  pan and wheel-zoom surface.
- The top token owns Escape. Modal dialogs also receive initial focus, a Tab boundary
  and focus restoration with `preventScroll`; non-modal menus and chat retain their
  existing non-modal keyboard model.
- `src/useScrollLock.js` handles acquisition and lifecycle cleanup with a stable ref
  and current Escape callback. Route unmount, close buttons and existing outside
  dismissal all release the same token.
- VisualViewport resize/scroll and window resize update temporary CSS variables for
  available height and keyboard offsets. All listeners and variables are restored
  on final release. Navigation closes when its mobile breakpoint disappears. Chat
  only locks while availability/account readiness permit rendering the panel.
- Scoped CSS bounds actual overlays and contains overscroll, leaving regular pages,
  inline forms, layout, colors, typography, GSAP animations and transitions intact.
  Admin headers/footers do not shrink; their long bodies/cards scroll independently.
- Fixed an existing duplicate React option key in the admin media chooser encountered
  while exercising product forms; choices and their submitted values are unchanged.

## Files modified

- New: `src/scroll-lock.js`, `src/useScrollLock.js`, `tests/scroll-lock.test.js`.
- Integrated: `src/main.jsx`, `src/admin/components/CommonModal.jsx`,
  `src/ImageViewer.jsx`, `src/Reviews.jsx`, `src/ReviewsAdmin.jsx`,
  `src/SearchAutocomplete.jsx`, `src/ChatWidget.jsx`, `src/InstallApp.jsx`.
- Scoped viewport/overflow rules: `src/style.css`.
- Report: this file. Production `dist` files are regenerated by the existing build.
- Pre-existing changes in `samples/*.csv` are excluded from this work and preserved.

## Testing and verification

### Automated regression tests

`tests/scroll-lock.test.js` exercises the actual manager with an isolated DOM/event
model and no new dependency:

1. html/body lock, scrollbar compensation, exact style and priority restoration,
   fractional-capable scroll coordinate restoration and duplicate cleanup.
2. Nested/concurrent acquisition, out-of-order teardown, and strict-effect-style
   release/reacquisition without premature unlocking or leftover listeners.
3. Background wheel/touch blocking, internal scrolling and boundary protection.
4. Topmost-only Escape, keyboard scroll suppression, Tab wrapping and focus return.
5. Horizontal thumbnails and explicit image pinch/pan/zoom gesture exemption.
6. Software-keyboard VisualViewport resizing and listener/CSS variable cleanup.
7. Normal pages remain unchanged without an active token.

Production verification command: `npm run check` (complete test suite, Vite production
build, and all 448 catalogue asset checks). The final run contains 191 passing tests.
`git diff --check` and the complete source diff are reviewed before committing.

### Actual browser checks

Used an isolated SQLite preview with fictional seed accounts, no live customer edits,
no accepted deletion confirmations, and no AI messages sent. Exercised every custom
popup implementation and each modal caller identified in the inventory. Tested desktop,
390×844 phone and 667×320 landscape dimensions. Verified open/close, Escape, outside
click, internal keyboard scrolling, nested/overlapping ownership and restoration.

The preview's separate Vite process reported its pre-existing HMR websocket-port
conflict; this is development-server infrastructure, not an overlay exception. The
media chooser duplicate-key warning found during testing was corrected. No scroll-lock
runtime exceptions were observed. Production has no Vite HMR client.

### Deployment

Push through the existing `.github/workflows/deploy.yml` workflow, then verify the
workflow result, `/health/ready`, current asset bundle, and live storefront popup
locking/restoration. The delivered commit and final live verification outcome are
reported in the completion message.

## Remaining limitations

- Physical iOS Safari and Android Chrome devices are not connected. Mobile browser
  dimensions were tested in the available browser; touch event paths and software
  keyboard viewport behavior have automated regressions. Physical-device QA remains
  advisable and is not claimed as completed.
- Native browser select/confirm/install UI is browser-controlled and is not replaced.
- This audit does not redesign non-blocking inline forms or notifications as modals.
