# Platinum DoorKnock — Ideas & Iteration Log
**Created:** 02_15_26
**Last Updated:** 02_15_26 by Gemini (Antigravity)

---

## Session Notes — 02_15_26

### Beta Test Findings
- Brent drove a route with Route toggle ON — breadcrumbs DID record (4 points)
- Pin at 9706 N 7th St did NOT save — no Save button existed (fixed in v0.8.0)
- 60s breadcrumb interval was too infrequent for driving — gaps too wide, connecting dots wrong
- App was v0.7.0 during test, now v0.8.0

### Changes Made Today
- [x] **Save button** added to pin panel (v0.8.0) — full-width blue button, shows status/substatus being saved
- [x] **Bigger FAB** — Drop Pin button increased from 80px to 90px
- [x] **Status tracking** — selected status/substatus highlighted with white outline
- [x] **Breadcrumb interval** — reduced from 60s to 15s
- [x] **Min distance threshold** — reduced from 50m to 15m
- [x] **Max route gap** — 300m config added for smart line-breaking when rendering
- [x] **Backend Code.gs** — added getBreadcrumbs and getRouteSessions endpoints (local, not yet deployed to Apps Script)

---

## Active Ideas / Next Up

### 🔴 Knock Session Timer (Priority: HIGH)
- Replace bare "Route" toggle with a proper session system
- Start/pause/stop controls
- Live elapsed timer display
- Knock counter (auto-increments when pin is saved)
- Progress display: "12 doors • 1:23:45"
- Session history: view past sessions with stats
- Goal setting: "2 hours" or "50 doors" target (future)
- Blinking red indicator when session is active

### 🟡 Route Display on Map (Priority: HIGH)
- Fetch breadcrumbs from backend (needs Apps Script update first)
- Draw Polylines on map from breadcrumb data
- Smart line-breaking: if gap >300m, don't connect
- Color-code by user (blue=Brent, pink=Paris)
- Ability to overlay older routes on the map
- Toggle route visibility on/off

### 🟡 Dragon Logo + Settings Menu (Priority: MEDIUM)
- Brent's custom dragon logo in top-right corner
- Smaller than original size
- Click → dropdown menu with:
  - Settings (sign out, preferences)
  - Routes (saved route history)
- Routes submenu: see last saved routes, when, distance from user, overlay on map

### 🟢 Pin Mode / Route Mode Toggle (Priority: MEDIUM)
- Easy switch between "dropping pins" mode and "active route" mode
- Visual indicator of current mode
- Route mode: map follows GPS, shows live trail

### 🔵 Backend Updates Needed
- [ ] Deploy updated Code.gs to Apps Script (getBreadcrumbs, getRouteSessions)
- [ ] Breadcrumb batching — queue locally, send 10-20 at once instead of 1 per 15s
- [ ] Route simplification — after session ends, reduce points to preserve shape
- [ ] Archive old sessions (>30 days) to separate sheet

### 🔵 Future Features (from backlog)
- [ ] Navigate button (deep-link to Google Maps directions)
- [ ] PWA install (home screen icon, offline support)
- [ ] Pin editing (delete, move, DND toggle)
- [ ] AccuLynx CRM integration
- [ ] KML export to Google My Maps
- [ ] Firebase migration (required before 10+ users)
- [ ] Storm overlay layers
- [ ] Team analytics dashboard

---

## Google Sheets Limits (Reference)
| Limit | Value | Current Usage |
|-------|-------|---------------|
| Total cells | 10M | ~300 (tiny) |
| Rows per tab | ~1.25M with 8 cols | 27 pins, 27 logs, 4 breadcrumbs |
| API calls | ~100/100s | 4/min per user (fine) |
| Breadcrumbs/year (15s) | ~240K per user | Fine for 2 users, review at 5+ |

---

*Updated by Gemini (Antigravity) on 02_15_26*
