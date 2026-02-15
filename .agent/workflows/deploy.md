---
description: Deploy changes to GitHub Pages (commit + push)
---

# Deploy to GitHub Pages

// turbo-all

1. Check git status for changes
```bash
cd /Users/subrosa/Documents/GitHub/one-button-door-app/one-button-door-app && git status
```

2. Add all changed files
```bash
cd /Users/subrosa/Documents/GitHub/one-button-door-app/one-button-door-app && git add -A
```

3. Commit with a descriptive message (replace MESSAGE with actual description)
```bash
cd /Users/subrosa/Documents/GitHub/one-button-door-app/one-button-door-app && git commit -m "MESSAGE"
```

4. Push to GitHub (auto-deploys to Pages)
```bash
cd /Users/subrosa/Documents/GitHub/one-button-door-app/one-button-door-app && git push origin main
```

5. Verify the live site loads
Open https://brentscheidt.github.io/one-button-door-app/ and confirm changes are visible.
