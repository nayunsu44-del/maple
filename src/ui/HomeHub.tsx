import { Coins, Crosshair, Gauge, Hammer, Play, Shirt, Skull, Star, Trophy, Users } from 'lucide-react';
import { CHAPTERS, COSMETICS, ENHANCE_MAX_LEVEL, ENHANCE_SLOTS } from '../game/catalog';
import { calcCP, type Profile } from '../game/profile';
import { t, type Lang } from '../game/i18n';
import CharacterPreview from './CharacterPreview';

interface HomeHubProps {
  profile: Profile;
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  onOpenChapters: () => void;
  onOpenEnhance: () => void;
  onOpenWardrobe: () => void;
  onOpenProfiles: () => void;
}

function bestRecord(profile: Profile) {
  return Object.values(profile.chapters).reduce<Profile['chapters'][string] | null>((best, record) => {
    if (!record || record.bestScore <= 0) return best;
    if (!best || record.bestScore > best.bestScore) return record;
    return best;
  }, null);
}

function isCurrentlyAvailableCosmetic(cosmeticId: string): boolean {
  const cosmetic = COSMETICS.find(item => item.id === cosmeticId);
  if (!cosmetic) return false;
  if (cosmetic.unlock.type !== 'chapterClear') return true;
  return Boolean(CHAPTERS.find(chapter => chapter.id === cosmetic.unlock.value)?.playable);
}

function nextGoalKey(profile: Profile): string {
  if (!profile.chapters.ch1?.cleared) return 'home_goal_clear_lith';
  const hasEnhanceRoom = ENHANCE_SLOTS.some(slot => profile.enhance[slot.id] < ENHANCE_MAX_LEVEL);
  if (hasEnhanceRoom) return 'home_goal_enhance_cp';
  const availableCosmetics = COSMETICS.filter(cosmetic => isCurrentlyAvailableCosmetic(cosmetic.id));
  const allAvailableUnlocked = availableCosmetics.every(cosmetic => profile.unlockedCosmetics.includes(cosmetic.id));
  if (!allAvailableUnlocked) return 'home_goal_unlock_cosmetics';
  return 'home_goal_best_score';
}

export default function HomeHub({
  profile,
  lang,
  onLangChange,
  onOpenChapters,
  onOpenEnhance,
  onOpenWardrobe,
  onOpenProfiles,
}: HomeHubProps) {
  const cp = calcCP(profile);
  const best = bestRecord(profile);
  const nextGoal = t(nextGoalKey(profile));
  const totalKills = profile.stats.totalKills;
  const clearedCount = Object.values(profile.chapters).filter(r => r?.cleared).length;
  const cosmeticCount = profile.unlockedCosmetics.length;
  const cosmetic = COSMETICS.find(c => c.id === profile.equippedCosmetic);

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-[#f5f6f8] text-gray-800">
      <header className="flex items-center justify-between border-b border-gray-200 px-8 py-5">
        <div>
          <h1 className="text-3xl font-black tracking-normal text-amber-500">Survivor Rush</h1>
          <p className="mt-1 text-xs font-semibold text-gray-400">MapleStory × Vampire Survivors</p>
        </div>
        <div className="flex items-center gap-2">
          {(['en', 'ko'] as Lang[]).map(code => (
            <button
              key={code}
              type="button"
              onClick={() => onLangChange(code)}
              className={`h-8 min-w-10 rounded-md border px-3 text-sm font-bold transition ${
                lang === code
                  ? 'border-amber-400 bg-amber-400 text-white'
                  : 'border-gray-300 bg-white text-gray-500 hover:border-amber-300'
              }`}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-[1fr_240px] gap-6 px-8 py-6">
        <section className="flex min-h-0 flex-col justify-center gap-5">
          <div className="flex items-center gap-5">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-white shadow-md">
              <CharacterPreview cosmeticId={profile.equippedCosmetic} size={92} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{t('home_active_profile')}</p>
              <p className="truncate text-4xl font-black text-gray-900">{profile.name}</p>
              {cosmetic && cosmetic.id !== 'default' && (
                <p className="mt-1 text-sm font-semibold text-amber-500">
                  {lang === 'ko' ? cosmetic.name.ko : cosmetic.name.en}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-500">
                <Coins size={18} className="text-amber-500" />
                {t('home_mesos')}
              </div>
              <div className="truncate text-2xl font-black text-gray-900">{profile.mesos.toLocaleString()}</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-500">
                <Gauge size={18} className="text-emerald-500" />
                {t('home_cp')}
              </div>
              <div className="truncate text-2xl font-black text-gray-900">{cp.toLocaleString()}</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-500">
                <Trophy size={18} className="text-sky-500" />
                {t('home_best_record')}
              </div>
              <div className="truncate text-2xl font-black text-gray-900">
                {best ? `${best.bestGrade || '-'} · ${best.bestScore.toLocaleString()}` : t('home_no_record')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-md border border-gray-100 bg-white/70 px-3 py-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
                <Skull size={13} />
                {t('home_kills')}
              </div>
              <div className="mt-0.5 text-base font-black text-gray-900">{totalKills.toLocaleString()}</div>
            </div>
            <div className="rounded-md border border-gray-100 bg-white/70 px-3 py-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
                <Star size={13} />
                {t('home_chapters_cleared')}
              </div>
              <div className="mt-0.5 text-base font-black text-gray-900">{clearedCount}/{CHAPTERS.filter(c => c.playable).length}</div>
            </div>
            <div className="rounded-md border border-gray-100 bg-white/70 px-3 py-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
                <Shirt size={13} />
                {t('home_cosmetics_unlocked')}
              </div>
              <div className="mt-0.5 text-base font-black text-gray-900">{cosmeticCount}/{COSMETICS.length}</div>
            </div>
            <div className="rounded-md border border-gray-100 bg-white/70 px-3 py-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
                <Crosshair size={13} />
                {t('home_goal')}
              </div>
              <div className="mt-0.5 truncate text-xs font-bold text-amber-600">{nextGoal}</div>
            </div>
          </div>
        </section>

        <nav className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onOpenChapters}
            className="flex h-14 items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 text-lg font-black text-white shadow-lg shadow-amber-200 transition hover:bg-amber-500"
          >
            <Play size={22} fill="currentColor" />
            {t('home_start')}
          </button>

          <button
            type="button"
            onClick={onOpenEnhance}
            className="flex h-14 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-base font-bold text-gray-700 transition hover:border-amber-300 hover:bg-amber-50"
          >
            <Hammer size={20} />
            {t('home_enhance')}
          </button>

          <button
            type="button"
            onClick={onOpenWardrobe}
            className="flex h-14 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-base font-bold text-gray-700 transition hover:border-purple-300 hover:bg-purple-50"
          >
            <Shirt size={20} />
            {t('home_cosmetics')}
          </button>

          <button
            type="button"
            onClick={onOpenProfiles}
            className="flex h-14 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-base font-bold text-gray-700 transition hover:border-sky-300 hover:bg-sky-50"
          >
            <Users size={20} />
            {t('home_profiles')}
          </button>
        </nav>
      </main>
    </div>
  );
}
