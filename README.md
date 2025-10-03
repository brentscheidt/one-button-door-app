# One Button Door App (v0.3.3)

Mobile-first Google Maps app to log door knocks to a Google Sheet via Apps Script.

## Setup

### 1) Apps Script backend
- New project → replace with `backend/Code.gs`.
- Deploy **Web App**: Execute as *Me*, Access *Anyone with link*.
- Copy the Web App URL.

### 2) Frontend
- Host `index.html`, `app.js` on GitHub Pages (or any static host).
- Copy `app.config.example.js` to `app.config.js` and set:
  ```js
  window.APP_CONFIG = { ENDPOINT: "YOUR_WEB_APP_URL" }
  ```

### 3) Maps API Key
- Restrict HTTP referrers to your GitHub Pages domain.

## Filter
- All / Brent / Paris

## Changelog
- 2025-10-03 v0.3.3 — live pins, user filter, JSON feed, tap-to-select
