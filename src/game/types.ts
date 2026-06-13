export interface PlayerState {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  atk: number;
  atkM: number;
  spd: number;
  spdM: number;
  pc: number; // projectile count
  orbN: number;
  orbA: number;
  novaOn: boolean;
  novaT: number;
  novaCd: number;
  novaR: number;
  meteorOn: boolean;
  meteorT: number;
  meteorCd: number;
  meteorN: number;
  meteorR: number;
  chainOn: boolean;
  chainT: number;
  chainCd: number;
  chainCount: number;
  novaDmgM: number;
  meteorDmgM: number;
  chainDmgM: number;
  orbDmgM: number;
  orbRad: number;
  magR: number;
  chainRng: number;
  poisonOn: boolean;
  poisonT: number;
  poisonCd: number;
  poisonR: number;
  poisonDur: number;
  poisonDmgM: number;
  hawkN: number;
  hawkDmgM: number;
  drainHp: number;
  drainEvery: number;
  drainCnt: number;
  awk: Record<string, boolean>;
  atkT: number;
  atkCd: number;
  invT: number;
  lv: number;
  exp: number;
  expMax: number;
  skills: Record<string, number>;
  face: number;
  walk: number;
}

export interface EnemyDef {
  nm: string;
  hp: number;
  atk: number;
  spd: number;
  xp: number;
  r: number;
  col: string;
  isBoss?: boolean;
}

export interface Enemy {
  type: string;
  def: EnemyDef;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  atk: number;
  spd: number;
  xp: number;
  hf: number;
  wb: number;
  kbx: number;
  kby: number;
  kbR?: number;
  scale?: number;
  isBoss?: boolean;
  isMid?: boolean;
  _id: string | number;
}

export interface Projectile {
  x: number;
  y: number;
  dx: number;
  dy: number;
  dmg: number;
  r: number;
  life: number;
  hit: Set<string | number>;
}

export interface DropItem {
  type: 'xp' | 'pot' | 'meso';
  x: number;
  y: number;
  v: number;
  r: number;
  life: number;
}

export interface Particle {
  x: number;
  y: number;
  dx: number;
  dy: number;
  col: string;
  life: number;
  ml: number;
  r: number;
}

export interface FText {
  x: number;
  y: number;
  text: string;
  col: string;
  life: number;
  vy: number;
  vx: number;
  sz: number;
}

export interface Nova {
  x: number;
  y: number;
  r: number;
  maxR: number;
  life: number;
  hit: Set<string | number>;
  delay: number;
}

export interface Meteor {
  x: number;
  y: number;
  warnT: number;
  maxWarnT: number;
  r: number;
  dmg: number;
}

export interface LightningSeg {
  zz: { x: number; y: number }[];
}

export interface Lightning {
  segs: LightningSeg[];
  life: number;
  maxLife: number;
}

export interface PoisonCloud {
  x: number;
  y: number;
  r: number;
  life: number;
  maxLife: number;
}

export interface Hawk {
  x: number;
  y: number;
  a: number;
  tgt: Enemy | null;
  hit: Set<string | number>;
  gl: number;
}

export interface SkillLevel {
  d: string;
  fx: (p: PlayerState) => void;
}

export interface SkillDef {
  nm: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic';
  maxLv: number;
  col: string;
  lvls: SkillLevel[];
  desc?: (lv: number) => string;
}
