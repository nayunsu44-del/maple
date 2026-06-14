/**
 * AUTO-GENERATED system helper, managed by the runtime.
 * Restored automatically on the next prompt if missing.
 *
 * DO NOT EDIT — your changes will not propagate, and a future runtime
 * update may overwrite or fail to merge them. If different behaviour is
 * needed, create a sibling file OUTSIDE `src/__system__/` and import that
 * instead.
 */

import type Phaser from "phaser";
import type { GroupedPlan, RenderPlanEntry } from "./types";

// Warn-once registry for path/url fix-ups. Keeps the console clean
// when many entries share the same defect.
const _warnedPathFix = new Set<string>();

function warnOnce(key: string, message: string): void {
  if (_warnedPathFix.has(key)) return;
  _warnedPathFix.add(key);
  try {
    // eslint-disable-next-line no-console
    console.warn(message);
  } catch {}
}

/**
 * Defensive path normalization. The render_plan emitted by the
 * maple-lookup MCP is always correct, but the data sometimes makes a
 * detour through hand-written RESULT blocks where two failure modes
 * recur:
 *
 *   1. cdn_base ends with `/` AND path begins with `/` — produces
 *      `cdn_base//path` and a 404. We strip leading slashes from path
 *      and trailing slashes from base before joining.
 *
 *   2. The last directory delimiter before the filename gets typoed
 *      as a `.` — `stand1/0.body.png` instead of `stand1/0/body.png`.
 *      We auto-correct the trailing `<digits>.<word>.png` pattern,
 *      since digits-as-frame-index plus part-name is the canonical
 *      MapleStory layout and this misformat NEVER resolves to a real
 *      asset.
 *
 * Each correction warns once so an upstream fix can land in the
 * source (subagent prompt, hand-written data file, etc).
 */
function buildAssetUrl(cdnBase: string, rawPath: string): string {
  const base = cdnBase.replace(/\/+$/g, "");
  let path = rawPath.replace(/^\/+/g, "");

  // Auto-correct `0.body.png` → `0/body.png` (frame.part.png typo).
  // Only fires on the trailing segment to avoid disturbing real
  // dotted directory names elsewhere in the path.
  const dotted = /\/(\d+)\.([a-zA-Z]+)\.(png|jpg|webp)$/;
  if (dotted.test(path)) {
    const fixed = path.replace(dotted, "/$1/$2.$3");
    warnOnce(
      `pathfix:${path}`,
      `[MapleAssetLoader] auto-corrected "${path}" → "${fixed}". ` +
        `The trailing "<frame>.<part>.<ext>" form is a hand-written typo; ` +
        `real CDN paths use "<frame>/<part>.<ext>". Fix the source RESULT block.`,
    );
    path = fixed;
  }

  return `${base}/${path}`;
}

/**
 * Queue every PNG referenced by `render_plan` onto the given Phaser
 * load queue. Idempotent — keys already present in the texture cache
 * are skipped, so calling this from multiple preload sources is safe.
 *
 * Call from a Phaser preload(); this does NOT call `load.start()`.
 *
 * Placeholder PNGs (1×1, ≤70 bytes) are still queued — they exist on
 * the CDN, just are visually empty. Detect and surface them after load
 * via `findPlaceholderTextures()` if you need to react.
 *
 * Performs defensive URL normalization (trailing/leading slash trim,
 * `<frame>.<part>.png` typo auto-correct) so a stale or hand-written
 * data block doesn't 404 every asset in the project.
 */
export function queueRenderPlan(
  scene: Phaser.Scene,
  cdnBase: string,
  renderPlan: ReadonlyArray<RenderPlanEntry>,
): void {
  if (!cdnBase) {
    // eslint-disable-next-line no-console
    console.warn("[MapleAssetLoader] queueRenderPlan: cdnBase is empty.");
    return;
  }
  if (/\/$/.test(cdnBase)) {
    warnOnce(
      `cdnbase:${cdnBase}`,
      `[MapleAssetLoader] cdn_base ends with "/" — concatenation would ` +
        `produce a "//" path. Trimming defensively, but the source data ` +
        `should drop the trailing slash so URLs are clean at the source.`,
    );
  }
  for (const entry of renderPlan) {
    if (!entry || !entry.texture_key || !entry.path) continue;
    if (scene.textures.exists(entry.texture_key)) continue;
    scene.load.image(entry.texture_key, buildAssetUrl(cdnBase, entry.path));
  }
}

