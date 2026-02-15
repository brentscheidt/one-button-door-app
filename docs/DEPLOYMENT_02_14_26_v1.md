# BSRG DoorKnock — Deployment Record
**Date:** 02_14_26
**Version:** v0.5.0
**Deployed by:** Claude (Antigravity) + Brent

---

## Google Cloud Project

| Field | Value |
|-------|-------|
| **Project Name** | DoorKnockLogger |
| **Project ID** | `doorknocklogger` |
| **Console URL** | https://console.cloud.google.com/home/dashboard?project=doorknocklogger |

### Enabled APIs
- ✅ Google Sheets API
- ✅ Google Drive API
- ✅ Apps Script API
- ✅ Maps JavaScript API
- ✅ Geocoding API
- ✅ Places API (New)
- ❌ Google Calendar API (not needed for current app)

---

## Google Sheet (Database)

| Field | Value |
|-------|-------|
| **Name** | BSRG DoorKnock - Production |
| **Spreadsheet ID** | `1S_skibGDUVPnk5FL8ZHrQkcBp6Kld4MqbAbrzBfdSjc` |
| **URL** | https://docs.google.com/spreadsheets/d/1S_skibGDUVPnk5FL8ZHrQkcBp6Kld4MqbAbrzBfdSjc/edit |
| **Starred** | ✅ Yes |
| **Sharing** | Restricted (invite only — can add cross-domain users) |
| **Owner** | brent@tscstudios.com |

### Tabs / Schema
1. **Pins** — `pin_id`, `address_norm`, `lat`, `lng`, `latest_status`, `latest_substatus`, `latest_note`, `latest_ts`, `latest_user`, `value_rank`, `is_dnd`, `created_ts`, `created_by`, `last_updated_ts`
2. **Logs** — `log_id`, `pin_id`, `address`, `lat`, `lng`, `status`, `substatus`, `note`, `user`, `ts`, `device`, `source`
3. **Breadcrumbs** — `crumb_id`, `user`, `session_id`, `lat`, `lng`, `speed_kmh`, `accuracy_m`, `ts`
4. **Config** — `key`, `value` (pre-populated: `version=0.5.0`, `status_list=Damage|Quick Knock|Conversation|Inspection|Customer|Dead`)

---

## Apps Script Backend

| Field | Value |
|-------|-------|
| **Project Name** | BSRG DoorKnock Backend v0.5.0 |
| **Script Editor** | https://script.google.com/u/0/home/projects/1R8UYypAXX-iMrvq8wjK_IN0pstw3ZX1_oBi (linked from sheet Extensions menu) |
| **Deployment Type** | Web app |
| **Deployment Version** | Version 1 — v0.5.0 Production |
| **Execute as** | Me (brent@tscstudios.com) |
| **Who has access** | Anyone |
| **Web App URL** | `https://script.google.com/macros/s/AKfycbwoIvtGI0Oh-sSkFNGA_u6ARStHbhOEb01qLh6DGX0C1-lPTDg5Vz4thkaFB_n2eDcz4w/exec` |
| **Deployment ID** | `AKfycbwoIvtGI0Oh-sSkFNGA_u6ARStHbhOEb01qLh6DGX0C1-lPTDg5Vz4thkaFB_n2eDcz4w` |

### Endpoints
- `GET ?mode=getPins` — Returns all pins from the Pins tab
- `GET ?mode=version` — Returns the app version from Config tab
- `POST ?mode=log` — Logs a door knock (upserts pin + appends log row)
- `POST ?mode=breadcrumb` — Records a GPS breadcrumb for route tracking

---

## Frontend Configuration

| Field | Value |
|-------|-------|
| **SCRIPT_BASE** | Updated in `app.js` line 11 |
| **Maps API Key** | `AIzaSyAzfIev2fEMKIa0bDe7FWwqb7lOrhVLstM` (in `index.html` line 81, from DoorKnockLogger project) |

---

## OAuth Configuration

| Field | Value |
|-------|-------|
| **Consent Screen App Name** | BSRG DoorKnock MCP |
| **User Type** | External (Testing) |
| **Support Email** | brent@tscstudios.com |
| **Developer Contact** | brent@tscstudios.com |

### Desktop OAuth Credentials
| Field | Value |
|-------|-------|
| **Name** | BSRG DoorKnock MCP Desktop |
| **Client ID** | `251697766355-809pgmb1q3rjigb1b8lm93cqgusm0i1m.apps.googleusercontent.com` |
| **Client Secret** | Stored in `~/.secure/doorknocklogger_oauth.env` |
| **Created** | February 14, 2026 |
| **Status** | ✅ Enabled |

