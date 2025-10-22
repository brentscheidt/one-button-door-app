# One Button Door App

Mobile-first Google Maps app to log door knocks to a Google Sheet via Apps Script.

## Setup

### 1) Apps Script backend
- New project → replace with `backend/Code.gs`.
- Deploy **Web App**: Execute as *Me*, Who has access: *Anyone with link* (or restrict to domain during production).
- Copy the Web App URL and paste into `app.config.js`.

### 2) Frontend
- Host `index.html`, `app.js` on GitHub Pages (or any static host).
- Copy `app.config.example.js` to `app.config.js` and set:
  ```js
  window.APP_CONFIG = { ENDPOINT: "YOUR_WEB_APP_URL" }
  ```

### 3) Maps API Key
- Restrict HTTP referrers to your GitHub Pages domain. Do not commit the key to the repo for production use.

## Developer tooling
- Lightweight smoke test (Node): install deps and run the smoke test against a deployed Apps Script endpoint.
  ```bash
  npm install
  npm run smoke-test -- https://script.google.com/macros/s/XXXXX/exec
  ```
- Editing backend reproducibly: use `clasp` (see `.github/copilot-instructions.md` for a sample workflow).

## Filter
- All / Brent / Paris

## Changelog
- See `CHANGELOG.md` for recent release notes.
