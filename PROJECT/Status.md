# Status — Survivor Rush

## Completed

### Core Game Infrastructure
- `requestAnimationFrame` loop in React lifecycle.
- TypeScript interfaces (`types.ts`), constants/balance (`constants.ts`), i18n (`i18n.ts`).
- Modularized engine: `engine.ts` (game state, combat, drawing), `spriteCache.ts` (asset loading, sprites), `audio.ts` (Web Audio synth).
- Multi-language EN/KO with `t()`, `skillName()`, `mobName()`, `skillDesc()`.

### MapleStory Asset Integration
- Character: body, head, face, hair, weapon (Magician's Staff), coat, pants, shoes.
- Mobs: Snail, Blue Snail, Orange Mushroom, Zombie Mushroom, Jr. Balrog (boss), Mushmom, Zombie Mushmom.
- Skills: Energy Bolt, Chain Lightning, Meteor, Poison Mist, Silver Hawk, Genesis, Holy Symbol.
- All loaded via `public/data/maple/*.json` render plans + lazy CDN image loading.
- Character socket assembly (neck/navel/brow/hand), facing direction, walk/stand animation.

### Performance Optimizations
- `planByState` indexing — O(1) state lookup replacing per-frame `filter()`.
- `findClosestN()` / `findClosestInRange()` — linear scan replacing `sort()` + `dst()`.
- Per-frame React setState removed — HUD drawn on canvas.
- Dead code removed: `src/__system__/maple/` (~2100 lines) deleted.

### Input & Audio
- Responsive contain-scaling resize handler.
- Keyboard (WASD/Arrow), mouse click, touch joystick + tap.
- `sx`/`sy` coordinate mapping for canvas scaling.
- Web Audio synthesizer with `SFX_GAP`, sound toggle button.
- `roundRect` polyfill for iOS 15/Safari.

### Bug Fixes
- Walk animation: `P.walk = 0` on stop → immediate stand1 transition.
- Camera overshoot (60px) at world boundaries → character always visible.
- i18n import: `import * as i18n` to prevent esbuild tree-shaking.

## Active Work

- (none)

## Next Steps

- Split `engine.ts` (~1318 lines) and `App.tsx` (~1052 lines) to meet P0 800-line cap.
- Tile-based map rendering for MapleStory map assets.
- Balance tuning: drop rates, skill damage scaling, mid-boss frequency.
- Real mobile device testing for touch joystick and landscape.
