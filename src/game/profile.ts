import { ENHANCE_MAX_LEVEL, enhanceCost, evaluateCosmeticUnlocks, getCosmetic, type EnhanceSlotId } from './catalog';

export interface Profile {
  id: string;
  name: string;
  createdAt: number;
  mesos: number;
  enhance: {
    weapon: number;
    top: number;
    bottom: number;
    shoes: number;
    magnet: number;
  };
  chapters: {
    [chapterId: string]: {
      cleared: boolean;
      bestScore: number;
      bestGrade: string;
      bestTime: number;
    };
  };
  unlockedCosmetics: string[];
  equippedCosmetic: string;
  stats: {
    plays: number;
    totalKills: number;
    bossKills: number;
    maxLevel: number;
    totalMesosEarned: number;
  };
}

const PROFILES_KEY = 'sr_profiles';
const ACTIVE_PROFILE_KEY = 'sr_active_profile';

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function emptyStats(): Profile['stats'] {
  return {
    plays: 0,
    totalKills: 0,
    bossKills: 0,
    maxLevel: 0,
    totalMesosEarned: 0,
  };
}

function newProfile(name: string): Profile {
  return {
    id: makeId(),
    name,
    createdAt: Date.now(),
    mesos: 0,
    enhance: {
      weapon: 0,
      top: 0,
      bottom: 0,
      shoes: 0,
      magnet: 0,
    },
    chapters: {},
    unlockedCosmetics: ['default'],
    equippedCosmetic: 'default',
    stats: emptyStats(),
  };
}

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeProfile(value: unknown): Profile | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<Profile>;
  if (!raw.id || !raw.name) return null;

  const chapters: Profile['chapters'] = {};
  if (raw.chapters && typeof raw.chapters === 'object') {
    for (const [chapterId, chapter] of Object.entries(raw.chapters)) {
      if (!chapter || typeof chapter !== 'object') continue;
      chapters[chapterId] = {
        cleared: Boolean(chapter.cleared),
        bestScore: toNumber(chapter.bestScore),
        bestGrade: String(chapter.bestGrade || ''),
        bestTime: toNumber(chapter.bestTime),
      };
    }
  }

  const cosmetics = Array.isArray(raw.unlockedCosmetics)
    ? raw.unlockedCosmetics.filter((id): id is string => typeof id === 'string')
    : [];
  if (!cosmetics.includes('default')) cosmetics.unshift('default');
  const unlockedCosmetics = [...new Set(cosmetics)].filter(id => Boolean(getCosmetic(id)));
  if (!unlockedCosmetics.includes('default')) unlockedCosmetics.unshift('default');
  const equippedCosmetic = typeof raw.equippedCosmetic === 'string' && unlockedCosmetics.includes(raw.equippedCosmetic)
    ? raw.equippedCosmetic
    : 'default';

  return {
    id: String(raw.id),
    name: String(raw.name),
    createdAt: toNumber(raw.createdAt, Date.now()),
    mesos: Math.max(0, toNumber(raw.mesos)),
    enhance: {
      weapon: Math.max(0, toNumber(raw.enhance?.weapon)),
      top: Math.max(0, toNumber(raw.enhance?.top)),
      bottom: Math.max(0, toNumber(raw.enhance?.bottom)),
      shoes: Math.max(0, toNumber(raw.enhance?.shoes)),
      magnet: Math.max(0, toNumber(raw.enhance?.magnet)),
    },
    chapters,
    unlockedCosmetics,
    equippedCosmetic,
    stats: {
      plays: Math.max(0, toNumber(raw.stats?.plays)),
      totalKills: Math.max(0, toNumber(raw.stats?.totalKills)),
      bossKills: Math.max(0, toNumber(raw.stats?.bossKills)),
      maxLevel: Math.max(0, toNumber(raw.stats?.maxLevel)),
      totalMesosEarned: Math.max(0, toNumber(raw.stats?.totalMesosEarned)),
    },
  };
}

function readStoredProfiles(): Profile[] {
  const storage = getStorage();
  if (!storage) return [];
  const raw = storage.getItem(PROFILES_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeProfile).filter((profile): profile is Profile => Boolean(profile));
  } catch {
    return [];
  }
}

function applyLegacyBest(profile: Profile) {
  const storage = getStorage();
  if (!storage) return;
  const raw = storage.getItem('sr_best');
  if (!raw) return;

  try {
    const legacy = JSON.parse(raw);
    const bestScore = toNumber(legacy?.score ?? legacy?.bestScore);
    const bestGrade = String(legacy?.grade ?? legacy?.bestGrade ?? '');
    if (bestScore > 0 || bestGrade) {
      profile.chapters.ch1 = {
        cleared: false,
        bestScore,
        bestGrade,
        bestTime: toNumber(legacy?.time ?? legacy?.bestTime),
      };
    }
  } catch {
    // Ignore malformed legacy records.
  }
}

