# Platinum DoorKnock

Mobile-first Google Maps app for door-to-door canvassing. Log knocks, track visits, and manage territories — all from your phone.

**By Platinum Roofing AZ**

## Live App

🌐 **[https://brentscheidt.github.io/one-button-door-app/](https://brentscheidt.github.io/one-button-door-app/)**

## Features

- 📍 **Drop Pin @ GPS** — one tap to place a pin at your exact location
- ⚡ **2-3 tap logging** — status → substatus → done (Damage, Quick Knock, Conversation, Inspection, Customer, Dead)
- 📜 **Pin History** — tap any pin to see every past interaction
- 🔍 **View Filters** — All Pins / My Pins / Today / This Week
- 🗺️ **Hybrid satellite map** — see rooftops and streets
- 📊 **Pin count** — always know how many pins are on the map
- 🔄 **Auto-refresh** — 30s polling keeps everyone in sync
- 📱 **Mobile-first** — designed for field use on phones

## Architecture

```
index.html + app.js (static frontend)
        ↓ fetch()
Apps Script Web App (backend/Code.gs)
        ↓
Google Sheets (database: Pins, Logs, Breadcrumbs, Config)
```

## Setup

### 1) Apps Script Backend
- Open the linked Google Sheet → Extensions → Apps Script
- Replace `Code.gs` with `backend/Code.gs`
- Deploy as **Web App**: Execute as *Me*, Access: *Anyone*
- Copy the Web App URL into `app.js` → `CONFIG.SCRIPT_BASE`

### 2) Frontend
- Hosted on **GitHub Pages** (auto-deploys from `main` branch)
- Or host `index.html` + `app.js` on any static server

### 3) Maps API Key
- Set in `index.html` script tag
- Restrict HTTP referrers to your domain in Google Cloud Console

## Developer Tooling
```bash
npm install
npm run smoke-test -- https://script.google.com/macros/s/XXXXX/exec
```

## Changelog
See `CHANGELOG.md` for release notes.
