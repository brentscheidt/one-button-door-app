# Platinum DoorKnock — App Context & Pain Point

## What This App Solves

**Storm-damage roofing sales canvassing.**

### The Workflow
1. **Drive through neighborhoods** after a storm
2. **Spot visible roof damage** from the car
3. **Knock on the door** — offer a free roof inspection
4. **Log the knock FAST** — who, when, outcome, short note
5. If not home: log that you stopped by, come back later

### Core Requirements
- **SPEED is everything** — logging must be 2-3 taps max while standing at a door
- **One-to-many history** — same address gets knocked multiple times over days/weeks
- **Historical lookup** — "Did we already knock this house? When? What happened?"
- **Multi-user** — multiple reps canvassing the same neighborhoods
- **Mobile-first** — used on a phone in the field, often in direct sunlight

### Future Data Layers (toggle on/off)
- **Built jobs nearby** — see completed roofing jobs on the map (when, by whom)
- **Competitor pins** — houses already taken by other companies
- **Storm paths** — overlay hail/wind damage zones

### Deployment Path
1. **Now:** tscstudios.com domain (dev/testing)
2. **Later:** platinumroofingaz.com Google Workspace (production, domain-based auth)

### Users
- Brent, Paris, and future Platinum Roofing AZ sales reps
- Auth: currently dropdown select → will become Google Workspace sign-in

---

## Credentials & Secrets

> **⚠️ ALL credentials live in `~/.secure/` — NEVER in this repo.**

| Credential | File | Used By |
|-----------|------|---------|
| MCP Desktop OAuth (Drive/Sheets) | `~/.secure/doorknocklogger_oauth.env` | Claude Desktop MCP servers |
| MCP Desktop OAuth (JSON) | `~/.secure/doorknocklogger_mcp_desktop_oauth.json` | server-gdrive auth flow |
| Web OAuth (Sign-In) | `~/.secure/platinum_doorknock_web_oauth.json` | Google Sign-In in index.html |
| Maps API Key | hardcoded in index.html + app.js | Maps JS API, Geocoding |

**Master reference:** `~/.secure/DOORKNOCK_SECRETS_REFERENCE.md`
**Credentials manifest:** `~/.secure/credentials/docs/MANIFEST.txt`
**GCP Project:** `doorknocklogger` (Google Cloud Console)
**Owner:** `brent@tscstudios.com`
