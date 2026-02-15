# Platinum DoorKnock — AI Boot Context
# Last Updated: 02_15_26
# Read this FIRST at the start of every conversation about this project.

## What Is This?
A mobile-first web app for **storm-damage roofing sales canvassing**. Reps drive
through neighborhoods, spot roof damage, knock on doors, and log the result in
2-3 taps. Built for Platinum Roofing AZ (Brent Scheidt + team).

## Current Version: v0.7.0 (02_15_26)

## Tech Stack
- **Frontend:** Vanilla HTML/CSS/JS (single page: index.html + app.js)
- **Backend:** Google Apps Script (Code.gs) → Google Sheets
- **Hosting:** GitHub Pages (https://brentscheidt.github.io/one-button-door-app/)
- **Auth:** Google Sign-In (Identity Services)
- **Maps:** Google Maps JavaScript API (satellite view)
- **Repo:** /Users/subrosa/Documents/GitHub/one-button-door-app/one-button-door-app

## Key People
- **Brent** — owner, primary user, brent@tscstudios.com
- **Paris** — sales rep, male, secondary user (his pins show as pink)

## Architecture Decisions & Why
- **Google Sheets backend** — chosen for speed of prototyping. Works for 2-5 users.
  Will need to migrate to Firebase/Firestore before scaling to 10+ users.
  Sheets hits cell limits (~10M) and concurrent write issues at scale.
- **no-cors POST** — Apps Script doesn't support CORS preflight, so we use
  Content-Type: text/plain + mode: no-cors (fire-and-forget). Can't read response.
- **Address-anchored pins** — pins are keyed by address, not lat/lng. Same address
  reuses existing pin_id. This prevents duplicates when multiple reps knock same house.
- **30s polling** — frontend polls GET ?mode=getPins every 30 seconds. No websockets.
- **60s breadcrumbs** — route recording posts GPS every 60s, min 50m movement delta.
- **One pending offline log** — if POST fails, saves one log to localStorage for retry.

## GCP Project
- **Project:** DoorKnockLogger (ID: doorknocklogger)
- **Owner:** brent@tscstudios.com
- **APIs enabled:** Maps JS, Geocoding, Places (New), Sheets, Drive, Apps Script

## Credentials (ALL in ~/.secure/)
- READ ~/.secure/DOORKNOCK_SECRETS_REFERENCE.md for full details
- MCP Desktop OAuth: ~/.secure/doorknocklogger_oauth.env
- Web OAuth (Sign-In): ~/.secure/platinum_doorknock_web_oauth.json
- Maps API Key: AIzaSyAzfIev2fEMKIa0bDe7FWwqb7lOrhVLstM (in index.html + app.js)
- NEVER store secrets in the repo — only in ~/.secure/

## Backend URLs
- Apps Script: https://script.google.com/macros/s/AKfycbwoIvtGI0Oh-sSkFNGA_u6ARStHbhOEb01qLh6DGX0C1-lPTDg5Vz4thkaFB_n2eDcz4w/exec
- Google Sheet: "BSRG DoorKnock - Production" (4 tabs: Pins, Logs, Breadcrumbs, Config)

## MCP Servers (Claude Desktop)
- google-drive, google-sheets, google-maps
- Config: ~/Library/Application Support/Claude/claude_desktop_config.json
- All use /opt/homebrew/bin/npx with explicit PATH env
- Desktop OAuth auth completed 02_15_26

## Features Built (v0.7.0)
- [x] Google Sign-In (avatar + name in top bar)
- [x] Drop pin at GPS location (FAB button)
- [x] Drop pin anywhere (long-press map, 600ms)
- [x] Log knock outcomes (Knocked/Not Home/Damage/Dead + sub-statuses)
- [x] Pin history (tap pin → see all past log entries)
- [x] User-colored pins (blue=Brent, pink=Paris, black=Dead)
- [x] Own pins render bigger
- [x] Route recording (breadcrumbs) with red indicator
- [x] View filter (All Pins / My Pins / Today / This Week)
- [x] Pin count in top bar
- [x] 26 pins migrated via migrate_pins.js
- [x] Mobile-first dark UI with Inter font

## Features NOT Built Yet (Backlog)
- [ ] Navigate button (deep-link to Google Maps directions)
- [ ] PWA install (home screen icon, offline support)
- [ ] Pin editing (delete, move, DND toggle)
- [ ] AccuLynx CRM integration (API: api.acculynx.com)
- [ ] KML export to Google My Maps
- [ ] Storm overlay layers
- [ ] Competitor pins
- [ ] Firebase migration (needed before 10+ users)
- [ ] Team analytics / dashboard

## Naming Law (System Policy)
- Dates: MM_DD_YY format — NEVER ISO
- Files: [Description]_MM_DD_YY_vN.[ext]
- NEVER delete without Brent's approval

## Key Docs
- docs/APP_CONTEXT.md — pain point, workflow, requirements
- docs/DEPLOYMENT_02_14_26_v1.md — full deployment record
- CHANGELOG.md — version history
- backend/Code.gs — Apps Script backend
- ~/.secure/DOORKNOCK_SECRETS_REFERENCE.md — all credentials

## Common Gotchas
1. Apps Script CORS: Must use Content-Type: text/plain + mode: no-cors
2. Old OAuth client (809pgmb...) was deleted — replaced 02_15_26 with calne3lcnq7...
3. npx must use absolute path /opt/homebrew/bin/npx in non-interactive shells
4. Google Sign-In uses the WEB OAuth client, MCP uses the DESKTOP OAuth client
5. The sheet name is "BSRG DoorKnock - Production" (not "Platinum")
6. Pin migration happened from Paris' account — 24 pins via scripts/migrate_pins.js