/**
 * Group render-plan entries into a fast lookup table:
 * `state → frame → part → entry`. The renderer uses this every
 * animation tick instead of scanning the flat array.
 *
 * Cross-state fallback for cosmetic-only parts:
 * MapleStory `face` and some hair sprites have no action states
 * (stand1 / walk1 / etc.) — they expose only `default` (and other
 * facial-expression states like `smile`, `blink`). When a face JSON
 * gets merged with body/head/equipment JSONs that DO have action
 * states, naively grouping by `(state, frame, part)` puts the face
 * entry into `default.0.face` only — and `walk1.0` ends up with no
 * `face` key, so the renderer skips it.
 *
 * Detect this case: any part that appears ONLY in cosmetic-style
 * states (default / smile / blink / etc.) gets propagated to every
 * action state's frame "0". The renderer's frameMap lookup then
 * always finds the face, regardless of which action is active.
 *
 * Action-style states are recognised by name: any state present in
 * the plan that is NOT in the cosmetic set below counts as action.
 * Once at least one action state exists, every part that's exclusive
 * to cosmetic states gets the cross-state injection.
 */
const COSMETIC_FACE_STATES: ReadonlySet<string> = new Set([
  "default",
  "blink",
  "smile",
  "angry",
  "sad",
  "cry",
  "wink",
  "hum",
  "love",
  "shine",
  "stunned",
  "troubled",
  "vomit",
  "pain",
  "bewildered",
  "blaze",
  "bowing",
  "cheers",
  "chu",
  "dam",
  "despair",
  "glitter",
  "hit",
  "hot",
  "oops",
  "qBlue",
]);

