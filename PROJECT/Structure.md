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
│           ├── hair_37241.json           # Nova Bob Cut (hair)
│           ├── face_50547.json           # Kain Face A (face)
│           ├── acc_NOVA.json             # Black Feather Glasses (accessory)
│           ├── weapon_NOVA.json          # Abyss Shooter (weapon)
│           ├── weapon_STAFF.json         # Beginner Magician's Staff (AAT 6)
│           ├── coat_1040004.json         # Blue Training Shirt
│           ├── pants_1060040.json        # Blue Trainer Pants
│           ├── shoes_1072850.json        # Brand New Adventure Shoes
│           ├── cap_1001128.json           # Magician Hat
│           ├── cap_1002357.json           # Zakum Helmet
│           ├── cap_1002083.json           # Black Bandana
│           ├── cap_1003084.json           # Royal Crown
│           ├── cape_1102005.json          # Baby Angel Wings
│           ├── cap_1002357.json          # Zakum Helmet (cap)
│           ├── mob_100100.json           # Green Snail
│           ├── mob_100101.json           # Blue Snail
│           ├── mob_REDSNAIL.json         # Red Snail
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
│           ├── cape_1102005.json         # Baby Angel Wings cape
│           ├── skill_HOLYSYMBOL.json     # Holy Symbol orb sprites
│           ├── mob_DYLE.json             # Dyle boss
│           ├── mob_FAUST.json          # Faust boss
│           ├── mob_WB.json              # Wild Boar
│           ├── mob_FB.json              # Fire Boar
│           ├── mob_SG.json              # Stone Golem
│           └── mob_DS.json              # Dark Stump
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
| `data/maple/mob_REDSNAIL.json` | Red Snail | 130101 | stand, move, hit1, die1 |
| `data/maple/mob_1210102.json` | Orange Mushroom | 1210102 | stand, move, hit1, die1 |
| `data/maple/mob_2230101.json` | Zombie Mushroom | 2230101 | stand, move, hit1, die1 |
| `data/maple/mob_8130100.json` | Jr. Balrog | 8130100 | stand, move, hit1, die1 |
| `data/maple/mob_MUSHMOM.json` | Mushmom | mid-boss | stand, move, hit1, die1 |
| `data/maple/mob_ZMUSHMOM.json` | Zombie Mushmom | mid-boss | stand, move, hit1, die1 |
| `data/maple/mob_FAUST.json` | Faust | 5220002 | stand, move, hit1, die1, attack1, skill1 |
| `data/maple/mob_SL.json` | Slime | 210100 | stand, move, hit1, die1 |
| `data/maple/mob_ST.json` | Stump | 130100 | stand, move, hit1, die1 |
| `data/maple/mob_GM.json` | Green Mushroom | 1110100 | stand, move, hit1, die1 |
| `data/maple/mob_PG.json` | Pig | 1210100 | stand, move, hit1, die1 |
| `data/maple/mob_DYLE.json` | Dyle | 6220000 | stand, move, hit1, die1, skill1 |
| `data/maple/mob_WB.json` | Wild Boar | 2230102 | stand, move, hit1, die1 |
| `data/maple/mob_FB.json` | Fire Boar | 3210100 | stand, move, hit1, die1 |
| `data/maple/mob_SG.json` | Stone Golem | 5130101 | stand, move, hit1, die1 |
| `data/maple/mob_DS.json` | Dark Stump | 1110101 | stand, move, hit1, die1 |
| `data/maple/mob_OC.json` | Octopus | 1120100 | stand, move, hit1, die1 |
| `data/maple/mob_BB.json` | Bubbling | 1210103 | stand, move, hit1, die1 |
| `data/maple/mob_LG.json` | Ligator | 3110100 | stand, move, hit1, die1 |
| `data/maple/mob_WK.json` | Wild Cargo | 2600226 (sprite: 6230100) | stand, move, hit1, die1 |

## MapleStory Character Assets

