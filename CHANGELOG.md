# Changelog

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

