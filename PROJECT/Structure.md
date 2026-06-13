# Structure — Survivor Rush

## Directory Layout

```
/home/project/
├── PROJECT/
│   ├── Context.md
│   ├── Structure.md
│   ├── Requirements.md
│   └── Status.md
├── public/
│   └── data/
│       └── maple/
│           ├── body_2000.json            # Base character body and arm data
│           ├── head_12000.json           # Character head and ear data
│           ├── face_20000.json           # Expression sprite mappings (default face)
│           ├── hair_30000.json           # Hair textures and overlays
│           ├── weapon_STAFF.json         # Beginner Magician's Staff (AAT 6)
│           ├── coat_1040004.json         # Blue Training Shirt
│           ├── pants_1060040.json        # Blue Trainer Pants
│           ├── shoes_1072850.json        # Brand New Adventure Shoes
│           ├── mob_100100.json           # Green Snail
│           ├── mob_100101.json           # Blue Snail
│           ├── mob_1210102.json          # Orange Mushroom
│           ├── mob_2230101.json          # Zombie Mushroom
│           ├── mob_8130100.json          # Jr. Balrog (boss)
│           ├── mob_MUSHMOM.json          # Mushmom (mid-boss)
│           ├── mob_ZMUSHMOM.json         # Zombie Mushmom (mid-boss)
│           ├── skill_ENERGYBOLT.json     # Energy Bolt effect sprites
│           ├── skill_CHAINLIGHTNING.json # Chain Lightning effect sprites
│           ├── skill_METEOR.json         # Meteor effect sprites
│           ├── skill_POISONMIST.json     # Poison Mist effect sprites
│           ├── skill_SILVERHAWK.json     # Silver Hawk summon sprites
│           ├── skill_GENESIS.json        # Genesis effect sprites
│           └── skill_HOLYSYMBOL.json     # Holy Symbol orb sprites
├── src/
│   ├── game/
│   │   ├── types.ts          # Type declarations (PlayerState, Enemy, Projectile, etc.)
│   │   ├── constants.ts      # SD/ED tables, world bounds, score calc, xp thresholds
│   │   ├── audio.ts          # Web Audio synth with SFX_GAP throttling
│   │   ├── spriteCache.ts    # Maple asset loading, planByState indexing, lazy image fetch
│   │   ├── i18n.ts           # EN/KO translations, t(), skillName(), mobName(), skillDesc()
│   │   └── engine.ts         # Game state, update loops, combat, canvas drawing
│   ├── App.tsx               # React entry: game loop, UI states, input, resize
│   ├── App.css               # Viewport layout and centering
│   ├── index.css             # Tailwind imports
│   ├── assets.json           # Asset manifest (empty baseline)
│   └── main.tsx              # Entry point with roundRect polyfill
```

## Module Responsibilities

### `public/data/maple/*.json`
Saved render plans from MapleStory MCP CDN. Each JSON contains `render_plan` (frame list with CDN paths, origins, sockets, z-order), `planByState` (O(1) state→frames index built at load time), `cdbBase`, `availableStates`, and optionally `zmap`. Images are lazy-loaded via `ensureImageLoaded()` on first draw call.

### `src/game/types.ts`
TypeScript interfaces for all entities: PlayerState, Enemy, Projectile, DropItem, Particle, Nova, FText, Meteor, Lightning, PoisonCloud, Hawk.

### `src/game/constants.ts`
- World bounds (`WW=2800`, `WH=2800`), viewport (`LW=800`, `LH=600`).
- `SD` (Skill Definitions): 8 skills, Lv.1–5 progression, Lv.6 awakening.
- `ED` (Enemy Definitions): HP, speed, damage for snails, mushrooms, mid-bosses, boss.
- XP thresholds, score/grade calculation.

### `src/game/audio.ts`
Web Audio API synth: oscillators (`sine`, `square`, `sawtooth`, `triangle`) + noise buffers. `SFX_GAP` deduplication prevents crackling on rapid triggers.

### `src/game/spriteCache.ts`
- Loads all `data/maple/*.json` → builds `planByState` index on each asset.
- `ensureImageLoaded()`: lazy CDN image fetch respecting browser 6-connection limit.
- Procedural sprites: floor pattern (Lith Harbor wood planks), procedural glow shapes.

