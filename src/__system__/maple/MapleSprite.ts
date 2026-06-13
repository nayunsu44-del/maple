/**
 * AUTO-GENERATED system helper, managed by the runtime.
 * Restored automatically on the next prompt if missing.
 *
 * DO NOT EDIT — your changes will not propagate, and a future runtime
 * update may overwrite or fail to merge them. If different behaviour is
 * needed, create a sibling file OUTSIDE `src/__system__/` and import that
 * instead.
 */

import Phaser from "phaser";
import {
  frameIndicesForState,
  groupRenderPlan,
} from "./MapleAssetLoader";
import {
  PLAY_ONCE_DESPAWN_STATES,
  PLAY_ONCE_STATES,
  ZIGZAG_STATES,
  isAttackAction,
  pickAttackAction,
  pickStandAction,
  pickWalkAction,
} from "./aat-table";
import type {
  CapInfo,
  CharacterRace,
  Facing,
  GroupedPlan,
  RenderPlanEntry,
  Vec2,
  WeaponInfo,
  ZMap,
} from "./types";
import { isMaskedByVSlot, parseVSlot } from "./vslot";
import { ZMAP_FALLBACK, zIndex } from "./zmap-fallback";

/**
 * One renderable PNG. Reference is held by the renderer for as long as
 * the part is on screen — multiple frames re-use the same Phaser
 * sprite via `setTexture(...)`, so we keep one per `part` name.
 */
type PartSprite = Phaser.GameObjects.Sprite;

const _warnedUnknownPart = new Set<string>();
function warnUnknownPart(part: string, sockets: Record<string, Vec2>): void {
  if (_warnedUnknownPart.has(part)) return;
  _warnedUnknownPart.add(part);
  const sockKeys = Object.keys(sockets);
  try {
    // eslint-disable-next-line no-console
    console.warn(
      `[MapleSprite] part "${part}" has no recognised socket ` +
        `(found: ${sockKeys.length === 0 ? "none" : sockKeys.join(", ")}). ` +
        `Falling back to body-anchor render. If this part should attach ` +
        `via a specific socket, ensure the entry's sockets map includes ` +
        `one of: brow / hand / navel.`,
    );
  } catch {}
}

export interface MapleSpriteOptions {
  /** Render scale (multiplied into every origin/socket offset). */
  scale?: number;
  /** Initial action (`stand1`, `stand`, ...). Default: stand1 if present, else first state. */
  initialAction?: string;
  /** Initial frame index. Default 0. */
  initialFrame?: number;
  /**
   * Initial facing direction. **PREFERRED API** — self-documenting,
   * no boolean ambiguity. When omitted, falls back to `flip` (or
   * `"left"` if neither is set; sprites are LEFT-facing default).
   */
  facing?: Facing;
  /**
   * **Legacy/low-level**: true = mirror horizontally (sprite faces
   * RIGHT instead of the LEFT-facing default). Prefer `facing` for
   * new code. `flip: true` ≡ `facing: "right"`. Mixing this up
   * (assuming `flip: true` means "facing left") is the single most
   * common direction-reversal bug — use `facing` to avoid it.
   */
  flip?: boolean;
  /** Default per-frame delay (ms) when an entry omits it. */
  defaultDelay?: number;
  /**
   * Live zmap from `get_sprite_data().zmap`. Pass through whenever you
   * have it — without it the helper uses ZMAP_FALLBACK and any z-name
   * the CDN added since the fallback was baked will sort to the back.
   */
  zmap?: ZMap;
  /** Weapon metadata — drives walk1/walk2, stand1/stand2, AAT pool. */
  weapon?: WeaponInfo;
  /** Cap metadata — drives VSlot masking against hair / accessory parts. */
  cap?: CapInfo;
  /**
   * If true, character is mounted (riding a tamingmob). The body will
   * use the `sit` action and the helper will NOT render arms/weapon
   * during sit (rider posture differs from standard rig).
   *
   * Mount sprite composition (saddle / mount body) is OUT of scope —
   * the LLM must compose those layers from the tamingmob render plan
   * per `maple-tamingmob-structure`.
   */
  mounted?: boolean;
  /**
   * Character race — determines which of the four ear variants in the
   * head sprite gets rendered. Default `"human"` (`humanEar`).
   * See `CharacterRace` type for the full mapping.
   */
  race?: CharacterRace;
}