---

## MCP Server Configuration (02_14_26)

### Installed Packages (via npx on demand)
- `@modelcontextprotocol/server-gdrive` — Google Drive file search/access
- `@gpwork4u/google-sheets-mcp` — Google Sheets read/write
- `@modelcontextprotocol/server-google-maps` — Geocoding & places

### Claude Desktop Config
**File:** `~/Library/Application Support/Claude/claude_desktop_config.json`

| Server | Command | Auth |
|--------|---------|------|
| `google-drive` | `/opt/homebrew/bin/npx -y @modelcontextprotocol/server-gdrive` | OAuth (Client ID + Secret) |
| `google-sheets` | `/opt/homebrew/bin/npx -y @gpwork4u/google-sheets-mcp` | OAuth (Client ID + Secret) |
| `google-maps` | `/opt/homebrew/bin/npx -y @modelcontextprotocol/server-google-maps` | Maps API Key |

> **Note:** Commands use absolute `/opt/homebrew/bin/npx` path (Node v23.7.0) with explicit `PATH` env to ensure `node` is found by child processes. After updating config, Claude Desktop must be restarted. First launch of google-drive and google-sheets will prompt browser OAuth flow — sign in with `brent@tscstudios.com`.

### OAuth Scopes (Data Access — 02_14_26)
| Category | Scope | Description |
|----------|-------|-------------|
| Sensitive | `.../auth/spreadsheets` | See, edit, create, delete all Google Sheets |
| Restricted | `.../auth/drive.readonly` | See and download all Google Drive files |

---

## Changes Made During This Session

### GAIOS Project Cleanup
- Disabled accidentally enabled APIs: Google Sheets API, Google Calendar API, Geocoding API, Places API, Distance Matrix API
- Left intact: Google Drive API, Maps JavaScript API (pre-existing)

### DoorKnockLogger Project Setup
1. Verified project exists (ID: `doorknocklogger`, created Nov 2, 2025)
2. Enabled required APIs (Sheets, Drive, Apps Script, Maps JS, Geocoding, Places New)
3. Created Google Sheet "BSRG DoorKnock - Production" with 4 tabs + headers + config data
4. Starred the spreadsheet for quick access
5. Deployed Apps Script backend as web app (Anyone, Execute as Me)
6. Renamed Apps Script project to "BSRG DoorKnock Backend v0.5.0"
7. Set sheet sharing to Restricted (invite only, cross-domain OK)
8. Updated `app.js` SCRIPT_BASE to new deployment URL
9. Version bumped to v0.5.0 across all files (app.js, index.html, Code.gs, Config tab, CHANGELOG)
10. Set up OAuth consent screen (External, Testing, BSRG DoorKnock MCP)
11. Created Desktop OAuth 2.0 Client ID credentials
12. Stored credentials securely in `~/.secure/doorknocklogger_oauth.env`
13. Installed MCP server packages globally (gdrive, sheets, maps)
14. Updated `claude_desktop_config.json` with 3 MCP server entries
15. Fixed `claude_desktop_config.json` to use absolute `/opt/homebrew/bin/npx` + PATH env
16. Added OAuth scopes: `spreadsheets` (sensitive) + `drive.readonly` (restricted)

---

## Next Steps (TODO)
- [x] Set up OAuth consent screen in DoorKnockLogger project (for MCP servers)
- [x] Create OAuth 2.0 Desktop Client ID credentials
- [x] Install & configure MCP server packages (Sheets, Drive, Maps)
- [x] Update `claude_desktop_config.json` with MCP server entries
- [x] Fix `claude_desktop_config.json` — absolute npx path + PATH env (02_14_26)
- [x] Add OAuth scopes: spreadsheets + drive.readonly (02_14_26)
- [x] Verify Maps API key belongs to DoorKnockLogger project (swapped to correct key)
- [x] Update deployed Apps Script code to match local v0.5.0 (Version 2 deployed)
- [x] Test the full app flow end-to-end (GET verified, frontend loads with map)
- [x] Migrate existing pins from Paris' account (24 pins via migrate_pins.js)
- [ ] Complete OAuth browser flow in Claude Desktop (requires Brent restart)
- [ ] Verify MCP servers in Claude Desktop (Sheets read, Drive search, Maps geocode)