### `src/game/i18n.ts`
Multi-language module. `currentLang` ref updated by `setLang()`. `t(key)`, `skillName(id)`, `mobName(type)`, `skillDesc(id, lv)` all default to `currentLang`. Languages: EN, KO.

### `src/game/engine.ts`
Core game loop logic:
- **Movement**: Vector integration, boundary clamping, facing direction.
- **Combat**: Projectile collision (AABB pruning), skill cooldowns, damage application.
- **Drawing**: Character socket assembly, mob rendering, skill effect sprites, HUD elements.
- **Juice**: Screen shake, hit-stop, damage text, awakening sequence.
- **Optimization**: `planByState` O(1) lookup, `findClosestN`/`findClosestInRange` linear scan, `dst2` squared distance.

### `src/App.tsx`
React component orchestrating game loop via `requestAnimationFrame`. Manages:
- Phase state machine (title → skillpick → playing → paused/levelup → result).
- Input: keyboard, mouse click, touch joystick, tap.
- Canvas rendering: title screen, skill pick cards, HUD, levelup overlay, result screen.
- Resize handler (contain scaling, 4:3 ratio).
- Language selector (EN/KO).

## MapleStory Skill Assets

| File | Skill | ID | Layers |
|------|-------|----|--------|
| `data/maple/skill_ENERGYBOLT.json` | Energy Bolt | 2001008 | effect(16f), ball(10f), hit(8f), icon |
| `data/maple/skill_CHAINLIGHTNING.json` | Chain Lightning | 2221006 | effect(16f), ball(9f), hit(9f), icon |
| `data/maple/skill_METEOR.json` | Meteor Shower | 2121007 | effect(14f), effect0(21f), hit(6f), icon |
| `data/maple/skill_POISONMIST.json` | Poison Mist | 2111003 | effect(18f), effect1(18f), hit(9f), icon |
| `data/maple/skill_SILVERHAWK.json` | Silver Hawk | 3111005 | hit(8f), summon(attack1/move/stand/die/summoned), icon |
| `data/maple/skill_GENESIS.json` | Genesis | 2321008 | effect(20f), effect0(20f), hit(8f), icon |
| `data/maple/skill_HOLYSYMBOL.json` | Holy Symbol | 2311003 | effect(19f), effect0(19f), affected(8f), affected0(8f), icon |

## MapleStory Mob Assets

| File | Mob | ID | States |
|------|-----|----|--------|
| `data/maple/mob_100100.json` | Green Snail | 100100 | stand, move, hit1, die1 |
| `data/maple/mob_100101.json` | Blue Snail | 100101 | stand, move, hit1, die1 |
| `data/maple/mob_1210102.json` | Orange Mushroom | 1210102 | stand, move, hit1, die1 |
| `data/maple/mob_2230101.json` | Zombie Mushroom | 2230101 | stand, move, hit1, die1 |
| `data/maple/mob_8130100.json` | Jr. Balrog | 8130100 | stand, move, hit1, die1 |
| `data/maple/mob_MUSHMOM.json` | Mushmom | mid-boss | stand, move, hit1, die1 |
| `data/maple/mob_ZMUSHMOM.json` | Zombie Mushmom | mid-boss | stand, move, hit1, die1 |

## MapleStory Character Assets

| File | Part | ID | States |
|------|------|----|--------|
| `data/maple/body_2000.json` | Body | 2000 | stand1, walk1 |
| `data/maple/head_12000.json` | Head | 12000 | stand1, walk1 |
| `data/maple/face_20000.json` | Face | 20000 | default |
| `data/maple/hair_30000.json` | Hair | 30000 | stand1, walk1 |
| `data/maple/weapon_STAFF.json` | Weapon (Staff) | — | stand1, walk1, swingO1, swingO2, swingO3 |
| `data/maple/coat_1040004.json` | Coat | 1040004 | stand1, walk1 |
| `data/maple/pants_1060040.json` | Pants | 1060040 | stand1, walk1 |
| `data/maple/shoes_1072850.json` | Shoes | 1072850 | stand1, walk1 |
