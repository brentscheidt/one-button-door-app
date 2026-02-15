# Platinum DoorKnock — Claude Project Context
# Claude Code reads this file automatically from the project root.
# For full context, read: .gemini/BOOT.md

## Quick Reference
- **Version:** v0.7.0 (02_15_26)
- **Repo:** /Users/subrosa/Documents/GitHub/one-button-door-app/one-button-door-app
- **Live:** https://brentscheidt.github.io/one-button-door-app/
- **Backend:** Google Apps Script → Google Sheets
- **GCP Project:** doorknocklogger (owner: brent@tscstudios.com)

## Critical Files
- `.gemini/BOOT.md` — FULL project context (read this first)
- `docs/APP_CONTEXT.md` — pain point, workflow, user info
- `docs/DEPLOYMENT_02_14_26_v1.md` — deployment record
- `~/.secure/DOORKNOCK_SECRETS_REFERENCE.md` — ALL credentials & where they live
- `~/.secure/doorknocklogger_oauth.env` — MCP Desktop OAuth creds

## Rules
- Dates: MM_DD_YY format — NEVER ISO
- Secrets: ONLY in ~/.secure/ — NEVER in the repo
- NEVER delete without Brent's approval
- Paris is a HE (male sales rep)
- Apps Script CORS: use Content-Type: text/plain + mode: no-cors
