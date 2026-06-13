# Context — MapleStory × Vampire Survivors: Survivor Rush

## Project Overview

"Survivor Rush" is a browser-based 2D bullet hell roguelike game that blends MapleStory's iconic visuals/skills with Vampire Survivors' gameplay loop. Built with Canvas API for rendering and Web Audio API for sound. Integrated into a React + TypeScript + Vite structure with MapleStory MCP asset pipeline.

## Tech Stack

- **Framework**: React 18, React DOM 18
- **Build / Lang**: Vite, TypeScript, Bun (runtime/package manager)
- **Styling**: Tailwind CSS, PostCSS (autoprefixer)
- **Rendering**: HTML5 Canvas API (contain-scaling to maintain 4:3 ratio)
- **Audio**: Web Audio API Sound Synthesizer (zero external audio files)
- **Assets**: MapleStory MCP CDN sprites via `spriteCache.loadMapleAssets()` → `public/data/maple/*.json`

## Critical Memory

- **MapleStory CDN Assets**: Character parts (body, head, face, hair, weapon, coat, pants, shoes), 5 standard mobs + 2 mid-bosses, and 7 skill effects are loaded from CDN (`resource-static.msu.io/data`) via pre-saved `data/maple/*.json` render plans. Fallback: procedural circles when CDN images haven't loaded yet.
- **Audio Synthesizer**: All sound effects generated programmatically via Web Audio oscillators and noise buffers with `SFX_GAP` overload threshold. AudioContext initialized on first user gesture.
- **File Size Note**: `engine.ts` (~1318 lines) and `App.tsx` (~1052 lines) currently exceed the P0 800-line target. `__system__/maple/` helper module (~2100 lines) was removed as dead code — assembly logic lives inline in `engine.ts`.
- **Game Loop**: `requestAnimationFrame` with delta capped at 100ms. Hit-stop scales frame delta by 12% during impact. Per-frame React setState eliminated (HUD drawn on canvas, not JSX).
- **Multi-language**: EN (default) / KO via module-level `currentLang` and `t()`.

## Key Decisions

- **Lazy image loading**: `ensureImageLoaded()` triggers CDN image load on first draw, avoiding concurrent connection limit (6 per host).
- **render_plan indexing**: `planByState` map built at load time — O(1) state lookup replaces per-frame `filter()`.
- **dst2 + linear scan**: `findClosestN()` and `findClosestInRange()` helpers replace `sort()` + `dst()` for nearest-target queries.
- **Character flip**: Entire character mirrored via `ctx.scale(-1, 1)` instead of per-part flip.
- **i18n architecture**: Module-level `currentLang` updated by `setLang()`; `t()` defaults to `currentLang`.
- **Weapon**: Beginner Magician's Staff (AAT 6), projectile effect scale 0.5.