export function groupRenderPlan(
  renderPlan: ReadonlyArray<RenderPlanEntry>,
): GroupedPlan {
  const out: GroupedPlan = {};
  // First pass — straight (state, frame, part) grouping.
  // Part-name collisions are deduped by appending the entry's `z` —
  // cap.default (z=cap), accessoryFace.default (z=accessoryFace),
  // accessoryEye.default (z=accessoryEyeOverCap), earring.default
  // (z=accessoryEar) all coexist with stable, frame-independent keys
  // (`default`, `default@accessoryFace`, `default@accessoryEyeOverCap`,
  // `default@accessoryEar`). Without this, the second-imported "default"
  // overwrites the first and the user sees only one of their accessories.
  // Using z (rather than a `#N` insertion-order suffix) keeps the key
  // identical across frames, so the persistent sprite Map in MapleSprite
  // doesn't fork into duplicate sprite objects per frame.
  for (const e of renderPlan) {
    if (!e) continue;
    const byFrame = (out[e.state] ??= {});
    const byPart = (byFrame[e.frame] ??= {});
    let key = e.part;
    if (byPart[key]) {
      key = e.z ? `${e.part}@${e.z}` : `${e.part}#${Object.keys(byPart).length}`;
      // If even that collides (extremely rare — same part + same z)
      // bump with a numeric suffix until unique.
      let n = 1;
      while (byPart[key]) {
        key = `${e.part}@${e.z ?? "noz"}#${n}`;
        n++;
      }
    }
    byPart[key] = e;
  }

  // Second pass — cross-state fallback for parts that live ONLY in
  // cosmetic states. Find every part name and the state set it
  // appears in. If that set is entirely inside COSMETIC_FACE_STATES,
  // and the plan has at least one action state, inject the part's
  // primary entry (preferring `default`) into every action state's
  // frame "0".
  const partStates = new Map<string, Set<string>>();
  for (const e of renderPlan) {
    if (!e) continue;
    const set = partStates.get(e.part) ?? new Set<string>();
    set.add(e.state);
    partStates.set(e.part, set);
  }
  const allStates = Object.keys(out);
  const actionStates = allStates.filter((s) => !COSMETIC_FACE_STATES.has(s));
  if (actionStates.length === 0) return out;

  for (const [part, states] of partStates) {
    const onlyCosmetic = [...states].every((s) => COSMETIC_FACE_STATES.has(s));
    if (!onlyCosmetic) continue;
    // Pick the primary cosmetic entry — prefer `default`, else first.
    const sourceState = states.has("default") ? "default" : [...states][0];
    if (!sourceState) continue;
    const sourceFrame = out[sourceState]?.["0"];
    const sourceEntry = sourceFrame?.[part];
    if (!sourceEntry) continue;
    // Inject into EVERY frame of every action state, not just frame "0".
    // The renderer uses `stateMap[currentFrame]`, so injecting only
    // frame 0 makes the cosmetic part flicker — visible on frame 0,
    // gone on frames 1/2/3 as the action animation progresses.
    for (const action of actionStates) {
      const byFrame = (out[action] ??= {});
      const frameKeys = Object.keys(byFrame);
      // Walk every existing frame number for this action; if no frames
      // exist yet (rare — action with no entries), at least seed "0".
      const targets = frameKeys.length > 0 ? frameKeys : ["0"];
      for (const fk of targets) {
        const frameMap = (byFrame[fk] ??= {});
        if (!frameMap[part]) frameMap[part] = sourceEntry;
      }
    }
  }

  // Third pass — cross-state fallback for MOTION parts (head, hair, cap,
  // glove, ...) that exist in *some* action states but are missing from
  // others. The canonical failure case: a subagent dispatches
  // save_render_plan for body / cape with the new weapon's AAT pool
  // (swingT1/T2/T3) but reuses the previous AAT pool's states
  // (swingO1/O2) for head / hair. Without this fallback, an entire body
  // part vanishes during the new swing animation, and any parts that
  // hang off it (face attached to head's brow socket) vanish with it.
  //
  // Fallback policy: inject the part's `stand1` (then walk1, then any
  // other state it has) "frame 0" entry into every frame of the missing
  // action. The socket offsets won't match the swing pose perfectly, but
  // the part stays visible — far better than a blank head + floating
  // weapon. Emits ONE console.warn per (part, missing action) so dev
  // builds surface the AAT inconsistency without spamming.
  const STAND_PREF = ["stand1", "stand", "walk1", "stand2", "walk2"];
  const warned = new Set<string>();
  for (const [part, presentStates] of partStates) {
    const motionStates = [...presentStates].filter(
      (s) => !COSMETIC_FACE_STATES.has(s),
    );
    if (motionStates.length === 0) continue; // cosmetic-only — handled above

    // Only fall back when the part exists in a stand/walk pose. Parts
    // limited to specific actions on purpose (armOverHair, hairOverHead,
    // gloveOverHair, weapon-attack-state-only socket variants, etc.)
    // are SUPPOSED to be absent from stand1, so finding no stand pose
    // means we shouldn't propagate them everywhere either.
    let sourceState: string | undefined;
    for (const candidate of STAND_PREF) {
      if (presentStates.has(candidate)) {
        sourceState = candidate;
        break;
      }
    }
    if (!sourceState) continue;
    const sourceEntry = out[sourceState]?.["0"]?.[part];
    if (!sourceEntry) continue;

    for (const action of actionStates) {
      if (presentStates.has(action)) continue; // part already exists here
      const byFrame = (out[action] ??= {});
      const frameKeys = Object.keys(byFrame);
      const targets = frameKeys.length > 0 ? frameKeys : ["0"];
      for (const fk of targets) {
        const frameMap = (byFrame[fk] ??= {});
        if (!frameMap[part]) frameMap[part] = sourceEntry;
      }
      const key = `${part}|${action}`;
      if (!warned.has(key) && typeof console !== "undefined" && console.warn) {
        warned.add(key);
        console.warn(
          `[maple] part "${part}" missing state "${action}" — falling back to "${sourceState}". ` +
            `(Usually means save_render_plan was called with an outdated AAT pool. ` +
            `Re-dispatch maple-character with the new weapon's swing/stab states for all character parts.)`,
        );
      }
    }
  }

  return out;
}

