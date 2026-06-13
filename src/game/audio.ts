let AC: AudioContext | null = null;
let sndOn = true;
const sndLast: Record<string, number> = {};

const SFX_GAP: Record<string, number> = {
  shoot: 90,
  hit: 55,
  kill: 70,
  xp: 70,
  meteor: 120,
  chain: 150,
  nova: 200,
  hurt: 250,
  ram: 80
};

export function initAudio() {
  if (!AC) {
    try {
      AC = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      AC = null;
    }
  }
  if (AC && AC.state === 'suspended') {
    AC.resume();
  }
}

export function isSoundOn(): boolean {
  return sndOn;
}

export function toggleSound(): boolean {
  sndOn = !sndOn;
  return sndOn;
}

export function setSoundOn(on: boolean) {
  sndOn = on;
}

function tone(f: number, dur: number, type: OscillatorType = 'square', vol = 0.12, slide = 0, delay = 0) {
  if (!AC) return;
  const t0 = AC.currentTime + delay;
  const o = AC.createOscillator();
  const g = AC.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (slide) {
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t0 + dur);
  }
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(AC.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noiseBurst(dur: number, vol = 0.2, delay = 0) {
  if (!AC) return;
  const t0 = AC.currentTime + delay;
  const n = (AC.sampleRate * dur) | 0;
  const buf = AC.createBuffer(1, n, AC.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) {
    d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  }
  const s = AC.createBufferSource();
  s.buffer = buf;
  const g = AC.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(g);
  g.connect(AC.destination);
  s.start(t0);
}

export function sfx(name: string) {
  if (!AC || !sndOn) return;
  const now = Date.now();
  if (SFX_GAP[name] && sndLast[name] && now - sndLast[name] < SFX_GAP[name]) return;
  sndLast[name] = now;

  switch (name) {
    case 'shoot':
      tone(820, 0.05, 'square', 0.025, -260);
      break;
    case 'hit':
      tone(240, 0.05, 'sawtooth', 0.05, -70);
      break;
    case 'kill':
      tone(520, 0.08, 'square', 0.07, 260);
      tone(780, 0.07, 'square', 0.05, 200, 0.04);
      break;
    case 'xp':
      tone(1180, 0.06, 'sine', 0.05, 420);
      break;
    case 'heal':
      tone(660, 0.1, 'sine', 0.08, 180);
      tone(990, 0.12, 'sine', 0.06, 120, 0.08);
      break;
    case 'levelup':
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, 'square', 0.09, 0, i * 0.07));
      break;
    case 'awaken':
      [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, 'sine', 0.1, 0, i * 0.06));
      noiseBurst(0.35, 0.06);
      break;
    case 'meteor':
      noiseBurst(0.22, 0.16);
      tone(70, 0.3, 'sine', 0.22, -30);
      break;
    case 'chain':
      tone(1400, 0.09, 'sawtooth', 0.06, -1100);
      break;
    case 'nova':
      tone(180, 0.25, 'sine', 0.1, 420);
      break;
    case 'ram':
      tone(300, 0.05, 'triangle', 0.06, -120);
      break;
    case 'hurt':
      tone(110, 0.16, 'sawtooth', 0.12, -45);
      noiseBurst(0.08, 0.07);
      break;
    case 'midboss':
      [196, 247, 196].forEach((f, i) => tone(f, 0.18, 'square', 0.1, 0, i * 0.18));
      break;
    case 'boss':
      [220, 180, 220, 180].forEach((f, i) => tone(f, 0.22, 'square', 0.12, 0, i * 0.24));
      break;
    case 'clear':
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, 'square', 0.1, 0, i * 0.11));
      break;
    case 'over':
      [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.09, 0, i * 0.16));
      break;
    case 'pick':
      tone(700, 0.05, 'square', 0.06, 150);
      break;
  }
}
