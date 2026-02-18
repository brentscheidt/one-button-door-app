# Changelog

## v0.8.2 — 02_17_26
**Beta field-fix pass: pin placement + correction**
- ✅ **Map long-press behavior tightened** — map now suppresses browser context menu/save-image behavior and routes long-press/right-click into pin placement.
- ✅ **Dropped pin is now draggable before save** — after placing a pin, you can drag it to the exact property location and save the corrected coordinates/address.
- ✅ **Draft pin resilience during polling** — unsaved local dropped pins stay visible across refresh polling until backend has a matching saved address.

## v0.8.2-data — 02_18_26
**Paris Maps Migration & Data Cleanup**
- ✅ **Data Import** — Imported 101 pins from "Paris" Google Maps lists ("Tuesday", "Thursday Jan", etc.).
- ✅ **Geocoding Fixes** — Manually resolved computer-illegible addresses (e.g., "Paradise Valley Village") to exact coordinates.
- ✅ **Dropped Pin Resolution** — Re-scraped 27 "Dropped Pin" entries to their actual nearby street addresses.
- ✅ **Source Tracking** — Appended original list name (e.g., `(List: Tuesday)`) to all imported notes for traceability.

## v0.8.3 — 02_18_26
**Cleanup & UX Polish**
- ✅ **Test Data Purge** — Removed ghost "Inspection" pins (smoke-test data) from Texas.
- ✅ **History Deduping** — Frontend now intelligently hides consecutive duplicate log entries, cleaning up the history view for imported pins.
- ✅ **Help Menu** — Added "Help & Guide" to Dragon Menu with quick tips for new users.
- ✅ **Cache Busting** — Updated app loader to force latest version refresh.

## v0.8.1 — 02_16_26
**Session naming + independent session archive**
- ✅ **End-session naming prompt** — when ending a session, user can name it; if blank/canceled, it auto-saves with date/time label.
- ✅ **Independent session saves** — each session remains isolated by unique `session_id` and stores its own local summary.
- ✅ **Session archive metadata** — saved in localStorage (`plat_session_archive` + `plat_session_labels`) with start/end, duration, knocks, and breadcrumb count.

## v0.8.0 — 02_15_26
**Save button + Session timer + Route tuning**
- ✅ **Save button** — prominent 💾 SAVE button in pin panel. No more lost data from forgetting sub-options.
- ✅ **Status tracking** — selected status/substatus highlighted with white outline, save button shows what will be saved.
- ✅ **Session timer** — replaces old Route toggle. Start/pause/stop, blinking 🔴 LIVE indicator, elapsed timer, knock counter.
- ✅ **Bigger Drop Pin FAB** — increased from 80px to 90px for better mobile tap target.
- ✅ **Breadcrumb tuning** — interval reduced from 60s to 15s, min distance from 50m to 15m for driving resolution.
- ✅ **Route max gap** — 300m config added; when rendering routes, won't connect dots that are too far apart.
- ✅ **Backend endpoints** (local only, not yet deployed) — getBreadcrumbs, getRouteSessions for route retrieval.
- ✅ **Ideas backlog** — `docs/IDEAS_BACKLOG_02_15_26_v1.md` tracks all feature ideas and iterations.

- ✅ **Route display** — visualize today's path with 'View Routes' menu.
- ✅ **GPS Centering** — auto-center map when dropping pins.
- ✅ **Menu Features** — 'Settings' adds cache clear; 'View Routes' toggles breadcrumbs.
- ✅ **Data Migration** — Script `migrate_pins.js` executed; Paris's history imported.

## v0.7.0 — 02_15_26
**Google Sign-In + auth improvements**
- ✅ **Google Sign-In** — replaced manual user dropdown with Google OAuth sign-in.
- ✅ **Profile display** — user's avatar and name shown in topbar.
- ✅ **Bigger FAB + log buttons** — improved touch targets for mobile use.
- ✅ **Auth menu** — click avatar to see email, sign out option.

## v0.6.0 — 02_14_26
**Platinum rebrand + online deployment**
- ✅ **Rebranded** from BSRG to **Platinum DoorKnock** across all files.
- ✅ **GitHub Pages deployment** — app now accessible at `https://brentscheidt.github.io/one-button-door-app/`.
- ✅ Updated localStorage keys from `bsrg_` to `plat_` prefix.
- ✅ Updated README with feature list, architecture diagram, live URL.
- ✅ All backend endpoints verified working (getPins, getLogs, log, breadcrumb, version).

