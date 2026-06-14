/**
 * AUTO-GENERATED system helper, managed by the runtime.
 * Restored automatically on the next prompt if missing.
 *
 * DO NOT EDIT — your changes will not propagate, and a future runtime
 * update may overwrite or fail to merge them.
 */

/**
 * VSlot is a 2-character-code mask string (e.g. `"CpHdH1H5"`) found on
 * `cap.info.vslot`, `coat.info.vslot`, etc. When the equipped item's
 * VSlot includes the code of another part, that part is HIDDEN —
 * implemented by skipping the render call for it.
 *
 * Common codes from the asset data's `smap.json`:
 *   Cp           cap itself
 *   Hd           head
 *   H1..H6       hair regions (front, side, back, ...)
 *   Hs Hf Hb     hair sub-types (straight / fluffy / band)
 *   Af Ay As Ae  accessory types (face / eye / shadow / ear)
 *   Sd           saddle
 *
 * Reference: `maple-character-rendering.md` "VSlot masking" section.
 */

/** Parse a VSlot string into its 2-character codes. */
export function parseVSlot(vslot: string | undefined): string[] {
  if (!vslot || typeof vslot !== "string") return [];
  return vslot.match(/.{1,2}/g) ?? [];
}

/**
 * Map a render-plan part name (`hair`, `hairOverHead`, `hairBelowCap`,
 * `head`, `accessoryFace`, `accessoryEar`, ...) to the VSlot codes that
 * would mask it.
 *
 * The map is not 1:1 — most cap masks target hair regions H1..H6 which
 * are enumerated in the hair JSON itself, not in our part name. So this
 * helper takes the conservative stance: a cap whose VSlot covers ALL of
 * H1..H6 hides every hair part; a partial cover only hides what we can
 * resolve confidently.
 *
 * For full accuracy at runtime, surface `cap.info.vslot` from the cap
 * sprite JSON's `info` block to the renderer (we expose this via
 * `MapleSpriteOptions.capVSlot`), then test
 * `isMaskedByCap(part, capVSlot)` on each hair/head/accessory entry
 * before rendering.
 */
const PART_TO_VSLOT_CODES: Readonly<Record<string, ReadonlyArray<string>>> = {
  // Head — covered by `Hd`.
  head:                ["Hd"],
  backHead:            ["Hd"],

  // Hair — covered by any H-code variant. Cap.info.vslot may list one
  // or several. Because part names like "hair" / "hairOverHead" don't
  // tell us *which* hair region they belong to, we mask hair if the cap
  // covers any H-region — that's the standard cap-on rule.
  hair:                ["H1", "H2", "H3", "H4", "H5", "H6", "Hs", "Hf", "Hb"],
  hairOverHead:        ["H1", "H2", "H3", "H4", "H5", "H6", "Hs", "Hf", "Hb"],
  hairBelowCap:        ["H1", "H2", "H3", "H4", "H5", "H6", "Hs", "Hf", "Hb"],
  hairBelowCapNarrow:  ["H1", "H2", "H3", "H4", "H5", "H6", "Hs", "Hf", "Hb"],
  hairBelowCapWide:    ["H1", "H2", "H3", "H4", "H5", "H6", "Hs", "Hf", "Hb"],
  hairShade:           ["H1", "H2", "H3", "H4", "H5", "H6", "Hs", "Hf", "Hb"],
  backHair:            ["H1", "H2", "H3", "H4", "H5", "H6", "Hs", "Hf", "Hb"],
  backHairBelowCap:    ["H1", "H2", "H3", "H4", "H5", "H6", "Hs", "Hf", "Hb"],
  backHairBelowHead:   ["H1", "H2", "H3", "H4", "H5", "H6", "Hs", "Hf", "Hb"],
  backHairOverCape:    ["H1", "H2", "H3", "H4", "H5", "H6", "Hs", "Hf", "Hb"],

  // Face accessories.
  accessoryFace:       ["Af"],
  accessoryEye:        ["Ay"],
  accessoryEyeShadow:  ["As"],
  accessoryEar:        ["Ae"],
  accessoryEarOverHair:["Ae"],
  accessoryOverHair:   ["Af", "Ay", "As", "Ae"],
};

/**
 * Real accessory render-plan entries arrive with `part: "default"`
 * (cap / face acc / eye acc / earring all use the same part name),
 * so the part-name table above can't tell them apart. The accessory's
 * `z` field IS unique — `accessoryFace`, `accessoryEye`,
 * `accessoryEar`, etc. — so we mirror the same vslot rules under z.
 */
const Z_TO_VSLOT_CODES: Readonly<Record<string, ReadonlyArray<string>>> = {
  accessoryFace:                 ["Af"],
  accessoryFaceBelowFace:        ["Af"],
  accessoryFaceOverFaceBelowCap: ["Af"],
  accessoryEye:                  ["Ay"],
  accessoryEyeBelowFace:         ["Ay"],
  accessoryEyeOverCap:           ["Ay"],
  accessoryEyeShadow:            ["As"],
  accessoryEar:                  ["Ae"],
  accessoryEarOverHair:          ["Ae"],
  accessoryOverHair:             ["Af", "Ay", "As", "Ae"],
  hair:                          ["H1", "H2", "H3", "H4", "H5", "H6", "Hs", "Hf", "Hb"],
  hairOverHead:                  ["H1", "H2", "H3", "H4", "H5", "H6", "Hs", "Hf", "Hb"],
  hairShade:                     ["H1", "H2", "H3", "H4", "H5", "H6", "Hs", "Hf", "Hb"],
  hairBelowBody:                 ["H1", "H2", "H3", "H4", "H5", "H6", "Hs", "Hf", "Hb"],
  backHair:                      ["H1", "H2", "H3", "H4", "H5", "H6", "Hs", "Hf", "Hb"],
  backHairBelowCap:              ["H1", "H2", "H3", "H4", "H5", "H6", "Hs", "Hf", "Hb"],
  backHairBelowHead:             ["H1", "H2", "H3", "H4", "H5", "H6", "Hs", "Hf", "Hb"],
  backHairOverCape:              ["H1", "H2", "H3", "H4", "H5", "H6", "Hs", "Hf", "Hb"],
  head:                          ["Hd"],
  backHead:                      ["Hd"],
};

/**
 * Decide whether a part should be hidden because the equipped cap
 * (or any other VSlot-bearing item) covers it.
 *
 * Tries the part-name table first (works for hair / head where the
 * part name is descriptive). Falls back to the z-based table for
 * accessories whose part name is the generic `"default"` but whose
 * z field carries the real category.
 *
 * Pass `vslotCodes` from `parseVSlot(item.info.vslot)`. `z` is
 * optional — when present, enables accessory masking.
 */
export function isMaskedByVSlot(
  partName: string,
  vslotCodes: ReadonlyArray<string>,
  z?: string,
): boolean {
  if (vslotCodes.length === 0) return false;
  const partTriggers = PART_TO_VSLOT_CODES[partName];
  if (partTriggers) {
    for (const code of partTriggers) {
      if (vslotCodes.includes(code)) return true;
    }
  }
  if (z) {
    const zTriggers = Z_TO_VSLOT_CODES[z];
    if (zTriggers) {
      for (const code of zTriggers) {
        if (vslotCodes.includes(code)) return true;
      }
    }
  }
  return false;
}
