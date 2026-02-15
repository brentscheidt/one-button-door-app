# ╔══════════════════════════════════════════════════════════════════════╗
# ║  SHARED AI CONTEXT — Platinum DoorKnock                             ║
# ║  THE single source of truth for ALL AI agents working on this repo  ║
# ║  Last Updated: 02_15_26 by Gemini (Antigravity)                     ║
# ╚══════════════════════════════════════════════════════════════════════╝
#
# WHO READS THIS:
#   - Gemini/Antigravity → via .gemini/BOOT.md (symlinks here)
#   - Claude Code        → via CLAUDE.md (points here)
#   - Claude Desktop     → paste into Project instructions
#   - GPT / any other AI → paste or reference this file
#
# HOW TO UPDATE:
#   Tell ANY AI: "update the shared AI context"
#   The AI should edit THIS file, then the others auto-inherit.

---

## Project Overview

**Platinum DoorKnock** — A mobile-first web app for storm-damage roofing sales
canvassing. Reps drive neighborhoods after storms, spot roof damage, knock on
doors, and log the outcome in 2-3 taps. Built for Platinum Roofing AZ.

- **Version:** v0.7.0
- **Live URL:** https://brentscheidt.github.io/one-button-door-app/
- **Repo:** /Users/subrosa/Documents/GitHub/one-button-door-app/one-button-door-app
- **Owner:** Brent Scheidt (brent@tscstudios.com)

---

## People

| Name | Role | Gender | Notes |
|------|------|--------|-------|
| **Brent** | Owner, primary dev, primary user | He/Him | brent@tscstudios.com |
| **Paris** | Sales rep, secondary user | **He/Him** | His pins show as pink on the map |

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Vanilla HTML + CSS + JS | Single page: index.html + app.js |
| Backend | Google Apps Script (Code.gs) | Deployed as web app, handles GET/POST |
| Database | Google Sheets | "BSRG DoorKnock - Production" (4 tabs) |
| Hosting | GitHub Pages | Auto-deploys from main branch |
| Auth | Google Sign-In (Identity Services) | Web OAuth client |
| Maps | Google Maps JavaScript API | Satellite view, hybrid mode |
| GCP Project | doorknocklogger | Owner: brent@tscstudios.com |

---

## Architecture Decisions (Why Things Are The Way They Are)

1. **Google Sheets as backend** — Chosen for rapid prototyping. Works for 2-5 users.
   WILL break at 10+ users (cell limits, concurrent writes). Plan: migrate to
   Firebase/Firestore before scaling.

2. **no-cors POST** — Apps Script doesn't handle CORS preflight. We use
   `Content-Type: text/plain` + `mode: no-cors` (fire-and-forget). Cannot read
   the response body. This is intentional, not a bug.

3. **Address-anchored pins** — Pins keyed by street address, not lat/lng. Same
   address reuses the same pin_id. Prevents duplicates when multiple reps knock
   the same house.

4. **30s polling** — No websockets. Frontend fetches all pins every 30 seconds.

5. **60s breadcrumbs** — Route recording POSTs GPS every 60s, with a 50m minimum
   movement threshold to avoid spamming stationary positions.

6. **One offline pending log** — If POST fails, one log is saved to localStorage
   for retry. Not a full offline queue.

---

## Credentials & Secrets

> **⚠️ ALL credentials live in `~/.secure/` — NEVER in the repo.**
> **⚠️ Read `~/.secure/DOORKNOCK_SECRETS_REFERENCE.md` for full details.**

| Credential | Source of Truth | Used By |
|-----------|----------------|---------|
| MCP Desktop OAuth (client ID + secret) | `~/.secure/doorknocklogger_oauth.env` | Claude Desktop MCP servers (google-drive, google-sheets) |
| MCP Desktop OAuth (JSON) | `~/.secure/doorknocklogger_mcp_desktop_oauth.json` | server-gdrive local-auth flow |
| Web OAuth (Google Sign-In) | `~/.secure/platinum_doorknock_web_oauth.json` | index.html + app.js |
| Maps API Key | Hardcoded in index.html + app.js | Maps JS API, Geocoding |
| Apps Script URL | Hardcoded in app.js `CONFIG.SCRIPT_BASE` | All backend calls |

**If rotating credentials:** update ALL downstream files listed in
`~/.secure/DOORKNOCK_SECRETS_REFERENCE.md`.

