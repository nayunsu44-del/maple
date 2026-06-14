/**
 * AUTO-GENERATED system helper, managed by the runtime.
 * Restored automatically on the next prompt if missing.
 *
 * DO NOT EDIT — your changes will not propagate, and a future runtime
 * update may overwrite or fail to merge them.
 */

import type { WeaponInfo } from "./types";

/**
 * Attack-Action-Type (AAT) → body-action pool.
 *
 * `weapon.info.attack` (1..17) selects which set of body actions the
 * character cycles through for normal attacks. Mismatched AAT → wrong
 * body pose for the weapon (sword swing on a wand, etc.). Per
 * `maple-character-rendering.md` AAT table.
 */
export const AAT_POOLS: Readonly<Record<number, ReadonlyArray<string>>> = {
  1:  ["swingO1", "swingO2", "swingO3", "stabO1", "stabO2"],         // 1H Sword/Axe/Mace
  2:  ["swingT2", "swingP1", "swingP2", "stabT1", "stabT2"],         // Spear / Polearm
  3:  ["swingT1", "swingT3"],                                        // Bow
  4:  ["swingT1", "stabT1"],                                         // CrossBow
  5:  ["swingT1", "swingT2", "swingT3", "stabO1", "stabO2"],         // 2H Sword/Axe/Mace
  6:  ["swingO2"],                                                   // Staff / Wand / Rod
  7:  ["stabO1", "stabO2"],                                          // Throwing Glove (Claw)
  8:  ["stabO1", "stabO2"],                                          // Knuckle
  9:  ["swingT1", "swingT2"],                                        // Gun
  10: ["swingD1", "swingD2", "stabD1"],                              // Dual Dagger
  11: ["swingDB1", "swingDB2"],                                      // Dual Bowgun
  12: ["swingC1", "swingC2"],                                        // Hand Cannon
  13: ["stabO1", "stabO2"],                                          // Cane (Phantom)
  14: ["stabO1"],                                                    // Soul Shooter
  15: ["swingO1", "swingO3", "stabO1"],                              // Katana (Hayato)
  16: ["swingO1", "swingO2", "swingO3", "stabO1"],                   // Fan (Hoyoung / Kanna)
  17: ["swingO1", "swingO2"],                                        // Breath Shooter (Kain)
};

/**
 * Generic prefix check used by the renderer to decide whether the
 * weapon attaches at body.navel (attack states) instead of arm.hand
 * (idle/move).
 */
export function isAttackAction(action: string): boolean {
  return (
    action.startsWith("swing") ||
    action.startsWith("stab") ||
    action.startsWith("shoot")
  );
}

/**
 * Choose the body action for a normal attack given the equipped weapon.
 *
 * `pickIndex` lets you cycle through the AAT pool deterministically
 * across consecutive attacks (clamped to pool length). When `pickIndex`
 * is omitted, returns the first entry.
 *
 * Throwing-glove / claw weapons (WT_THROWINGGLOVE = 47) historically
 * shipped without `info.attack` — they fall back to `shoot1` per
 * `maple-character-rendering.md` claw fallback.
 */
export function pickAttackAction(
  weapon: WeaponInfo | number | undefined,
  pickIndex = 0,
): string {
  // Accept a raw AAT code as the first arg too — agents tend to pass
  // `weapon.info.attack` (a number) by analogy with the AAT table.
  // Wrap it into a WeaponInfo automatically.
  if (typeof weapon === "number") weapon = { attack: weapon };
  if (!weapon) return "stand1";

  // Throwing glove (claw) fallback when AAT is missing.
  if (weapon.weaponType === 47 && (weapon.attack === undefined || weapon.attack === 0)) {
    return "shoot1";
  }

  const pool = weapon.attack !== undefined ? AAT_POOLS[weapon.attack] : undefined;
  if (!pool || pool.length === 0) return "stand1";
  return pool[pickIndex % pool.length] ?? pool[0];
}

/**
 * Walk-action selector. `weapon.info.walk == 1` → walk1, else walk2.
 * No weapon → walk1 default.
 */
export function pickWalkAction(weapon: WeaponInfo | undefined): "walk1" | "walk2" {
  if (!weapon) return "walk1";
  return weapon.walk === 1 ? "walk1" : "walk2";
}

/**
 * Stand-action selector. `weapon.info.stand == 1` → stand1, else stand2.
 * No weapon → stand1 default.
 */
export function pickStandAction(weapon: WeaponInfo | undefined): "stand1" | "stand2" {
  if (!weapon) return "stand1";
  return weapon.stand === 1 ? "stand1" : "stand2";
}

/**
 * Body-action states that ping-pong (zigzag) between first and last
 * frame. All other states play sequentially.
 */
export const ZIGZAG_STATES: ReadonlySet<string> = new Set([
  "stand1", "stand2", "alert", "ghoststand",
]);

/**
 * Body-action states that play exactly once. The renderer should
 * surface a "completed" event so the game logic can despawn (`die1`)
 * or fall back to the prior state (`hit1`).
 */
export const PLAY_ONCE_STATES: ReadonlySet<string> = new Set([
  "die1", "hit1",
]);

/**
 * States that play once and trigger entity removal on completion.
 * (Subset of PLAY_ONCE_STATES.)
 */
export const PLAY_ONCE_DESPAWN_STATES: ReadonlySet<string> = new Set([
  "die1",
]);
