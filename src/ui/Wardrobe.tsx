import { ArrowLeft, Check, Lock, Shirt } from 'lucide-react';
import { useState } from 'react';
import { CHAPTERS, COSMETICS, type CosmeticDef } from '../game/catalog';
import { currentLang, t } from '../game/i18n';
import { getActiveProfile, setEquippedCosmetic, type Profile } from '../game/profile';
import CharacterPreview from './CharacterPreview';

interface WardrobeProps {
  onBack: () => void;
  onProfilesChange: () => void;
}

function cosmeticName(cosmetic: CosmeticDef): string {
  return currentLang === 'ko' ? cosmetic.name.ko : cosmetic.name.en;
}

function chapterName(chapterId: string): string {
  const chapter = CHAPTERS.find(item => item.id === chapterId);
  if (!chapter) return chapterId;
  return currentLang === 'ko' ? chapter.name.ko : chapter.name.en;
}

function formatCondition(cosmetic: CosmeticDef): string {
  const value = cosmetic.unlock.value;
  if (cosmetic.unlock.type === 'default') return t('wardrobe_unlock_default');
  if (cosmetic.unlock.type === 'chapterClear') {
    return t('wardrobe_unlock_chapter').replace('{chapter}', chapterName(String(value)));
  }
  if (cosmetic.unlock.type === 'bestScore') {
    return t('wardrobe_unlock_score').replace('{value}', Number(value || 0).toLocaleString());
  }
  if (cosmetic.unlock.type === 'totalKills') {
    return t('wardrobe_unlock_kills').replace('{value}', Number(value || 0).toLocaleString());
  }
  if (cosmetic.unlock.type === 'mesosEarned') {
    return t('wardrobe_unlock_mesos').replace('{value}', Number(value || 0).toLocaleString());
  }
  return '';
}

export default function Wardrobe({ onBack, onProfilesChange }: WardrobeProps) {
  const [profile, setProfile] = useState<Profile>(() => getActiveProfile());
  const [selectedId, setSelectedId] = useState(profile.equippedCosmetic || 'default');
  const selectedCosmetic = COSMETICS.find(cosmetic => cosmetic.id === selectedId) || COSMETICS[0];
  const selectedUnlocked = profile.unlockedCosmetics.includes(selectedCosmetic.id);
  const selectedEquipped = profile.equippedCosmetic === selectedCosmetic.id;

  const refresh = () => {
    const nextProfile = getActiveProfile();
    setProfile(nextProfile);
    onProfilesChange();
  };

  const handleEquip = (id: string) => {
    const nextProfile = setEquippedCosmetic(id);
    setProfile(nextProfile);
    setSelectedId(nextProfile.equippedCosmetic);
    onProfilesChange();
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-[#f5f6f8] text-gray-800">
      <header className="flex items-center justify-between border-b border-gray-200 px-8 py-5">
        <button
          type="button"
          onClick={() => {
            refresh();
            onBack();
          }}
          className="flex h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-bold text-gray-600 transition hover:border-gray-400"
        >
          <ArrowLeft size={18} />
          {t('wardrobe_back')}
        </button>
        <h1 className="text-2xl font-black text-amber-500">{t('wardrobe_title')}</h1>
        <div className="w-[124px]" />
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-[1fr_230px] gap-5 px-8 py-6">
        <section className="grid min-h-0 grid-cols-2 gap-3">
          {COSMETICS.map(cosmetic => {
            const unlocked = profile.unlockedCosmetics.includes(cosmetic.id);
            const equipped = profile.equippedCosmetic === cosmetic.id;
            const selected = selectedCosmetic.id === cosmetic.id;

            return (
              <article
                key={cosmetic.id}
                className={`grid grid-cols-[76px_1fr] gap-3 rounded-lg border p-3 shadow-sm transition ${
                  selected
                    ? 'border-amber-300 bg-amber-50'
                    : unlocked
                      ? 'border-gray-200 bg-white hover:border-gray-300'
                      : 'border-gray-200 bg-gray-50 text-gray-400'
                }`}
                onClick={() => setSelectedId(cosmetic.id)}
              >
                <button
                  type="button"
                  className="relative flex h-[76px] w-[76px] items-center justify-center rounded-lg bg-gray-100"
                  onClick={() => setSelectedId(cosmetic.id)}
                >
                  {unlocked ? (
                    <CharacterPreview cosmeticId={cosmetic.id} size={68} />
                  ) : (
                    <Lock size={28} className="text-gray-300" />
                  )}
                  {equipped && (
                    <span className="absolute right-1 top-1 rounded-full bg-amber-400 p-1 text-white">
                      <Check size={13} strokeWidth={4} />
                    </span>
                  )}
                </button>

                <div className="flex min-w-0 flex-col justify-between">
                  <div>
                    <h2 className="truncate text-base font-black text-gray-900">{cosmeticName(cosmetic)}</h2>
                    <p className="mt-1 min-h-8 text-xs font-semibold text-gray-400">
                      {unlocked ? t('wardrobe_unlocked') : formatCondition(cosmetic)}
                    </p>
                  </div>

                  {unlocked ? (
                    <button
                      type="button"
                      disabled={equipped}
                      onClick={event => {
                        event.stopPropagation();
                        handleEquip(cosmetic.id);
                      }}
                      className={`flex h-9 items-center justify-center gap-1 rounded-md px-3 text-xs font-black transition ${
                        equipped
                          ? 'cursor-default bg-gray-100 text-gray-400'
                          : 'bg-amber-400 text-white hover:bg-amber-500'
                      }`}
                    >
                      <Shirt size={15} />
                      {equipped ? t('wardrobe_equipped') : t('wardrobe_equip')}
                    </button>
                  ) : (
                    <div className="flex h-9 items-center justify-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-3 text-xs font-black text-gray-400">
                      <Lock size={14} />
                      {t('wardrobe_locked')}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </section>

        <aside className="flex flex-col rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-1 flex-col items-center justify-center">
            <div className="mb-4 flex h-36 w-36 items-center justify-center rounded-lg bg-gray-100">
              <CharacterPreview cosmeticId={selectedCosmetic.id} size={132} />
            </div>
            <h2 className="text-center text-2xl font-black text-gray-900">{cosmeticName(selectedCosmetic)}</h2>
            <p className="mt-2 min-h-10 text-center text-sm font-semibold text-gray-500">
              {selectedUnlocked ? t('wardrobe_unlocked') : formatCondition(selectedCosmetic)}
            </p>
          </div>

          {selectedUnlocked && (
            <button
              type="button"
              disabled={selectedEquipped}
              onClick={() => handleEquip(selectedCosmetic.id)}
              className={`mt-5 flex h-12 items-center justify-center gap-2 rounded-lg px-4 text-base font-black transition ${
                selectedEquipped
                  ? 'cursor-default bg-gray-100 text-gray-400'
                  : 'bg-amber-400 text-white hover:bg-amber-500'
              }`}
            >
              <Shirt size={20} />
              {selectedEquipped ? t('wardrobe_equipped') : t('wardrobe_equip')}
            </button>
          )}
        </aside>
      </main>
    </div>
  );
}
