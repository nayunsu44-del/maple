/**
 * AUTO-GENERATED system helper, managed by the runtime.
 * Restored automatically on the next prompt if missing.
 *
 * DO NOT EDIT — your changes will not propagate, and a future runtime
 * update may overwrite or fail to merge them. If different behaviour is
 * needed, create a sibling file OUTSIDE `src/__system__/` and import that
 * instead.
 */

/** A 2D point used for origin offsets and socket coordinates. */
export interface Vec2 {
  x: number;
  y: number;
}

/**
 * One renderable PNG, fully resolved by the asset-lookup runtime.
 *
 * `texture_key` is the canonical Phaser texture key — use it as-is when
 * calling `load.image(key, url)` and later `setTexture(key)`. Inventing
 * your own key risks load/render mismatch.
 *
 * The shape is identical to what `get_sprite_data(...).render_plan`
 * emits, so RenderPlanEntry instances can be passed straight through
 * from the maple-lookup MCP response into these helpers.
 */
export interface RenderPlanEntry {
  state: string;
  frame: string;
  part: string;
  /** Path relative to `cdn_base` (no `.json`/`.img` suffix). */
  path: string;
  origin: Vec2;
  /** zmap layer name; used for back-to-front sort. */
  z?: string;
  /** Attachment points keyed by name (e.g. `navel`, `neck`, `brow`, `hand`). */
  sockets?: Record<string, Vec2>;
  /** Canonical Phaser texture key. */
  texture_key: string;
  /** Per-frame display delay in ms; absent on still frames. */
  delay?: number;
}

/**
 * Live zmap from the asset CDN (back-to-front, low index = behind).
 * `null` means the CDN fetch failed at lookup time — consumers should
 * use the baked-in fallback in `./zmap-fallback`.
 */
export type ZMap = ReadonlyArray<string> | null;

/** Optional weapon metadata used to drive attack-action selection. */
export interface WeaponInfo {
  /** AAT code from `weapon.info.attack` (1..17). */
  attack?: number;
  /** Selects walk1 vs walk2 (`weapon.info.walk`). */
  walk?: number;
  /** Selects stand1 vs stand2 (`weapon.info.stand`). */
  stand?: number;
  /** Weapon-type code from `weapon.info.weaponType`. Used only for the
   *  WT_THROWINGGLOVE (47) shoot-fallback. */
  weaponType?: number;
}

/** Optional cap metadata for VSlot masking (`cap.info.vslot`). */
export interface CapInfo {
  /** VSlot mask string e.g. `"CpHdH1H5"`. Each 2-character code names a
   *  hair/head/accessory variant the cap covers. */
  vslot?: string;
}

/**
 * Character race — controls which ear variant in the head sprite
 * gets rendered. The head sprite ALWAYS ships four ear parts in
 * one frame (`ear`, `humanEar`, `lefEar`, `highlefEar`); rendering
 * all of them produces overlapping ears. Per `maple-character-rendering`
 * line 127, the "default" rendering is `head` + `ear` only, and the
 * race-specific variants activate under specific hair/cap vslot
 * conditions. We expose the choice as an explicit option.
 *
 *   "human"   → humanEar    (hairShade z; the common case for player chars)
 *   "lef"     → lefEar      (Cygnus / Resistance lef-elf characters)
 *   "highlef" → highlefEar  (high-elf races)
 *   "default" → ear         (universal fallback, no race tagging)
 */
export type CharacterRace = "human" | "lef" | "highlef" | "default";

/**
 * Self-documenting facing direction. MapleStory sprites are
 * LEFT-facing by default; passing `"right"` mirrors the rig
 * horizontally. Prefer this over the boolean `flip` flag — the
 * `setFlip(boolean)` API is preserved for backward compatibility,
 * but its semantics ("flip = mirror, NOT facing") have caused
 * direction-reversal bugs in the wild.
 */
export type Facing = "left" | "right";

/**
 * Grouped lookup table for a render plan: `state → frame → part → entry`.
 * Built once by `groupRenderPlan` and consumed by the renderer every tick.
 */
export type GroupedPlan = Record<
  string,
  Record<string, Record<string, RenderPlanEntry>>
>;
