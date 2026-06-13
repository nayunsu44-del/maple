# Requirements — Survivor Rush

## System & Mechanics Specifications

### 1. High-Performance Canvas Rendering
- 4:3 responsive contain-scaling within 800×600 logical bounds.
- `planByState` indexing eliminates per-frame `render_plan.filter()` calls.
- `dst2` (squared distance) + linear scan replaces `sort()` + `sqrt()` for nearest-target logic.
- Canvas `roundRect` polyfill embedded for iOS 15/legacy Chromium.
- Per-frame React setState removed — HUD rendered on canvas, JSX only renders loading overlay.
- `createRadialGradient` used only in `spriteCache.ts` startup (cached offscreen canvases).
- `shadowBlur` used on static UI screens (title, skill pick, level up, result, awakening overlay) where entity count is zero — negligible GPU cost.

### 2. MapleStory Asset Pipeline
- JSON render plans cached in `public/data/maple/*.json` (Vite static serving).
- Images lazy-loaded via `ensureImageLoaded()` on first draw to respect browser 6-connection limit.
- `planByState` hash map built at load time for O(1) state→frames lookup.
- Character assembly: socket-based (neck/navel/brow/hand), z-order ascending.
- Fallback: procedural shapes when CDN images not yet loaded.

### 3. Audio Engine Synthesis
- AudioContext initialized on first user interaction.
- Programmatic synthesis via Web Audio oscillators/noise with `SFX_GAP` throttling.

### 4. Progressive Difficulty & Spawning Curve
- `0s ~ 30s`: High-paced opening.
- `30s ~ 7m`: Steady progressive rise.
- `7m ~ 8m`: Climax rush.
- `8m+`: Boss fight (Jr. Balrog).
- Mid-bosses (Mushmom, Zombie Mushmom) every ~150s, reward multiple skill upgrades.

### 5. Skill System & Awakening Mode
- Skills: Projectile (Energy Bolt), Orb (Holy Symbol), Nova, Meteor, Chain Lightning, Poison Mist, Silver Hawk, HP Drain.
- **Awakening (Lv.6)**: Doubles parameters, golden flares, hit-stop, screen shake.

### 6. Mobile & Desktop Unified Inputs
- Desktop: WASD / Arrow Keys + mouse click.
- Mobile: Touch joystick (left side) + tap for menu/skill pick.
- Landscape forced via contain scaling; portrait letterboxing blends with dark background.

## Known Issues / Constraints

- `engine.ts` (~1318 lines) and `App.tsx` (~1052 lines) exceed the P0 800-line cap. Splitting deferred.
- `bestRef` / `soundRef` are write-only refs (canvas reads `isSoundOn()` and localStorage directly).
- AudioContext requires user gesture to start (handled in click/touch handlers).
- **Draw-side-effect pattern**: `drawTitleCanvas`, `drawSkillPickCanvas`, `drawLevelUpCanvas`, `drawResultCanvas` handle click detection and state transitions inline. This avoids stale-closure race conditions but couples rendering with input. Tolerated for single-rAF simplicity.
