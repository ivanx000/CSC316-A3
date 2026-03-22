# CSC316 A3: Interactive Viz - NBA Shot Poems

A D3.js visualization of synthetic shot patterns for current NBA players.

## Concept
- Half-court only, empty on first load
- Choose a player to replay made-shot trajectories as animated arcs
- Shot dots remain after animation for spatial analysis
- FG% and 3PT% include hidden missed shots (misses do not render on court)
- 3PT zones split into corner, left wing, right wing, and top of key

## Files
- index.html: app shell and control layout
- css/styles.css: styles and responsive layout
- js/script.js: D3 court drawing, shot generation, and animation logic
- data/player_profiles.json: player profiles, zone weights, and target percentages

## Run locally
Use any static server from the project root. Example:

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080

## Deployment
Designed for GitHub Pages (root deployment from main branch).

## Attribution
- Data is synthetic, generated from role-aware distributions.
- Visual conventions inspired by public NBA shot chart designs.