/** Look up a single entry by (state, frame, part). */
export function findEntry(
  renderPlan: ReadonlyArray<RenderPlanEntry>,
  state: string,
  frame: string | number,
  part: string,
): RenderPlanEntry | undefined {
  const f = String(frame);
  return renderPlan.find(
    (e) => e.state === state && e.frame === f && e.part === part,
  );
}

/** Sorted numeric frame indices for a state (e.g. ["0","1","2"] → [0,1,2]). */
export function frameIndicesForState(
  grouped: GroupedPlan,
  state: string,
): number[] {
  const m = grouped[state];
  if (!m) return [];
  return Object.keys(m)
    .map((k) => Number(k))
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);
}

/** All state names present in the plan. */
export function statesInPlan(grouped: GroupedPlan): string[] {
  return Object.keys(grouped);
}

/**
 * Trim a render_plan down to the action states (and cosmetic states
 * like `default`) actually needed by the project. The saved JSON files
 * may contain hundreds of unused states (PB*, PVPA*, YT*, dance_star*,
 * emote / event states); filtering at import time avoids preloading
 * those PNGs and keeps the helper's grouped table small.
 *
 * Cosmetic states (default / blink / smile / etc.) are kept regardless
 * of the keep-list — the cross-state fallback in `groupRenderPlan`
 * propagates them to action frames, so dropping them here would
 * accidentally remove face / hair-shade / etc.
 *
 *   import bodyData from "./data/maple/body_2000.json";
 *   import { filterRenderPlan } from "./__system__/maple";
 *
 *   const slim = filterRenderPlan(bodyData.render_plan,
 *                                 ["stand1", "walk1", "jump"]);
 *   queueRenderPlan(scene, bodyData.cdnBase, slim);
 *   new MapleSprite(scene, x, y, slim, { zmap: bodyData.zmap, ... });
 */
const COSMETIC_KEEP_STATES: ReadonlySet<string> = new Set([
  "default",
  "blink",
  "smile",
  "angry",
  "sad",
  "cry",
  "wink",
  "hum",
  "love",
  "shine",
  "stunned",
  "troubled",
  "vomit",
  "pain",
  "bewildered",
  "blaze",
  "bowing",
  "cheers",
  "chu",
  "dam",
  "despair",
  "glitter",
  "hit",
  "hot",
  "oops",
  "qBlue",
  "backDefault",
]);

export function filterRenderPlan(
  renderPlan: ReadonlyArray<RenderPlanEntry>,
  keepStates: ReadonlyArray<string>,
): RenderPlanEntry[] {
  const keep = new Set(keepStates);
  return renderPlan.filter(
    (e) => keep.has(e.state) || COSMETIC_KEEP_STATES.has(e.state),
  );
}

/**
 * Detect texture keys whose loaded image is the 1×1 / ≤70-byte
 * placeholder used by the asset CDN for multi-part rigs (boss mobs,
 * etc.). Run AFTER `load.start()` has completed.
 *
 * Placeholders mean the entity is rendered by a separate system
 * (Spine, multi-mob assembly) and our PNG-only renderer should NOT
 * try to display it as a sprite sheet. Surface these to the caller.
 */
export function findPlaceholderTextures(
  scene: Phaser.Scene,
  renderPlan: ReadonlyArray<RenderPlanEntry>,
): RenderPlanEntry[] {
  const out: RenderPlanEntry[] = [];
  for (const entry of renderPlan) {
    if (!entry || !entry.texture_key) continue;
    const tex = scene.textures.get(entry.texture_key);
    if (!tex || !tex.source || tex.source.length === 0) continue;
    const src = tex.source[0];
    const w = src?.width ?? 0;
    const h = src?.height ?? 0;
    if (w <= 1 && h <= 1) out.push(entry);
  }
  return out;
}