export function saveProfiles(profiles: Profile[]): void {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

export function loadProfiles(): Profile[] {
  const storage = getStorage();
  let profiles = readStoredProfiles();

  if (profiles.length === 0) {
    const profile = newProfile('Player 1');
    applyLegacyBest(profile);
    profiles = [profile];
    saveProfiles(profiles);
  }

  if (storage) {
    const activeId = storage.getItem(ACTIVE_PROFILE_KEY);
    if (!activeId || !profiles.some(profile => profile.id === activeId)) {
      storage.setItem(ACTIVE_PROFILE_KEY, profiles[0].id);
    }
  }

  return profiles;
}

export function getActiveProfile(): Profile {
  const profiles = loadProfiles();
  const storage = getStorage();
  const activeId = storage?.getItem(ACTIVE_PROFILE_KEY);
  return profiles.find(profile => profile.id === activeId) || profiles[0];
}

export function setActiveProfile(id: string): Profile | null {
  const profiles = loadProfiles();
  const profile = profiles.find(item => item.id === id);
  if (!profile) return null;

  const storage = getStorage();
  storage?.setItem(ACTIVE_PROFILE_KEY, profile.id);
  return profile;
}

export function createProfile(name: string): Profile {
  const profiles = loadProfiles();
  const trimmed = name.trim();
  const profile = newProfile(trimmed || `Player ${profiles.length + 1}`);
  const nextProfiles = [...profiles, profile];
  saveProfiles(nextProfiles);
  setActiveProfile(profile.id);
  return profile;
}

export function deleteProfile(id: string): Profile[] {
  let profiles = loadProfiles().filter(profile => profile.id !== id);
  if (profiles.length === 0) {
    profiles = [newProfile('Player 1')];
  }
  saveProfiles(profiles);

  const storage = getStorage();
  const activeId = storage?.getItem(ACTIVE_PROFILE_KEY);
  if (!activeId || activeId === id || !profiles.some(profile => profile.id === activeId)) {
    storage?.setItem(ACTIVE_PROFILE_KEY, profiles[0].id);
  }

  return profiles;
}

export function saveProfile(profile: Profile): Profile {
  const normalized = normalizeProfile(profile) || profile;
  const profiles = loadProfiles();
  const idx = profiles.findIndex(item => item.id === normalized.id);
  if (idx >= 0) {
    profiles[idx] = normalized;
  } else {
    profiles.push(normalized);
  }
  saveProfiles(profiles);
  return normalized;
}

export function unlockCosmetics(profile: Profile): Profile {
  const unlocked = new Set(profile.unlockedCosmetics.filter(id => Boolean(getCosmetic(id))));
  unlocked.add('default');

  for (const id of evaluateCosmeticUnlocks(profile)) {
    unlocked.add(id);
  }

  const unlockedCosmetics = [...unlocked];
  const equippedCosmetic = unlockedCosmetics.includes(profile.equippedCosmetic)
    ? profile.equippedCosmetic
    : 'default';

  const sameUnlocks = unlockedCosmetics.length === profile.unlockedCosmetics.length
    && unlockedCosmetics.every((id, index) => id === profile.unlockedCosmetics[index]);
  if (sameUnlocks && equippedCosmetic === profile.equippedCosmetic) return profile;

  return {
    ...profile,
    unlockedCosmetics,
    equippedCosmetic,
  };
}

export function setEquippedCosmetic(id: string): Profile {
  const profile = getActiveProfile();
  if (!getCosmetic(id) || !profile.unlockedCosmetics.includes(id)) {
    return profile;
  }
  if (profile.equippedCosmetic === id) {
    return profile;
  }

  return saveProfile({
    ...profile,
    equippedCosmetic: id,
  });
}

export function calcCP(profile: Profile): number {
  return profile.enhance.weapon * 10
    + profile.enhance.top * 6
    + profile.enhance.bottom * 6
    + profile.enhance.shoes * 5;
}

export function enhanceProfile(slot: EnhanceSlotId): { profile: Profile; ok: boolean; reason?: 'max' | 'insufficient' } {
  const profile = getActiveProfile();
  const level = profile.enhance[slot];

  if (level >= ENHANCE_MAX_LEVEL) {
    return { profile, ok: false, reason: 'max' };
  }

  const cost = enhanceCost(level);
  if (profile.mesos < cost) {
    return { profile, ok: false, reason: 'insufficient' };
  }

  const nextProfile: Profile = {
    ...profile,
    mesos: profile.mesos - cost,
    enhance: {
      ...profile.enhance,
      [slot]: level + 1,
    },
  };

  return { profile: saveProfile(nextProfile), ok: true };
}
