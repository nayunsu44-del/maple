import { ArrowLeft, Plus, Trash2, Trophy, UserCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  createProfile,
  deleteProfile,
  getActiveProfile,
  loadProfiles,
  setActiveProfile,
  type Profile,
} from '../game/profile';
import { t } from '../game/i18n';

interface ProfileSelectProps {
  onBack: () => void;
  onProfilesChange: () => void;
}

function bestRecord(profile: Profile) {
  const best = profile.chapters.ch1;
  if (!best || best.bestScore <= 0) return null;
  return best;
}

export default function ProfileSelect({ onBack, onProfilesChange }: ProfileSelectProps) {
  const [profiles, setProfiles] = useState<Profile[]>(() => loadProfiles());
  const [activeId, setActiveId] = useState(() => getActiveProfile().id);
  const [name, setName] = useState('');

  const sortedProfiles = useMemo(
    () => [...profiles].sort((a, b) => a.createdAt - b.createdAt),
    [profiles],
  );

  const refresh = () => {
    setProfiles(loadProfiles());
    setActiveId(getActiveProfile().id);
    onProfilesChange();
  };

  const handleCreate = () => {
    createProfile(name);
    setName('');
    refresh();
  };

  const handleSwitch = (id: string) => {
    setActiveProfile(id);
    refresh();
  };

  const handleDelete = (id: string) => {
    if (!window.confirm(t('profile_delete_confirm'))) return;
    deleteProfile(id);
    refresh();
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-[#f5f6f8] text-gray-800">
      <header className="flex items-center justify-between border-b border-gray-200 px-8 py-5">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-bold text-gray-600 transition hover:border-gray-400"
        >
          <ArrowLeft size={18} />
          {t('profile_back')}
        </button>
        <h1 className="text-2xl font-black text-amber-500">{t('profile_title')}</h1>
        <div className="w-[124px]" />
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-[1fr_280px] gap-5 px-8 py-6">
        <section className="min-h-0 overflow-y-auto pr-1">
          <div className="grid gap-3">
            {sortedProfiles.map(profile => {
              const best = bestRecord(profile);
              const active = profile.id === activeId;

              return (
                <article
                  key={profile.id}
                  className={`rounded-lg border p-4 shadow-sm transition ${
                    active
                      ? 'border-amber-300 bg-amber-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-xl font-black text-gray-900">{profile.name}</h2>
                        {active && (
                          <span className="rounded-md bg-amber-400 px-2 py-0.5 text-xs font-black text-white">
                            {t('profile_active')}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                        <Trophy size={16} className={best ? 'text-amber-500' : 'text-gray-300'} />
                        {best
                          ? `${t('profile_best')}: ${best.bestGrade || '-'} · ${best.bestScore.toLocaleString()}`
                          : t('profile_no_best')}
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => handleSwitch(profile.id)}
                        disabled={active}
                        className={`flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold transition ${
                          active
                            ? 'cursor-default bg-gray-100 text-gray-400'
                            : 'bg-sky-500 text-white hover:bg-sky-600'
                        }`}
                      >
                        <UserCheck size={17} />
                        {t('profile_switch')}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(profile.id)}
                        className="flex h-10 items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 text-sm font-bold text-red-500 transition hover:bg-red-100"
                      >
                        <Trash2 size={17} />
                        {t('profile_delete')}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-black text-gray-900">{t('profile_create_title')}</h2>
          <div className="flex flex-col gap-3">
            <input
              value={name}
              onChange={event => setName(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') handleCreate();
              }}
              placeholder={t('profile_name_placeholder')}
              className="h-11 rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm font-semibold text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-amber-400"
              maxLength={24}
            />
            <button
              type="button"
              onClick={handleCreate}
              className="flex h-11 items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 text-sm font-black text-white transition hover:bg-amber-500"
            >
              <Plus size={18} />
              {t('profile_create')}
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