/**
 * Map a race to the single ear part name we should render. The head
 * sprite ships four ear parts in every frame; this picks one and the
 * loop below skips the others.
 */
const EAR_PART_BY_RACE: Readonly<Record<CharacterRace, string>> = {
  human: "humanEar",
  lef: "lefEar",
  highlef: "highlefEar",
  default: "ear",
};
const ALL_EAR_PARTS: ReadonlySet<string> = new Set([
  "ear",
  "humanEar",
  "lefEar",
  "highlefEar",
]);

/** Optional callback fired when a play-once state finishes. */
export type FrameEventHandler = (state: string) => void;

/**
 * MapleStory rig renderer. Consumes a flat `RenderPlanEntry[]` (which
 * is already nesting-normalised by the maple-lookup MCP) and handles
 * in one class:
 *
 *   • multi-part character rigs (body, arm, head, face, hair variants,
 *     cap, equipment, weapon) with full socket-attach math
 *   • single-part actors (mob, npc — one PNG per frame)
 *   • z-order via the part's `z` field, using the LIVE zmap when
 *     supplied via `options.zmap` and ZMAP_FALLBACK otherwise
 *   • flip (sprites face left by default; flipping NEGATES BOTH parent
 *     and child socket X coords — most common rig-misalignment bug)
 *   • sequential / ping-pong / play-once / play-once-then-revert
 *     animation modes (zigzag for stand*, alert, ghoststand; play-once
 *     for hit1, die1)
 *   • weapon attachment switch: arm.hand for idle/walk, body.navel for
 *     swing/stab/shoot
 *   • back-facing (ladder / rope) action — face/hair are hidden from
 *     view by the body posture; helper uses whichever parts the action
 *     ships, falls back to stand1 parts when an action's frame map is
 *     incomplete
 *   • cap.info.vslot masking (hides hair / accessory parts the cap
 *     covers)
 *   • per-frame delay honouring zero-skip
 *
 * What this class deliberately does NOT do (LLM territory):
 *   - multi-part boss mobs (placeholder detection only — caller skips)
 *   - mount + saddle composition (call this twice with two render plans
 *     and stack the containers; saddle/mob z-names land in zmap so they
 *     sort correctly when both containers feed `setDepth`)
 *   - skill effect rendering (use `MapleSkillEffect` instead)
 *   - map placement, parallax, foothold collision (engine logic)
 */
export class MapleSprite extends Phaser.GameObjects.Container {
  private readonly grouped: GroupedPlan;
  private readonly parts: Map<string, PartSprite> = new Map();
  private readonly capVSlot: ReadonlyArray<string>;
  private readonly zmap: ReadonlyArray<string>;

  private currentAction: string;
  private currentFrame: number;
  private animTimer = 0;
  private animDirection: 1 | -1 = 1;
  private playOnceDone = false;

  /** Movement state to revert to when `hit1` finishes. */
  private revertAction: string;

  private spriteScale: number;
  private flipped: boolean;
  private mounted: boolean;
  private readonly defaultDelay: number;
  private readonly weapon?: WeaponInfo;
  private readonly race: CharacterRace;
  private readonly earPartToShow: string;

