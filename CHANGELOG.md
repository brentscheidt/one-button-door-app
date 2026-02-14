# Changelog

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