## v0.5.2 — 02_14_26
**Pin history + UI overhaul**
- ✅ **Pin history view** — tap any pin to see all past log entries (fetched from `getLogs` endpoint).
- ✅ **`getLogs` backend endpoint** — `GET ?mode=getLogs&pin_id=X` or `&address=Y` returns log history sorted newest-first.
- ✅ **Pin count indicator** — topbar shows total pins (or visible/total when filtering).
- ✅ **Stale marker cleanup** — markers for deleted pins are removed on refresh.
- ✅ **UI overhaul** — Inter font, gradient buttons, glassmorphism panel, smooth toast animations, mobile-first two-row topbar.
- ✅ **XSS protection** — user notes are HTML-escaped in history display.
- ✅ **Panel scrollable** — history section is scrollable for pins with many log entries.

## v0.5.1 — 02_14_26
**View filter + UX polish**
- ✅ Wired up View Filter dropdown: All Pins / My Pins / Today / This Week (persists across reloads).
- ✅ Added close button (✕) to slide-up panel.
- ✅ Tap map to dismiss panel.
- ✅ Re-filters pins when user selection changes.
- ✅ Filter state saved to localStorage.

## v0.5.0 — 02_14_26
**New GCP project + fresh production deployment**
- ✅ Created dedicated `DoorKnockLogger` Google Cloud project (ID: `doorknocklogger`).
- ✅ Enabled APIs: Google Sheets, Google Drive, Apps Script, Maps JavaScript, Geocoding, Places (New).
- ✅ Cleaned up GAIOS project — disabled accidentally-enabled APIs (Sheets, Calendar, Geocoding, Places, Distance Matrix).
- ✅ Created fresh Google Sheet: "BSRG DoorKnock - Production" with 4 tabs (Pins, Logs, Breadcrumbs, Config).
- ✅ Deployed Apps Script backend as web app (Execute as: Me, Access: Anyone).
- ✅ Apps Script project named "BSRG DoorKnock Backend v0.5.0".
- ✅ Updated `app.js` SCRIPT_BASE to new deployment URL.
- ✅ Sheet sharing: Restricted (invite only, supports cross-domain invites).
- ✅ Sheet starred for quick access.
- ✅ Version bumped across: `app.js`, `index.html`, `Code.gs`, Config tab, deployment doc.
- 📄 Full deployment record: `docs/DEPLOYMENT_02_14_26_v1.md`

**Next Steps**
- Set up OAuth consent screen + credentials for MCP servers.
- Install & configure MCP server packages (Sheets, Drive, Maps).
- Verify Maps API key belongs to DoorKnockLogger project.
- End-to-end testing.

## v0.4.0-core — 2025-10-04
**Core stability release**
- ✅ Rebuilt full backend (`Code.gs`) with unified schema and endpoints (`getPins`, `log`, `breadcrumb`, `version`).
- ✅ Integrated new `Config` tab for dynamic settings (refresh interval, status list, color mode, version, script_base).
- ✅ Implemented address-anchored pin logic with unique UUIDs for historical joins.
- ✅ Added 30s polling, 1 pending offline log cache, breadcrumb toggle (off by default).
- ✅ Updated color logic: RED = hottest follow-up, BLACK = DEAD (always visible).
- ✅ Added automatic version check + backend-to-frontend sync.
- ✅ Hardened backend sanitization and error handling.
- ✅ Rewrote `app.js` and `index.html` for cleaner hybrid map UI and 4-second logging workflow.
- ✅ Google Sheet schema standardized:
  - Pins, Logs, Breadcrumbs, Config.
- ✅ Migration-ready for Firebase or SQL in future builds.
- 🔒 Security: backend still runs “as me” with “Anyone” access (to be tightened post-prototype).

**Known Issues**
- No offline queue beyond 1 pending entry.
- Background GPS tracking stops if screen sleeps (browser limitation).
- Pins not auto-updating in real-time between reps yet (30s poll only).

**Next Targets (v0.4.1-core)**
- Refine Quick Log buttons (dynamic config-based).
- Add visual breadcrumb trails on map.
- Implement simple per-user color toggle in Config.
- Start Firebase compatibility testing.

## v0.4.1-devtools — 2025-10-08
**Developer tooling & docs**
- ✅ Added `.github/copilot-instructions.md` with architecture, API contracts, schema invariants, and deployment guidance.
- ✅ Added a Node smoke-test (`scripts/smoke-test.js`) and `package.json` with `npm run smoke-test` to validate GET/POST behavior against a deployed Apps Script endpoint.
- ✅ README updated with quick dev/test instructions and clasp recommendation for backend editing.
