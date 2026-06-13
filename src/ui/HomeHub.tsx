import { Coins, Gauge, Hammer, Play, Shirt, Target, Trophy, Users } from 'lucide-react';
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

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-[#101827] text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-8 py-5">
        <div>
          <h1 className="text-3xl font-black tracking-normal text-[#ffd54f]">{t('home_title')}</h1>
          <p className="mt-1 text-sm font-medium text-slate-300">{t('home_subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {(['en', 'ko'] as Lang[]).map(code => (
            <button
              key={code}
              type="button"
              onClick={() => onLangChange(code)}
              className={`h-8 min-w-10 rounded-md border px-3 text-sm font-bold transition ${
                lang === code
                  ? 'border-[#ffd54f] bg-[#ffd54f] text-[#101827]'
                  : 'border-white/15 bg-white/5 text-slate-200 hover:border-white/35'
              }`}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-[1fr_240px] gap-6 px-8 py-6">
        <section className="flex min-h-0 flex-col justify-center gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#0d1320]">
              <CharacterPreview cosmeticId={profile.equippedCosmetic} size={76} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase text-slate-400">{t('home_active_profile')}</p>
              <p className="truncate text-3xl font-black text-white">{profile.name}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-300">
                <Coins size={18} className="text-[#ffd54f]" />
                {t('home_mesos')}
              </div>
              <div className="truncate text-2xl font-black text-white">{profile.mesos.toLocaleString()}</div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-300">
                <Gauge size={18} className="text-[#69f0ae]" />
                {t('home_cp')}
              </div>
              <div className="truncate text-2xl font-black text-white">{cp.toLocaleString()}</div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-300">
                <Trophy size={18} className="text-[#40c4ff]" />
                {t('home_best_record')}
              </div>
              <div className="truncate text-2xl font-black text-white">
                {best ? `${best.bestGrade || '-'} · ${best.bestScore.toLocaleString()}` : t('home_no_record')}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[#ffd54f]/20 bg-[#ffd54f]/10 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-bold text-[#fff8d6]">
              <Target size={18} className="text-[#ffd54f]" />
              <span className="text-[#ffd54f]">{t('home_next_goal')}</span>
              <span className="text-white">{nextGoal}</span>
            </div>
          </div>
        </section>

        <nav className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onOpenChapters}
            className="flex h-14 items-center justify-center gap-2 rounded-lg bg-[#ffb300] px-4 text-lg font-black text-[#101827] shadow-lg shadow-[#ffb300]/20 transition hover:bg-[#ffd54f]"
          >
            <Play size={22} fill="currentColor" />
            {t('home_start')}
          </button>

          <button
            type="button"
            onClick={onOpenEnhance}
            className="flex h-14 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-4 text-base font-bold text-white transition hover:border-[#ffd54f] hover:bg-[#ffd54f]/10"
          >
            <Hammer size={20} />
            {t('home_enhance')}
          </button>

          <button
            type="button"
            onClick={onOpenWardrobe}
            className="flex h-14 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-4 text-base font-bold text-white transition hover:border-[#ce93d8] hover:bg-[#ce93d8]/10"
          >
            <Shirt size={20} />
            {t('home_cosmetics')}
          </button>

          <button
            type="button"
            onClick={onOpenProfiles}
            className="flex h-14 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-4 text-base font-bold text-white transition hover:border-[#40c4ff] hover:bg-[#40c4ff]/10"
          >
            <Users size={20} />
            {t('home_profiles')}
          </button>
        </nav>
      </main>
    </div>
  );
}