  /** Fired after a play-once action (die1 / hit1) completes its loop. */
  onActionComplete?: FrameEventHandler;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    renderPlan: ReadonlyArray<RenderPlanEntry>,
    opts: MapleSpriteOptions = {},
  ) {
    super(scene, x, y);
    this.grouped = groupRenderPlan(renderPlan);
    this.zmap = opts.zmap ?? ZMAP_FALLBACK;
    this.weapon = opts.weapon;
    this.capVSlot = parseVSlot(opts.cap?.vslot);
    this.spriteScale = opts.scale ?? 1;
    // `facing` wins over `flip` when both supplied. Default LEFT.
    this.flipped =
      opts.facing !== undefined
        ? opts.facing === "right"
        : (opts.flip ?? false);
    this.mounted = opts.mounted ?? false;
    this.race = opts.race ?? "human";
    this.earPartToShow = EAR_PART_BY_RACE[this.race];
    this.defaultDelay = opts.defaultDelay ?? 180;
    this.currentAction = this.resolveInitialAction(opts.initialAction);
    this.currentFrame = opts.initialFrame ?? 0;
    this.revertAction = this.currentAction;
    scene.add.existing(this);
    this.refreshFrame();

    // Auto-tick on the scene's UPDATE event so animation frames
    // advance even if the user forgets to call `tick(time, delta)`
    // from their own update loop. Idempotent: helper.tick(t, dt)
    // also still works for callers that prefer manual control.
    const ev = (Phaser as unknown as { Scenes?: { Events?: { UPDATE?: string } } }).Scenes?.Events?.UPDATE ?? "update";
    const destroyEv = (Phaser as unknown as { GameObjects?: { Events?: { DESTROY?: string } } }).GameObjects?.Events?.DESTROY ?? "destroy";
    const handler = (time: number, delta: number) => this.tick(time, delta);
    scene.events.on(ev, handler);
    this.once(destroyEv, () => {
      try { scene.events.off(ev, handler); } catch {}
    });
  }

  // ──────────────────────────── public API ─────────────────────────────

  /**
   * Phaser-friendly alias for `setAction`. Some agents reach for
   * `mapleSprite.play("walk1")` by analogy with `Phaser.GameObjects.Sprite.play`.
   * This is the same as `setAction`.
   */
  play(action: string): void {
    this.setAction(action);
  }

  /** Current action name (e.g. "stand1" / "walk1"). */
  getState(): string {
    return this.currentAction;
  }

  /**
   * Play a NORMAL ATTACK from the equipped weapon's AAT pool.
   * `pickIndex` cycles deterministically through the pool — useful
   * for combo sequences (call with 0, 1, 2, ... in order).
   *
   * USE THIS instead of `play("swingO1")` / `setAction("swingT1")`
   * with a literal string. The right swing/stab action depends on
   * the weapon's Attack-Action-Type code (17 categories), and
   * picking the wrong one (e.g. "swingO1" for a two-handed sword
   * which actually uses "swingT1") makes the weapon invisible
   * during the swing — a frequent source of "the sword disappears
   * when I attack" reports.
   *
   * Returns the action name actually played, so the caller can
   * subscribe to onActionComplete or schedule the next combo step.
   *
   * Falls back to "stand1" if no weapon was configured at
   * construction time, so this is safe to call regardless of
   * equipment state.
   */
  attack(pickIndex = 0): string {
    const action = pickAttackAction(this.weapon, pickIndex);
    this.setAction(action);
    return action;
  }

  /** Play the weapon-appropriate walk action (walk1 vs walk2). */
  walk(): string {
    const action = pickWalkAction(this.weapon);
    this.setAction(action);
    return action;
  }

  /** Play the weapon-appropriate stand action (stand1 vs stand2). */
  stand(): string {
    const action = pickStandAction(this.weapon);
    this.setAction(action);
    return action;
  }

  /** Switch to a different animation state. */
  setAction(action: string): void {
    if (this.currentAction === action) return;
    // Track the prior movement state so hit1 can revert.
    if (!PLAY_ONCE_STATES.has(this.currentAction)) {
      this.revertAction = this.currentAction;
    }
    this.currentAction = action;
    this.currentFrame = 0;
    this.animTimer = 0;
    this.animDirection = 1;
    this.playOnceDone = false;
    this.refreshFrame();
  }

  /**
   * Set facing direction. **PREFERRED API.** Self-documenting:
   *   `setFacing("left")` — sprite faces left (default, no mirror)
   *   `setFacing("right")` — sprite mirrors to face right
   *
   * Internally maps to the same boolean as setFlip; both APIs are
   * kept so existing code keeps working.
   */
  setFacing(direction: Facing): void {
    const want = direction === "right";
    if (this.flipped === want) return;
    this.flipped = want;
    this.refreshFrame();
  }

  /** Current facing direction derived from the mirror flag. */
  getFacing(): Facing {
    return this.flipped ? "right" : "left";
  }

  /** Same as `getFacing()` — kept as a getter for `mapleSprite.facing` reads. */
  get facing(): Facing {
    return this.flipped ? "right" : "left";
  }

  /**
   * **Legacy/low-level**: mirror flag.
   *
   * `setFlip(true)` = sprite faces RIGHT (mirror applied).
   * `setFlip(false)` = sprite faces LEFT (default).
   *
   * Prefer `setFacing("left"|"right")` — booleans here invite the
   * "moveLeft → setFlip(true)" mistake. Kept for backward compat.
   */
  setFlip(flip: boolean): void {
    if (this.flipped === flip) return;
    this.flipped = flip;
    this.refreshFrame();
  }

  /** Adjust render scale at runtime. */
  setSpriteScale(scale: number): void {
    if (this.spriteScale === scale) return;
    this.spriteScale = scale;
    this.refreshFrame();
  }

  /** Set mounted posture; swap body to `sit` and hide arm/weapon. */
  setMounted(mounted: boolean): void {
    if (this.mounted === mounted) return;
    this.mounted = mounted;
    this.refreshFrame();
  }

  /** Drive animation. Call from your Scene's update(time, delta). */
  tick(_time: number, delta: number): void {
    const stateKey = this.effectiveState();
    const stateMap = this.grouped[stateKey];
    if (!stateMap) return;

    const frames = frameIndicesForState(this.grouped, stateKey);
    if (frames.length <= 1) {
      // Single-frame action: still fires onActionComplete once for die1.
      this.maybeFirePlayOnce();
      return;
    }

    // Hold a play-once state on its last frame.
    if (this.playOnceDone) return;

    const currStr = String(this.currentFrame);
    const sample = stateMap[currStr]
      ? Object.values(stateMap[currStr])[0]
      : undefined;
    const delay = sample?.delay ?? this.defaultDelay;
    if (delay <= 0) return;

    this.animTimer += delta;
    if (this.animTimer < delay) return;
    this.animTimer = 0;

    const lastIdx = frames[frames.length - 1] ?? 0;
    const isZigZag = ZIGZAG_STATES.has(stateKey);
    const isPlayOnce = PLAY_ONCE_STATES.has(stateKey);

    if (isPlayOnce) {
      if (this.currentFrame >= lastIdx) {
        this.currentFrame = lastIdx;
        this.playOnceDone = true;
        this.maybeFirePlayOnce();
      } else {
        this.currentFrame++;
      }
    } else if (isZigZag) {
      this.currentFrame += this.animDirection;
      if (this.currentFrame >= lastIdx) {
        this.currentFrame = lastIdx;
        this.animDirection = -1;
      } else if (this.currentFrame <= 0) {
        this.currentFrame = 0;
        this.animDirection = 1;
      }
    } else {
      this.currentFrame = this.currentFrame >= lastIdx ? 0 : this.currentFrame + 1;
    }

    this.refreshFrame();
  }

  /** Whether the current play-once state has reached its final frame. */
  isActionComplete(): boolean {
    return this.playOnceDone;
  }

  /** Whether the current state is `die1` (entity should be despawned). */
  isDespawnable(): boolean {
    return this.playOnceDone && PLAY_ONCE_DESPAWN_STATES.has(this.currentAction);
  }

  /** Return entries currently visible. */
  currentFrameEntries(): RenderPlanEntry[] {
    const stateMap = this.grouped[this.effectiveState()];
    if (!stateMap) return [];
    const fm = stateMap[String(this.currentFrame)] ?? stateMap["0"];
    return fm ? Object.values(fm) : [];
  }

  /** All states present in the underlying render plan. */
  availableStates(): string[] {
    return Object.keys(this.grouped);
  }

  // ────────────────────────── internal helpers ─────────────────────────

  /** Initial-action selection: explicit > stand1 > first available. */
  private resolveInitialAction(requested: string | undefined): string {
    if (requested && this.grouped[requested]) return requested;
    if (this.grouped["stand1"]) return "stand1";
    if (this.grouped["stand"]) return "stand";
    const states = Object.keys(this.grouped);
    return states[0] ?? "stand1";
  }

  /** Action-name with mounted/back-facing/idle fallbacks applied. */
  private effectiveState(): string {
    if (this.mounted && this.grouped["sit"]) return "sit";
    if (this.grouped[this.currentAction]) return this.currentAction;
    // Fallback: requested state missing → use stand1, else first known.
    if (this.grouped["stand1"]) return "stand1";
    if (this.grouped["stand"]) return "stand";
    return Object.keys(this.grouped)[0] ?? this.currentAction;
  }

  private maybeFirePlayOnce(): void {
    if (!this.playOnceDone) return;
    if (!PLAY_ONCE_STATES.has(this.currentAction)) return;
    if (!this.onActionComplete) return;
    const action = this.currentAction;
    // Defer to next tick so the handler can call setAction safely.
    queueMicrotask(() => this.onActionComplete?.(action));
  }

  // ─────────────────────────── frame layout ────────────────────────────

  private refreshFrame(): void {
    for (const sprite of this.parts.values()) sprite.setVisible(false);

    const stateKey = this.effectiveState();
    const stateMap = this.grouped[stateKey];
    if (!stateMap) return;
    const frameMap = stateMap[String(this.currentFrame)] ?? stateMap["0"];
    if (!frameMap) return;

    const partKeys = Object.keys(frameMap);
    if (partKeys.length === 0) return;

    const sx = this.flipped ? -1 : 1;
    const scale = this.spriteScale;

    // Single-part actor (mob, npc, simple sprite). Container sits at the
    // logical world position; the sprite is offset by its own origin so
    // the actor's "feet" line up with container.y and centre with x.
    if (partKeys.length === 1) {
      const e = frameMap[partKeys[0]];
      if (e) this.placeSprite(e, { x: 0, y: 0 }, scale);
      this.sort("depth");
      return;
    }

    // Multi-part rig (character).
    const worldOf = new Map<string, Vec2>();

    const bodyEntry = frameMap["body"];
    if (bodyEntry) {
      const navel = bodyEntry.sockets?.navel ?? { x: 0, y: 0 };
      // Container origin == body's navel anchor on the world axis.
      const bodyWorld = { x: -navel.x * sx * scale, y: -navel.y * scale };
      worldOf.set("body", bodyWorld);
      this.placeSprite(bodyEntry, bodyWorld, scale);
    }

    // Arm: body.navel → arm.navel.
    const armEntry = frameMap["arm"];
    if (armEntry && bodyEntry && !this.mounted) {
      const w = this.attach(
        worldOf.get("body")!,
        bodyEntry.sockets?.navel,
        armEntry.sockets?.navel,
        sx,
        scale,
      );
      worldOf.set("arm", w);
      this.placeSprite(armEntry, w, scale);
    }

    // Head: body.neck → head.neck.
    const headEntry = frameMap["head"];
    if (headEntry && bodyEntry) {
      const w = this.attach(
        worldOf.get("body")!,
        bodyEntry.sockets?.neck,
        headEntry.sockets?.neck,
        sx,
        scale,
      );
      worldOf.set("head", w);
      this.placeSprite(headEntry, w, scale);
    }

    // Dynamic routing for every other part. Two-tier:
    //
    //   1. Entry's own sockets — `brow` / `hand` / `navel` — pick the
    //      attach point. This is the canonical signal in the data.
    //
    //   2. If the only socket exposed is a (0,0) `navel` (real glove
    //      sprites do this — they ship `{navel:(0,0)}` and rely on the
    //      renderer to know that "glove" means "attach at arm.hand"),
    //      fall back to part-name KEYWORD heuristics. This is the
    //      narrow exception the previous whitelist tried to enumerate;
    //      we keep it as a fallback only, scoped by keyword:
    //
    //        glove / weapon                    → arm.hand
    //        face / hair / cap / accessory     → head.brow
    //        mail / pants / shoes / cape / shield / coat → body.navel
    //
    // Weapon's attack-state navel switch is preserved at the top of
    // the chain: weapon parts in attack actions go to body.navel when
    // they expose a `navel` socket alongside the usual `hand`.
    //
    // VSlot masking still applies. Mounted (sit) suppresses arm /
    // weapon / glove attaches.
    const ALREADY = new Set(["body", "arm", "head"]);
    for (const [dedupedKey, e] of Object.entries(frameMap)) {
      // Use the entry's REAL part name (`e.part`) for routing logic.
      // The frameMap key may carry a `#N` dedupe suffix (when several
      // assets ship the same part name, e.g. cap + accessoryFace +
      // accessoryEye + earring all use "default") — that suffix is
      // a frameMap-internal key only, but it IS what we pass to
      // placeSprite so each colliding entry gets its own Phaser
      // sprite object instead of clobbering the prior one.
      const part = e.part;
      if (ALREADY.has(part)) continue;
      if (!e) continue;
      if (isMaskedByVSlot(part, this.capVSlot, e.z)) continue;

      // Ear-variant filter — render only the variant matching `race`.
      // Without this every head sprite ships ear+humanEar+lefEar+
      // highlefEar in the same frame and they overlap visually.
      if (ALL_EAR_PARTS.has(part) && part !== this.earPartToShow) continue;

      const sockets = e.sockets ?? {};
      const partLower = part.toLowerCase();
      // In attack actions (swing*/stab*/shoot*) BOTH the weapon AND
      // the gloves attach at body.navel rather than arm.hand. Real
      // sprite data backs this up: swingT1 glove origins jump to
      // values like (-13, 30) — designed to anchor at body.navel
      // (the weapon hilt) so the hands wrap around it. Routing them
      // to arm.hand instead leaves the glove dangling next to the
      // blade tip ("hand floating off the sword" bug).
      const useAttackNavel =
        isAttackAction(this.currentAction) &&
        sockets.navel !== undefined &&
        (partLower.startsWith("weapon") || partLower.includes("glove"));
      // l/rHand and stand2-style standalone `hand` parts attach at
      // body.navel per `maple-character-rendering` line 108
      // ("render them using the same socket formula as other navel-
      // attached parts"). They appear in alert / swingT1 / heal /
      // jump / fly. Some carry only `handMove` socket (no `navel`);
      // we treat that as the attach point too.
      const wantsBodyHandAttach =
        partLower === "hand" ||
        partLower === "lhand" ||
        partLower === "rhand";

      // The (0,0)-only `navel` keyword fallback used to route gloves
      // to arm.hand here. That was wrong: a survey across multiple
      // gloves (1080000, 1081000, 1082000, 1082168, 1082416, 1082419,
      // 1082419) shows gloves ALWAYS attach at body.navel —
      // standard-grade gloves ship explicit non-zero navel sockets
      // (e.g. lGlove (5,-4), rGlove (-19,-11)) which describe where
      // each hand sits relative to body.navel. Cash gloves with
      // `(0,0)` navel are just the degenerate case where the origin
      // offset alone determines hand position.
      //
      // Routing those `(0,0)` gloves to arm.hand stranded the rGlove
      // sprite next to the visible arm instead of letting both hands
      // sit at body.navel with their origin offsets carrying the
      // visual layout. We now drop straight through to the
      // sockets.navel branch below for every glove (and every other
      // navel-bearing part).
      const wantsBrow =
        partLower.includes("hair") ||
        partLower.includes("face") ||
        partLower.startsWith("cap") ||
        partLower.startsWith("default") || // cap's `default` / `defalutAc`
        partLower.startsWith("accessory") ||
        partLower.startsWith("ear");
      const wantsNavel =
        partLower.startsWith("mail") ||
        partLower.startsWith("pants") ||
        partLower.startsWith("shoes") ||
        partLower.startsWith("cape") ||
        partLower.startsWith("shield") ||
        partLower.startsWith("coat");

      if (sockets.brow && headEntry) {
        // Face data anomaly: real CDN face sprites come in two
        // consistent shapes —
        //   pattern A: origin y > 0  +  brow y << 0   (e.g. 20000)
        //   pattern B: origin y < 0  +  brow = (0, 0) (e.g. 23035)
        // A few faces (e.g. 23043) ship origin y < 0 AND brow y << 0,
        // which double-stacks the offset and pushes the face ~12 px
        // below the head. Treat that as the broken case and fall back
        // to brow = (0, 0) — matching the pattern-B convention. Only
        // applied to `face`; other parts use their brow as-is.
        let childBrow = sockets.brow;
        if (
          part === "face" &&
          e.origin?.y !== undefined &&
          e.origin.y < 0 &&
          childBrow.y < 0
        ) {
          childBrow = { x: 0, y: 0 };
        }
        const w = this.attach(
          worldOf.get("head")!,
          headEntry.sockets?.brow,
          childBrow,
          sx,
          scale,
        );
        worldOf.set(part, w);
        this.placeSprite(e, w, scale, dedupedKey);
      } else if (useAttackNavel && bodyEntry) {
        const w = this.attach(
          worldOf.get("body")!,
          bodyEntry.sockets?.navel,
          sockets.navel,
          sx,
          scale,
        );
        worldOf.set(part, w);
        this.placeSprite(e, w, scale, dedupedKey);
      } else if (sockets.hand && armEntry && !this.mounted) {
        const w = this.attach(
          worldOf.get("arm")!,
          armEntry.sockets?.hand,
          sockets.hand,
          sx,
          scale,
        );
        worldOf.set(part, w);
        this.placeSprite(e, w, scale, dedupedKey);
      } else if (
        Object.keys(sockets).length === 1 &&
        sockets.navel?.x === 0 &&
        sockets.navel?.y === 0 &&
        wantsBrow &&
        headEntry
      ) {
        const w = this.attach(
          worldOf.get("head")!,
          headEntry.sockets?.brow,
          { x: 0, y: 0 },
          sx,
          scale,
        );
        worldOf.set(part, w);
        this.placeSprite(e, w, scale, dedupedKey);
      } else if (sockets.navel && bodyEntry && !this.mounted) {
        // Real navel attach (mail / pants / cape / shoes / shield / coat).
        // Also catches navel-only-zero parts whose name didn't match a
        // hand/brow keyword — they correctly stay at body.navel.
        const w = this.attach(
          worldOf.get("body")!,
          bodyEntry.sockets?.navel,
          sockets.navel,
          sx,
          scale,
        );
        worldOf.set(part, w);
        this.placeSprite(e, w, scale, dedupedKey);
      } else if (wantsNavel && bodyEntry && !this.mounted) {
        // No socket map at all but name implies body-attach.
        const w = this.attach(
          worldOf.get("body")!,
          bodyEntry.sockets?.navel,
          { x: 0, y: 0 },
          sx,
          scale,
        );
        worldOf.set(part, w);
        this.placeSprite(e, w, scale, dedupedKey);
      } else if (wantsBodyHandAttach && bodyEntry && !this.mounted) {
        // Additional limb sprite (alert/heal/jump/fly/swingT1 etc).
        // Use whichever socket is present; default (0,0) so the
        // sprite's own origin places it relative to body.navel.
        const childSock =
          sockets.navel ??
          sockets.handMove ??
          sockets.hand ??
          { x: 0, y: 0 };
        const w = this.attach(
          worldOf.get("body")!,
          bodyEntry.sockets?.navel,
          childSock,
          sx,
          scale,
        );
        worldOf.set(part, w);
        this.placeSprite(e, w, scale, dedupedKey);
      } else {
        // Last resort: socket-less, name-less. Body anchor + own origin.
        warnUnknownPart(part, sockets);
      }
    }

    // Catch-all: any part still unplaced gets the body anchor with its
    // own origin offset. Covers exotic parts whose socket key the
    // routing above didn't recognise (e.g. back-facing cape variants).
    //
    // Apply the SAME race + vslot suppressions here. Without this, the
    // race-skipped ear variants (lefEar / highlefEar / ear when
    // race==="human") fall through to the catch-all because
    // `this.parts.get(part)?.visible` is false for them — and they
    // re-render at body-anchor with their own origin, which lands them
    // on the lower body / "feet" area instead of the head.
    const fallbackAnchor = worldOf.get("body") ?? { x: 0, y: 0 };
    for (const [dedupedKey, entry] of Object.entries(frameMap)) {
      const realPart = entry.part;
      const sprite = this.parts.get(dedupedKey);
      if (sprite?.visible) continue;
      if (isMaskedByVSlot(realPart, this.capVSlot, entry.z)) continue;
      if (ALL_EAR_PARTS.has(realPart) && realPart !== this.earPartToShow) continue;
      this.placeSprite(entry, fallbackAnchor, scale, dedupedKey);
    }

    this.sort("depth");
  }

  /**
   * Socket attachment formula:
   *
   *   no flip:  child.world = parent.world + (parent.socket - child.socket) * scale
   *   flipped:  child.world.x = parent.world.x + (parent.socket.x - child.socket.x) * sx * scale
   *             child.world.y = parent.world.y + (parent.socket.y - child.socket.y) * scale
   *
   * On flip BOTH socket X values multiply by `sx = -1` — equivalent to
   * negating both. Forgetting either is the most common rig misalignment
   * bug (sprite jumps several tens of pixels in the flip direction).
   */
  private attach(
    parentWorld: Vec2,
    parentSocket: Vec2 | undefined,
    childSocket: Vec2 | undefined,
    sx: number,
    scale: number,
  ): Vec2 {
    const ps = parentSocket ?? { x: 0, y: 0 };
    const cs = childSocket ?? { x: 0, y: 0 };
    return {
      x: parentWorld.x + (ps.x * sx - cs.x * sx) * scale,
      y: parentWorld.y + (ps.y - cs.y) * scale,
    };
  }

  /**
   * Create-or-update a Phaser sprite for one render-plan entry. Origin
   * subtraction places the sprite so its origin pixel lands on `world`.
   * Flip mirrors the texture and uses `width - origin.x` to keep the
   * origin pixel at `world.x` (anchor correction).
   */
  private placeSprite(
    entry: RenderPlanEntry,
    world: Vec2,
    scale: number,
    /** Map key for the persistent Phaser sprite. Defaults to
     *  `entry.part`, but the routing loop passes the deduped frameMap
     *  key so that cap.default and accessoryFace.default get separate
     *  sprite objects (otherwise their setTexture calls clobber each
     *  other and only one renders). */
    spriteKey: string = entry.part,
  ): void {
    let sprite = this.parts.get(spriteKey);
    if (!sprite) {
      sprite = this.scene.add.sprite(0, 0, entry.texture_key).setOrigin(0, 0);
      this.add(sprite);
      this.parts.set(spriteKey, sprite);
    } else {
      sprite.setTexture(entry.texture_key);
    }
    sprite.setVisible(true);
    sprite.setFlipX(this.flipped);

    const ox = entry.origin?.x ?? 0;
    const oy = entry.origin?.y ?? 0;
    const w = sprite.width;
    sprite.x = this.flipped ? world.x - (w - ox) * scale : world.x - ox * scale;
    sprite.y = world.y - oy * scale;
    sprite.setScale(scale);
    sprite.depth = zIndex(entry.z, this.zmap);
  }
}