---

## MCP Servers (Claude Desktop)

| Server | Package | Status |
|--------|---------|--------|
| google-drive | @modelcontextprotocol/server-gdrive | ✅ Auth completed 02_15_26 |
| google-sheets | @gpwork4u/google-sheets-mcp | ✅ Connected |
| google-maps | @modelcontextprotocol/server-google-maps | ✅ Connected |

Config: `~/Library/Application Support/Claude/claude_desktop_config.json`
All use `/opt/homebrew/bin/npx` with explicit PATH env.

---

## Features (Current — v0.7.0)

- [x] Google Sign-In (avatar + name in top bar)
- [x] Drop pin at GPS (FAB crosshair button)
- [x] Drop pin anywhere (long-press map, 600ms)
- [x] Log knock outcomes (Knocked / Not Home / Damage / Dead + sub-statuses)
- [x] Pin history (tap pin → see all past entries)
- [x] User-colored pins (blue=Brent, pink=Paris, black=Dead)
- [x] Own pins render bigger than others'
- [x] Route recording (breadcrumbs) with red pulsing indicator
- [x] View filter (All Pins / My Pins / Today / This Week)
- [x] Pin count in top bar
- [x] 26 pins migrated from production data
- [x] Dark UI with Inter font, glassmorphism, mobile-first

## Backlog (Not Yet Built)

- [ ] Navigate button (deep-link to Google Maps directions)
- [ ] PWA install (home screen icon, offline support)
- [ ] Pin editing (delete, move, DND toggle)
- [ ] AccuLynx CRM integration (api.acculynx.com)
- [ ] KML export to Google My Maps
- [ ] Firebase migration (required before 10+ users)
- [ ] Storm overlay layers
- [ ] Team analytics dashboard

---

## Key Files

| File | Purpose |
|------|---------|
| `index.html` | Full UI — HTML + all CSS (inline `<style>`) |
| `app.js` | All frontend JS — map, auth, logging, breadcrumbs |
| `backend/Code.gs` | Apps Script backend — doGet, doPost, handleLog, handleBreadcrumb |
| `scripts/migrate_pins.js` | One-time migration script for existing pins |
| `docs/APP_CONTEXT.md` | Pain point, workflow, requirements |
| `docs/DEPLOYMENT_02_14_26_v1.md` | Full deployment record |
| `CHANGELOG.md` | Version history |
| `.gemini/BOOT.md` | Gemini boot context (points to this file) |
| `CLAUDE.md` | Claude Code auto-read file (points to this file) |
| `SHARED_AI_CONTEXT.md` | **THIS FILE** — universal AI context |

---

## Common Gotchas

1. **CORS:** Apps Script requires `Content-Type: text/plain` + `mode: no-cors`
2. **Old OAuth:** Client `809pgmb...` was deleted. Current: `calne3lcnq7jq1...`
3. **npx path:** Must use `/opt/homebrew/bin/npx` in non-interactive shells
4. **Two OAuth clients:** WEB (for Sign-In) vs DESKTOP (for MCP servers)
5. **Sheet name:** "BSRG DoorKnock - Production" (not "Platinum")
6. **Pin migration:** 24 pins via `scripts/migrate_pins.js` from Paris' account

---

## Rules for ALL AI Agents

1. **Dates:** `MM_DD_YY` format — NEVER ISO (2026-02-15)
2. **Secrets:** Only in `~/.secure/` — NEVER in the repo
3. **Deleting:** NEVER delete files without Brent's explicit approval
4. **This file:** Update THIS file when architecture, features, or credentials change
5. **Gender:** Paris is HE/HIM
6. **Naming:** `[Description]_MM_DD_YY_vN.[ext]` for documents

---

## Brent's Tool Ecosystem

| Tool | Purpose |
|------|---------|
| **Gemini (Antigravity)** | Primary AI coding assistant |
| **Claude (Desktop + Code)** | Secondary AI, has MCP server access |
| **GPT** | Additional AI assistant |
| **AccuLynx** | Roofing CRM (production system) |
| **Google Workspace** | Drive, Sheets, Maps, Apps Script |
| **GitHub** | Code hosting, GitHub Pages deployment |
| **Docker** | Containerization (future use) |

---

*This file was last updated by Gemini (Antigravity) on 02_15_26.
Any AI that makes significant project changes should update this file.*
