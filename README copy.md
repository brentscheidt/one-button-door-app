# One Button Door App (v0.2)

Mobile-first, one-tap door-knock logger. Uses Google Maps JS + Apps Script + Google Sheets.

## Files
- `index.html` — UI shell; loads `config.json`, injects Maps script, renders app.
- `app.js` — Map/GPS/reverse-geocode + save to Sheet (via Apps Script).
- `config.example.json` — Copy to `config.json` and fill in your keys/URLs.
- `backend/Code.gs` — Google Apps Script backend to paste into your Sheet project.
- `docs/Handoff-Prompt.txt` — A prompt to paste into ChatGPT to resume work.
- `CHANGELOG.md` — Version history.
- `scripts/dev.sh` — Run a local server for testing.
- `.gitignore` — Ignore local artifacts.
- `LICENSE` — MIT.

## Setup (10 minutes)
1. **Google Cloud** — Create a Maps API key (HTTP referrers: `http://localhost/*`). API restrictions: enable **Maps JavaScript API** and **Geocoding API**. Billing must be attached (free within $200 credit).
2. **Sheet** — Create a Sheet `DoorKnockLog` with tab `Knocks` (headers created automatically by backend).
3. **Apps Script Backend**
   - Sheet → Extensions → Apps Script → paste `backend/Code.gs`.
   - Project Settings → Script properties: `API_SECRET = <your secret>`.
   - Deploy → New deployment → Web app: Execute as **Me**; Who has access: **Anyone with the link** → copy `/exec` URL.
4. **Frontend config**
   - Copy `config.example.json` → `config.json` and set:
     - `MAPS_API_KEY`
     - `APPS_SCRIPT_URL` (the `/exec` URL)
     - `SHARED_SECRET` (same as `API_SECRET`)
5. **Run**
   ```bash
   python3 -m http.server 5500
   # open http://localhost:5500
   ```

## Debug
- No basemap → referrers or billing; check DevTools for Maps API error.
- Address badge says `Geocode failed` → make sure **Geocoding API** is allowed for your key.
- Save fails (unauthorized) → secret mismatch; fix `config.json` vs script property.
- Save fails (fetch) → make sure URL is `/macros/s/.../exec` and deployment access is “Anyone with the link”.

## Costs
- Google Maps: $200/mo credit. Typical field logging remains $0.
- Apps Script + Sheets: no extra cost for this use.

## Versioning
- Update `CHANGELOG.md` each change.
- Tag releases in git: `git tag v0.2 && git push --tags`.
