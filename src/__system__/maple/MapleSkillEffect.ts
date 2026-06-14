/**
 * AUTO-GENERATED system helper, managed by the runtime.
 * Restored automatically on the next prompt if missing.
 *
 * DO NOT EDIT — your changes will not propagate, and a future runtime
 * update may overwrite or fail to merge them.
 */

import Phaser from "phaser";
import { groupRenderPlan, frameIndicesForState } from "./MapleAssetLoader";
import type { GroupedPlan, RenderPlanEntry, Vec2, ZMap } from "./types";
import { ZMAP_FALLBACK, zIndex } from "./zmap-fallback";

/**
 * Where this effect renders relative to the actor.
 *
 *   caster   — anchored on the casting character (effect / effect0..5)
 *   target   — anchored on the impact location (hit / ball-on-impact)
 *   affected — looped on the buffed character (buffs)
 */
export type EffectAnchor = "caster" | "target" | "affected";

export interface MapleSkillEffectOptions {
  /** Which layer of the skill JSON to play. e.g. "effect", "hit.0", "ball", "affected". */
  layer: string;
  /** Anchor (positioning) mode. Default `caster`. */
  anchor?: EffectAnchor;
  /** Render scale (multiplied into origin offset). Default 1. */
  scale?: number;
  /** Caster faces right? Effects flip with caster. Default false (left-facing). */
  flip?: boolean;
  /** Default per-frame delay (ms) when an entry omits it. Default 80ms. */
  defaultDelay?: number;
  /** True = play once and stop. False = loop. Default `true` for hit/effect, `false` for affected. */
  playOnce?: boolean;
  /** Live zmap for layer-z lookup (optional). */
  zmap?: ZMap;
}

/**
 * Skill-effect renderer for one layer (effect / hit / ball / affected /
 * screen). Use one instance per concurrently-visible layer; if a skill
 * has multiple layers (effect + effect0 + hit), construct one
 * MapleSkillEffect per layer and stack them on the same scene.
 *
 * Origin alignment per `maple-skill-effects`:
 *   effectX = anchor.x - frame.origin.x * scale
 *   effectY = anchor.y - frame.origin.y * scale
 *
 * On flip:
 *   effectX = anchor.x - (textureWidth - frame.origin.x) * scale
 *
 * Layer z (effect's `z` field): negative → behind caster, 0 = at caster
 * level, positive → in front. The renderer translates this into a depth
 * relative to the supplied `baseDepth` (caller's character depth).
 */
export class MapleSkillEffect extends Phaser.GameObjects.Sprite {
  private readonly grouped: GroupedPlan;
  private readonly stateName: string;
  private readonly anchorMode: EffectAnchor;
  private readonly effectScale: number;
  private readonly flipped: boolean;
  private readonly defaultDelay: number;
  private readonly playOnce: boolean;
  private readonly zmap: ReadonlyArray<string>;

  private currentFrame = 0;
  private animTimer = 0;
  private finished = false;

  /** Anchor world position fed every tick (caster/target). */
  anchor: Vec2 = { x: 0, y: 0 };

  /** Caller's reference depth (e.g. character.depth). Layer z offsets this. */
  baseDepth = 0;

  /** Fired once when a play-once effect reaches its last frame. */
  onComplete?: () => void;

