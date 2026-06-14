/**
 * AUTO-GENERATED system helper, managed by the runtime.
 * Restored automatically on the next prompt if missing.
 *
 * This barrel re-exports the public surface of the MapleStory render
 * helpers. Import from `./__system__/maple` from your scene code:
 *
 *   import {
 *     MapleSprite,
 *     MapleSkillEffect,
 *     queueRenderPlan,
 *     ZMAP_FALLBACK,
 *   } from "./__system__/maple";
 */

export type {
  CapInfo,
  CharacterRace,
  Facing,
  GroupedPlan,
  RenderPlanEntry,
  Vec2,
  WeaponInfo,
  ZMap,
} from "./types";

export {
  AAT_POOLS,
  PLAY_ONCE_DESPAWN_STATES,
  PLAY_ONCE_STATES,
  ZIGZAG_STATES,
  isAttackAction,
  pickAttackAction,
  pickStandAction,
  pickWalkAction,
} from "./aat-table";

export { isMaskedByVSlot, parseVSlot } from "./vslot";

export { ZMAP_FALLBACK, zIndex } from "./zmap-fallback";

export {
  filterRenderPlan,
  findEntry,
  findPlaceholderTextures,
  frameIndicesForState,
  groupRenderPlan,
  queueRenderPlan,
  statesInPlan,
} from "./MapleAssetLoader";

export { MapleSprite } from "./MapleSprite";
export type { FrameEventHandler, MapleSpriteOptions } from "./MapleSprite";

export { MapleSkillEffect } from "./MapleSkillEffect";
export type { EffectAnchor, MapleSkillEffectOptions } from "./MapleSkillEffect";

export {
  backgroundDepth,
  findFoothold,
  footholdY,
  isTilingBackground,
  objDepth,
  parallaxScreenX,
  parallaxScreenY,
  tileDepth,
} from "./MapleMapLayout";
export type { Foothold } from "./MapleMapLayout";
