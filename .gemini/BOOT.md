# Gemini Boot Context — Platinum DoorKnock
# Gemini/Antigravity reads this when working on this repo.

## ⚡ READ THIS FIRST: ../SHARED_AI_CONTEXT.md
The single source of truth for this project is `SHARED_AI_CONTEXT.md` in the
repo root. Read that file for full context on architecture, credentials,
features, gotchas, and rules.

## Quick Reference
- **Version:** v0.7.0 (02_15_26)
- **Live:** https://brentscheidt.github.io/one-button-door-app/
- **Repo:** /Users/subrosa/Documents/GitHub/one-button-door-app/one-button-door-app
- **GCP Project:** doorknocklogger (owner: brent@tscstudios.com)
- **Credentials:** ~/.secure/DOORKNOCK_SECRETS_REFERENCE.md

## GAIOS Cross-AI Memory System

This project is tracked by GAIOS — Brent's unified AI workspace.
When you finish a session, log it so Claude and Codex know what you did:

```bash
python3 ~/gaios_project/session_logger.py --ai gemini \
    --summary "What you did" \
    --projects "Platinum DoorKnock" \
    --files-touched "file1, file2" \
    --decisions "Decision1; Decision2" \
    --next-steps "Next1; Next2"
```

To see what other AIs worked on recently:
```bash
cat ~/gaios_project/HANDOFF.md
python3 ~/gaios_project/context_analyzer.py --recent 7
```

## Rules (Always Follow)
- Dates: MM_DD_YY format — NEVER ISO
- Secrets: ONLY in ~/.secure/ — NEVER in the repo
- NEVER delete without Brent's approval
- Paris is a HE
- After making significant changes, UPDATE `SHARED_AI_CONTEXT.md`
- After significant sessions, LOG to GAIOS (see above)
