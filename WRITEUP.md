# CSC316 A3: Interactive Visualization – NBA Shot Selection
## Project Write-up

---

### Design Rationale

**Visual Problem:** How can we understand shooting patterns and decision-making across NBA players?

Our visualization tackles this through a half-court representation paired with interactive exploration. The design reflects a few key decisions:

**Visual Encodings:**
- **Spatial position** encodes actual shot location on the court, preserving Geographic fidelity.
- **Color** distinguishes shot zones (At Rim, Paint, Mid-Range, Corner 3, Wing 3s, Top of Key 3), allowing rapid visual categorization.
- **Size variation** by zone provides gentle emphasis while maintaining legibility.
- **Animated arcs** show ball trajectory from the basket to the shot location, creating a narrative of the shot sequence and emphasizing the origin point (hoop).

**Interaction Techniques:**
1. **Player Selection** (dropdown) – Enables comparison of shot distribution patterns across 15 contemporary NBA players.
2. **Shot Type Filters** (2PT/3PT/Made checkboxes) – Allow dynamic query-based exploration: viewers can isolate, for example, only 3-point shots to see offensive spacing, or toggle between 2PT and 3PT attempts to understand shot diet composition.
3. **Details-on-Demand** (hover tooltips) – Display player name, zone, shot distance, result (made/missed), and shot clock timing without cluttering the initial view.
4. **Chart Coordination** – A real-time zone distribution bar chart updates with player selection, showing which zones account for the most attempts. This multi-view coordination bridges spatial and quantitative perspectives.

**Why These Choices:**
- The spatial encoding is foundational: NBA fans understand the court intuitively, so position encodes the strongest signal.
- Filtering (2PT/3PT/Made) reflects real basketball questions: How does a player's 3-point volume differ from their 2-point volume? This directly supports shot selection analysis.
- Animated trajectories create visual rhythm and engagement without sacrificing performance, and the shot clock data in tooltips hints at shot-clock-dependent decision-making (a future deep-dive).
- The distribution chart provides aggregate context for each zone's contribution to overall volume, preventing over-interpretation of slight positional variation.

**Alternatives Considered:**
- *Heat maps instead of individual dots:* Would better show concentration density but lose individual shot-level granularity.
- *Timeline animation showing sequence:* Would reveal game clock patterns but risk overwhelming viewers with context they don't need for this exercise.
- *Comparison view (two players side-by-side):* Deferred to keep scope manageable; single-player drill-down is sufficient for MVP.

---

### Development Process and Technical Implementation

**Dataset & Synthetic Generation:**
We created realistic shot distributions for 15 NBA players (Stephen Curry, Luka Doncic, Giannis, etc.) using weighted zone distributions based on public season statistics. Real FG% and 3PT% targets (e.g., Curry ~45% FG, ~41% 3PT) were embedded in the generation logic. Misses are synthetically generated to align with target percentages but are not rendered on the court—they only affect stats. Shot clock values are randomly sampled (1–24s) for temporal realism.

**Architecture:**
- **D3.js** for SVG rendering (court lines, shot dots, animated arcs) and data binding.
- **Vanilla JavaScript** for filtering state management and event listeners.
- **CSS Grid** for responsive layout (3-column on desktop, single-column on mobile).
- Static JSON data file (no server required; suitable for GitHub Pages deployment).

**Key Challenges & Solutions:**
1. **Court Geometry:** Initial SVG arc paths were rendering incorrectly (mirrored/inverted). Solution: Switched from SVG arc commands to D3 line generators with point-sampled angles, providing more predictable rendering.
2. **Filtering Performance:** Updating 95+ shot dots on every filter change risked lag. Solution: Pre-filter in-memory and use D3's join/exit pattern with early interrupts to smooth transitions.
3. **Multi-view Coordination:** Linking the court and chart required careful state management. Solution: Single `renderSelection()` function orchestrates both views via shared data array.

**Time Spent:**
- Initial exploration and court drawing: ~3 hours
- Data generation and shot distribution logic: ~2 hours
- Filtering and chart implementation: ~2.5 hours
- Polish (hover effects, responsive design, write-up): ~1.5 hours
- **Total: ~9 people-hours**

**Use of AI/LLM:**
We used GitHub Copilot for D3 syntax suggestions (scales, axes, transitions) and CSS Grid layout patterns. Copilot accelerated iteration on SVG-to-D3 conversions and chart axis logic, but required careful review of angle calculations and filtering logic—we rewrote several suggestions for correctness and clarity. The AI helped us avoid boilerplate but didn't replace understanding of the problem domain.

**Reflection:**
Comfortable coding with AI assistance. It shines for repetitive patterns (e.g., margin conventions, D3 method chaining) and reduces typos, but spatial problems (court geometry, coordinate transforms) still required manual reasoning. Next steps would include brushing interactions, shot-clock-based filtering, and multi-player comparison view if time allowed.

---

### Attribution
- **Data inspiration:** NBA league averages and public shot chart conventions (ESPN, NBA.com).
- **D3 references:** Observable notebooks on shot charts and bar charts.
- **Visual design:** Retro broadcast aesthetic inspired by vintage NBA graphics.
