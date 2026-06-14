<!--
  AUTO-GENERATED system helper bundle.
  Restored automatically on the next prompt if missing.

  These files live under your project at `src/__system__/maple/` so they
  ride alongside your code in builds, but they are owned by the runtime.
  Treat this directory as read-only; build a sibling instead if you need
  custom behaviour.
-->

# MapleStory Render Helpers (system bundle)

A small Phaser-targeted render runtime that consumes the
`render_plan` + `zmap` produced by the `maple-lookup` MCP server and
renders MapleStory characters / mobs / NPCs / skill effects.

Read `maple-rendering`, `maple-character-rendering`, `maple-mob-structure`,
and `maple-skill-effects` skills for the full visual contract — this
helper is a **starter that handles ~80% of standard cases**, not a
complete substitute for understanding the rules.

## What's in here

| File | Purpose |
|------|---------|
| `MapleSprite.ts` | Multi-part character rig + single-part actor (mob / NPC). Handles socket attach, flip, zmap z-order, ZigZag / play-once / sequential animations, weapon attack-state navel switch, VSlot masking, mounted sit posture. |
| `MapleSkillEffect.ts` | Skill-layer renderer (effect / effect0..5 / hit / ball / affected) with caster / target / affected anchors. |
| `MapleAssetLoader.ts` | `queueRenderPlan(scene, cdnBase, plan)` — Phaser load helper. Plus grouping/lookup utilities. |
| `aat-table.ts` | Attack-Action-Type pool table, walk/stand selection, ZigZag state set. |
| `vslot.ts` | `cap.info.vslot` masking. |
| `zmap-fallback.ts` | 153-entry baked-in zmap. Always pass the LIVE `response.zmap` instead when available. |
| `types.ts` | Shared types (`RenderPlanEntry`, `WeaponInfo`, `CapInfo`, `Vec2`, `ZMap`). |

## Minimal usage — character

```ts
import {
  MapleSprite,
  queueRenderPlan,
} from "./__system__/maple";

class GameScene extends Phaser.Scene {
  preload() {
    // `data` is the full payload from a `maple-character` subagent
    // RESULT block: { cdn_base, render_plan, zmap, weapon_info, cap_info }.
    queueRenderPlan(this, data.cdn_base, data.render_plan);
  }

  create() {
    this.player = new MapleSprite(this, 400, 300, data.render_plan, {
      scale: 1,
      facing: "left",            // ← preferred over `flip: false`
      zmap: data.zmap,           // pass live zmap from response
      weapon: data.weapon_info,  // { attack: 1, walk: 1, stand: 1 }
      cap: data.cap_info,        // { vslot: "CpHdH1H5" }
    });
  }

  update(t: number, dt: number) {
    this.player.tick(t, dt);
  }

  // Direction handling — USE setFacing, NOT setFlip:
  moveLeft()  { this.player.setFacing("left");  this.player.setAction("walk1"); }
  moveRight() { this.player.setFacing("right"); this.player.setAction("walk1"); }
}
```

### `setFacing` vs `setFlip`

`setFlip(boolean)` is a low-level mirror flag and is the single most
common source of "left/right reversed" bugs. Use `setFacing` instead:

| Intent | `setFacing` | `setFlip` (legacy) |
|---|---|---|
| Sprite faces left (default) | `setFacing("left")` | `setFlip(false)` |
| Sprite faces right (mirrored) | `setFacing("right")` | `setFlip(true)` |

`setFlip(true)` does NOT mean "facing left" — it means "mirror
applied", and since sprites are LEFT-facing by default, mirroring
makes them face RIGHT. Always prefer `setFacing`.

## Minimal usage — mob (single-part actor)

The same class handles single-part sprites (one PNG per frame). Pass
the mob's render plan in.

```ts
const snail = new MapleSprite(this, x, y, mobData.render_plan, {
  scale: 1,
  zmap: mobData.zmap,
  initialAction: "stand",
});
snail.onActionComplete = (state) => {
  if (state === "die1") snail.destroy();
  else if (state === "hit1") snail.setAction("move");
};
```

## Skill effect

```ts
const cast = new MapleSkillEffect(this, skill.render_plan, {
  layer: "effect",
  anchor: "caster",
  flip: player.flipped,
  zmap: skill.zmap,
});
cast.anchor = { x: player.x, y: player.y };
cast.baseDepth = player.depth;
cast.onComplete = () => cast.destroy();
// in update:  cast.tick(t, dt);
```

## What the helper does NOT do

These are explicitly **LLM territory** — read the relevant skill and
write the code yourself.

- **Multi-part boss mobs** (Horntail-style 8810000..8810009 assemblies).
  `MapleAssetLoader.findPlaceholderTextures(scene, plan)` flags 1×1
  placeholder PNGs so you can detect and skip them.
- **Mount + saddle composition** (`maple-tamingmob-structure`). Render
  the mount with one MapleSprite, set the rider with `mounted: true`, and
  stack the containers on the same scene. The renderer hides arm/weapon
  in mounted mode.
- **Map foothold / portal / parallax / tile placement.** The map data is
  structural, not sprite — see `maple-map`.
- **Skill compositing** when `effect`, `effect0..5`, `hit`, `ball`, and
  `affected` all overlap — instantiate one MapleSkillEffect per layer
  and stack them.
- **Spine-animated mobs** (`aniName` field instead of `_path`). Out of
  scope for a PNG-only renderer.
- **Custom shaders / tints / damage popups / combat math.** Engine logic.

## Why pass `zmap` from the response

The asset CDN ships `zmap.json` separately from sprite JSONs. The
helper bakes a 153-entry fallback in `zmap-fallback.ts`, but new
z-names land on the CDN occasionally and a stale fallback would push
them to the back-most layer (the "armour rendered behind body" class
of bug). The maple-lookup MCP includes the live zmap in every
`get_sprite_data` response — pass that into `MapleSpriteOptions.zmap`
to keep z-order in sync with the CDN.
