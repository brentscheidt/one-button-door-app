
## One Button Door App — Agent instructions (industry standards + repo specifics)

This file gives short, actionable guidance for an AI coding agent to be immediately productive in this repo. It focuses on the real, discoverable constraints and the developer workflow used by the project.

### High-level architecture
- Frontend: static single-page app (map UI). Key files: `index.html`, `app.js`, `app.config.js` (use `app.config.example.js` as template). Normally hosted on GitHub Pages or any static host.
- Backend: Google Apps Script stored in `backend/Code.gs`. Deployed as a Web App. Frontend uses the Web App URL via `window.APP_CONFIG.ENDPOINT`.
- Storage: a Google Sheet with tabs named exactly `Pins`, `Logs`, `Breadcrumbs`, `Config`. The Apps Script reads/writes rows directly — treat the sheet as the canonical data model.

### API & data contract (exact)
- GET: <ENDPOINT>?mode=getPins → JSON array of pins with fields: `pin_id,address,lat,lng,status,substatus,note,ts,user,is_dnd` (see `getPins_()` in `Code.gs`).
- POST (log): POST to <ENDPOINT>?mode=log with JSON body like { pin_id?, address, lat?, lng?, status, substatus?, note?, user, device?, source?, ts? }. Response: { ok: true, pin_id, ts }.
- POST (breadcrumb): POST to <ENDPOINT>?mode=breadcrumb with JSON body matching the breadcrumb row (user, session_id, lat, lng, speed_kmh, accuracy_m).

### Schema invariants (do not change lightly)
- Tabs: `Pins`, `Logs`, `Breadcrumbs`, `Config` (names are exact).
- `Pins` header (enforced by `ensurePinsHeaders_`):
  ["pin_id","address_norm","lat","lng","latest_status","latest_substatus","latest_note","latest_ts","latest_user","value_rank","is_dnd","created_ts","created_by","last_updated_ts"]
- `Logs` appended rows: uuid, pin_id, addr, lat, lng, status, substatus, note, user, ts, device, source.

When making changes that touch sheet layout, update `ensurePinsHeaders_`, any `colIndex_` usages, and the frontend shape expected by `getPins_()`.

### Developer workflows (practical steps)
- Edit frontend: change `app.js`/`index.html`, commit, serve via GitHub Pages or static host. Update `app.config.js` to point `ENDPOINT` at the deployed Apps Script.
- Edit backend (quick): open Apps Script editor, replace `Code.gs`, Save, create a new version, Deploy → Web app with:
  - Execute as: Me
  - Who has access: Anyone (or appropriate domain)
  Copy the Web App URL and paste into `app.config.js`.
- Edit backend (recommended for reproducible dev): use `clasp` to manage Apps Script as source. Typical flow:
  ```bash
  npm install -g @google/clasp
  clasp login
  clasp clone <SCRIPT_ID>   # or clasp create --title "one-button-door-backend" --type standalone
  # edit files locally
  clasp push
  ```
  (Replace <SCRIPT_ID> with the script's id from Apps Script URL.)

### Debugging & testing notes
- `debug.html` is a small harness for manual GET/POST testing. It demonstrates `fetch(..., { mode: 'no-cors' })` for POST — this avoids preflight but prevents reading the response body. Use it for quick sending-only tests.
- For full request/response testing deploy a Web App version and call it (or use a proxy that handles CORS).
- When changing logic that affects `getPins_()` or `upsertPin_()`, manually inspect the Google Sheet rows to confirm header alignment and values.

### Security & operational best practices (repo-specific)
- Do not commit secrets: remove or rotate the Maps API key in `index.html`. Prefer restricted keys (HTTP referrers) and store secrets out-of-repo when possible.
- Apps Script deployment: prefer scoped access and reviewer approvals for production deployments. Audit the spreadsheet sharing settings — the service account / deploying account must have editor access to the Sheet.

### Code & PR guidance (practical checks)
- Keep sheet header ordering stable. Tests/changes that reorder headers will break production data.
- Preserve the JSON keys returned by `getPins_()` unless you update `app.js` consumption code.
- Include a short manual validation in PR description: which sheet headers changed (if any), what Apps Script version to deploy, and updated `app.config.js` ENDPOINT if applicable.

### Where to look for examples
- `backend/Code.gs` — canonical implementations: `doGet`, `doPost`, `getPins_`, `handleLog_`, `upsertPin_`, and header enforcement in `ensurePinsHeaders_`.
- `app.js` — map init, dropPin, refresh loop and UI wiring. It shows how frontend forms the payloads and reads `getPins` output.
- `debug.html` — live POST/GET examples and the practical `no-cors` note.

If you'd like, I can also:
- Generate a tiny `clasp`-based dev scaffold (package.json + clasp setup) and a checklist for safe Apps Script deployments.
- Add a smoke-test script (Node) that calls the deployed endpoint and validates schema.

Tell me which of the follow-ups you want and I will implement it.

