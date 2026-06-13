/**
 * AUTO-GENERATED system helper, managed by the runtime.
 * Restored automatically on the next prompt if missing.
 *
 * DO NOT EDIT — your changes will not propagate, and a future runtime
 * update may overwrite or fail to merge them.
 */

/**
 * Canonical MapleStory zmap, mirrored from `Character/zmap.json` on the
 * asset CDN. Stored back-to-front (low index = behind, high index =
 * in front). Sprite JSON `z` fields reference these names verbatim.
 *
 * 153 entries — DO NOT shrink this list. A hand-curated subset would
 * push every unrecognised z-name to back-most depth, producing the
 * "armour rendered behind body" / "weapon flipped to back" class of
 * bugs we hit before.
 *
 * The runtime preferred path is the LIVE zmap that ships in every
 * `get_sprite_data` response (the `zmap` field). Always pass that into
 * the helpers via `MapleSpriteOptions.zmap` so the renderer follows the
 * CDN's current order. Use this fallback ONLY when the live zmap was
 * `null` (CDN momentarily unreachable).
 */
export const ZMAP_FALLBACK: ReadonlyArray<string> = [
  "Bd", "Hd", "Hr", "Fc", "At", "Af", "Am", "Ae", "As", "Ay",
  "Cp", "Ri", "Gv", "Wp", "Si", "So", "Pn", "Ws", "Ma", "Wg",
  "Sr", "Tm", "Sd",
  "backTamingMobMid", "backMobEquipUnderSaddle", "backSaddle",
  "backMobEquipMid", "backTamingMobFront", "backMobEquipFront",
  "mobEquipRear", "tamingMobRear", "saddleRear", "characterEnd",
  "backWeapon", "backHairBelowHead", "backShieldBelowBody",
  "backMailChestAccessory", "backCapAccessory", "backAccessoryFace",
  "backAccessoryEar", "backBody", "backGlove", "backGloveWrist",
  "backWeaponOverGlove", "backMailChestBelowPants",
  "backPantsBelowShoes", "backShoesBelowPants", "backPants",
  "backShoes", "backPantsOverShoesBelowMailChest", "backMailChest",
  "backPantsOverMailChest", "backMailChestOverPants", "backHead",
  "backAccessoryFaceOverHead", "backAccessoryOverHead", "backCape",
  "backHairBelowCap", "backHairBelowCapNarrow",
  "backHairBelowCapWide", "backWeaponOverHead", "backCap",
  "backHair", "backCapOverHair", "backShield",
  "backWeaponOverShield", "backWing", "backHairOverCape",
  "weaponBelowBody", "hairBelowBody", "capeBelowBody",
  "shieldBelowBody", "capAccessoryBelowBody", "gloveBelowBody",
  "gloveWristBelowBody", "body", "gloveOverBody",
  "mailChestBelowPants", "pantsBelowShoes", "shoes", "pants",
  "mailChestOverPants", "shoesOverPants",
  "pantsOverShoesBelowMailChest", "shoesTop", "mailChest",
  "pantsOverMailChest", "mailChestOverHighest", "gloveWristOverBody",
  "mailChestTop", "weaponOverBody", "armBelowHead",
  "mailArmBelowHead", "armBelowHeadOverMailChest", "gloveBelowHead",
  "mailArmBelowHeadOverMailChest", "gloveWristBelowHead",
  "weaponOverArmBelowHead", "shield", "weapon", "arm", "hand",
  "glove", "mailArm", "gloveWrist", "cape", "head", "hairShade",
  "accessoryFaceBelowFace", "accessoryEyeBelowFace", "face",
  "accessoryFaceOverFaceBelowCap", "capBelowAccessory",
  "accessoryEar", "capAccessoryBelowAccFace", "accessoryFace",
  "accessoryEyeShadow", "accessoryEye", "hair", "cap",
  "capAccessory", "accessoryEyeOverCap", "hairOverHead",
  "accessoryOverHair", "accessoryEarOverHair", "capOverHair",
  "weaponBelowArm", "armOverHairBelowWeapon",
  "mailArmOverHairBelowWeapon", "armOverHair", "gloveBelowMailArm",
  "mailArmOverHair", "gloveWristBelowMailArm", "weaponOverArm",
  "handBelowWeapon", "gloveBelowWeapon", "gloveWristBelowWeapon",
  "shieldOverHair", "weaponOverHand", "handOverHair", "gloveOverHair",
  "gloveWristOverHair", "weaponOverGlove", "capeOverHead",
  "weaponWristOverGlove", "emotionOverBody", "characterStart",
  "tamingMobMid", "mobEquipUnderSaddle", "saddleFront",
  "mobEquipMid", "tamingMobFront", "mobEquipFront",
];

const _warnedUnknown = new Set<string>();

/**
 * Return the depth index of a z-name in the supplied zmap. Higher index
 * = drawn in front. Unknown names get -1 (will sort to the back-most
 * spot) and are warned once per name.
 *
 * Pass the LIVE zmap from `get_sprite_data().zmap` whenever you have it.
 * Pass `ZMAP_FALLBACK` only as a last-resort fallback.
 */
export function zIndex(
  z: string | undefined,
  zmap: ReadonlyArray<string>,
): number {
  if (!z) return -1;
  const i = zmap.indexOf(z);
  if (i === -1) {
    if (!_warnedUnknown.has(z)) {
      _warnedUnknown.add(z);
      try {
        // eslint-disable-next-line no-console
        console.warn(
          `[MapleSprite] unknown z-layer "${z}" — falling back to back-most. ` +
            `Likely a zmap update on the asset CDN; refresh the live zmap or ` +
            `update ZMAP_FALLBACK.`,
        );
      } catch {}
    }
    return -1;
  }
  return i;
}