  constructor(
    scene: Phaser.Scene,
    renderPlan: ReadonlyArray<RenderPlanEntry>,
    opts: MapleSkillEffectOptions,
  ) {
    // Filter the plan to the requested layer so frameIndicesForState
    // only enumerates that one layer's frames.
    const planForLayer = renderPlan.filter((e) => e.state === opts.layer);
    if (planForLayer.length === 0) {
      // Construct a placeholder; caller may have wrong layer name.
      super(scene, 0, 0, "__missing__");
      // eslint-disable-next-line no-console
      console.warn(
        `[MapleSkillEffect] no entries for layer "${opts.layer}". ` +
          `Check the render_plan and layer name.`,
      );
      this.grouped = {};
      this.stateName = opts.layer;
      this.anchorMode = opts.anchor ?? "caster";
      this.effectScale = opts.scale ?? 1;
      this.flipped = opts.flip ?? false;
      this.defaultDelay = opts.defaultDelay ?? 80;
      this.playOnce = opts.playOnce ?? this.defaultPlayOnce(opts.layer);
      this.zmap = opts.zmap ?? ZMAP_FALLBACK;
      this.setVisible(false);
      scene.add.existing(this);
      return;
    }
    const first = planForLayer[0]!;
    super(scene, 0, 0, first.texture_key);
    this.grouped = groupRenderPlan(planForLayer);
    this.stateName = opts.layer;
    this.anchorMode = opts.anchor ?? "caster";
    this.effectScale = opts.scale ?? 1;
    this.flipped = opts.flip ?? false;
    this.defaultDelay = opts.defaultDelay ?? 80;
    this.playOnce = opts.playOnce ?? this.defaultPlayOnce(opts.layer);
    this.zmap = opts.zmap ?? ZMAP_FALLBACK;
    this.setOrigin(0, 0);
    scene.add.existing(this);
    this.applyFrame();
  }

  /** Drive animation. Call from the scene's update(time, delta). */
  tick(_time: number, delta: number): void {
    if (this.finished) return;
    const frames = frameIndicesForState(this.grouped, this.stateName);
    if (frames.length === 0) return;
    if (frames.length === 1) {
      this.applyFrame();
      if (this.playOnce && !this.finished) this.complete();
      return;
    }

    const sample = this.entryAt(this.currentFrame);
    const delay = sample?.delay ?? this.defaultDelay;
    if (delay <= 0) return;

    this.animTimer += delta;
    if (this.animTimer < delay) return;
    this.animTimer = 0;

    const lastIdx = frames[frames.length - 1] ?? 0;
    if (this.currentFrame >= lastIdx) {
      if (this.playOnce) {
        this.complete();
        return;
      }
      this.currentFrame = 0;
    } else {
      this.currentFrame++;
    }
    this.applyFrame();
  }

  /** Stop the effect immediately, hide, and dispatch onComplete. */
  complete(): void {
    if (this.finished) return;
    this.finished = true;
    this.setVisible(false);
    if (this.onComplete) {
      const cb = this.onComplete;
      queueMicrotask(() => cb());
    }
  }

  /** Whether this effect's playback has finished. */
  isFinished(): boolean {
    return this.finished;
  }

  /** Anchor mode (caster / target / affected) — informational. */
  getAnchor(): EffectAnchor {
    return this.anchorMode;
  }

  // ──────────────────────────── internal ──────────────────────────────

  private defaultPlayOnce(layer: string): boolean {
    if (layer === "affected") return false;
    return true;
  }

  private entryAt(frameIdx: number): RenderPlanEntry | undefined {
    const sm = this.grouped[this.stateName];
    if (!sm) return undefined;
    const fm = sm[String(frameIdx)] ?? sm["0"];
    if (!fm) return undefined;
    return Object.values(fm)[0];
  }

  private applyFrame(): void {
    const e = this.entryAt(this.currentFrame);
    if (!e) {
      this.setVisible(false);
      return;
    }
    if (this.scene.textures.exists(e.texture_key)) {
      this.setTexture(e.texture_key);
    }
    this.setVisible(true);
    this.setFlipX(this.flipped);

    const ox = e.origin?.x ?? 0;
    const oy = e.origin?.y ?? 0;
    const scale = this.effectScale;
    const w = this.width;
    this.x = this.flipped
      ? this.anchor.x - (w - ox) * scale
      : this.anchor.x - ox * scale;
    this.y = this.anchor.y - oy * scale;
    this.setScale(scale);

    // Layer z: prefer the live zmap if z is a known z-name; otherwise
    // treat z as a numeric depth offset relative to baseDepth.
    if (e.z) {
      const idx = zIndex(e.z, this.zmap);
      if (idx >= 0) {
        this.depth = idx;
        return;
      }
      const numeric = Number(e.z);
      if (!Number.isNaN(numeric)) {
        this.depth = this.baseDepth + numeric;
        return;
      }
      this.depth = this.baseDepth - 1; // unknown → behind caster
      return;
    }
    this.depth = this.baseDepth + 1;
  }
}