| File | Part | ID | States |
|------|------|----|--------|
| `data/maple/body_2000.json` | Body | 2000 | stand1, walk1 |
| `data/maple/head_12000.json` | Head | 12000 | stand1, walk1 |
| `data/maple/face_20000.json` | Face | 20000 | default |
| `data/maple/hair_30000.json` | Hair | 30000 | stand1, walk1 |
| `data/maple/hair_37241.json` | Hair (Nova Bob Cut) | 37241 | stand1, walk1 |
| `data/maple/face_50547.json` | Face (Kain Face A) | 50547 | default |
| `data/maple/acc_NOVA.json` | Face Accessory (Black Feather Glasses) | 1022168 | stand1, walk1 |
| `data/maple/weapon_NOVA.json` | Weapon (Abyss Shooter) | 1492118 | stand1, walk1 |
| `data/maple/weapon_STAFF.json` | Weapon (Staff) | — | stand1, walk1, swingO1, swingO2, swingO3 |
| `data/maple/coat_1040004.json` | Coat | 1040004 | stand1, walk1 |
| `data/maple/pants_1060040.json` | Pants | 1060040 | stand1, walk1 |
| `data/maple/shoes_1072850.json` | Shoes | 1072850 | stand1, walk1 |
| `data/maple/cap_1001128.json` | Cap (Magician Hat) | 1001128 | stand1, walk1 |
| `data/maple/cap_1002357.json` | Cap (Zakum Helmet) | 1002357 | stand1, walk1 |
| `data/maple/cap_1002083.json` | Cap (Black Bandana) | 1002083 | stand1, walk1 |
| `data/maple/cap_1003084.json` | Cap (Royal Crown) | 1003084 | stand1, walk1 |
| `data/maple/cape_1102005.json` | Cape (Baby Angel Wings) | 1102005 | stand1, walk1 |
| `data/maple/hair_VAMPIRE.json` | Hair (Comma Hair) | 43282 | stand1, walk1 |
| `data/maple/face_VAMPIRE.json` | Face (Worrisome Glare) | 20008 | default |
| `data/maple/cap_VAMPIRE.json` | Cap (Devilish Horns) | 1002389 | stand1, walk1 |
| `data/maple/weapon_VAMPIRE.json` | Weapon (Dark Sword) | 1302904 | stand1, walk1 |
| `data/maple/cape_VAMPIRE.json` | Cape (Black Seraph Cape) | 1102030 | stand1, walk1 |
| `data/maple/coat_VAMPIRE.json` | Coat (Black Skull Hooded Vest) | 1042088 | stand1, walk1 |

## MapleStory Map Assets

| File | Map | ID | Type |
|------|-----|----|------|
| `data/maple/map_LITH.json` | Lith Harbor | 104000000 | Backgrounds + Tiles + Minimap |

| `data/maple/map_HENESYS.json` | Henesys | 100000000 | Minimap + 3 background layers from grassySoil_new |
| `data/maple/map_ELLINIA.json` | Ellinia | 101000000 | Minimap + 3 background layers from shineWood |
### map_LITH.json Details
- **Source**: Nexpace MSU Resource search → CDN fetch (save_render_plan unavailable for map category)
- **Contents**: 
  - 20 static background images from `vicportTown` back set (nos 0–19)
  - 1 foreground overlay from `Rien` back set (no 17)
  - 16 tile images from `whiteMarble` tileset (bsc, edD, edU, enH0, enH1, enV0, enV1, slLD, slLU, slRD, slRU)
  - 1 minimap canvas thumbnail
  - Full parallax layer config (19 back layers with rx/ry/type)
  - Map info (bounds, BGM, region)
- **CDN Base**: `https://resource-static.msu.io/data/`
- **Parallax Formula**: `screenX = x - cameraX * (100 + rx) / 100`


### map_ELLINIA.json Details
- **Source**: Nexpace MSU Resource search → direct CDN fetch
- **Contents**: 
  - 1 minimap canvas thumbnail (1612×2404)
  - 3 background layers from `shineWood` back set (nos 0, 7, 5 — near/medium/deep parallax)
  - Map info (bounds: -1003..567 × -1939..803, BGM: Bgm02/WhenTheMorningComes, town)
- **CDN Base**: `https://resource-static.msu.io/data/`
- **Use case**: Chapter select UI card backgrounds

| `data/maple/map_KERNING.json` | Kerning City | 103000000 | Minimap + 3 background layers from sunsetCity |

### map_KERNING.json Details
- **Source**: Nexpace MSU Resource search → direct CDN fetch
- **Contents**:
  - 1 minimap canvas thumbnail
  - 3 background layers from `sunsetCity` back set (nos 0, 1, ani:2 — distant skyline, mid-ground buildings, foreground animated)
  - Map info (map_id: 103000000, region: victoria, BGM: Bgm01/BadGuys)
- **CDN Base**: `https://resource-static.msu.io/data/`
- **Use case**: Chapter select UI card backgrounds for Kerning City theme


### map_PERION.json Details
- **Source**: Nexpace MSU Resource search → direct CDN fetch
- **Contents**:
  - 1 minimap canvas thumbnail (minimap)
  - 3 background layers from `dryRock` back set (nos 0, 1, 7 — base ground, mountain backdrop, foreground rocks)
  - Map info (map_id: 102000000, region: victoria, BGM: Bgm00/Nightmare)
- **CDN Base**: `https://resource-static.msu.io/data/`
- **Use case**: Chapter select UI card backgrounds for Perion theme
| `data/maple/mob_WM.json` | Cold Eye | 4230100 | stand, move, hit1, die1 |

| `data/maple/hair_DARK.json` | Hair (Spiky Hair) | 35527 | stand1, walk1 |
| `data/maple/face_DARK.json` | Face (Anger's Blaze) | 20510 | default |
