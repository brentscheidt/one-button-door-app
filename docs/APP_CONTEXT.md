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
