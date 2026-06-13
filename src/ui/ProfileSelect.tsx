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
    <div className="absolute inset-0 z-30 flex flex-col bg-[#101827] text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-8 py-5">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 items-center gap-2 rounded-lg border border-white/15 bg-white/[0.05] px-4 text-sm font-bold text-slate-100 transition hover:border-white/35"
        >
          <ArrowLeft size={18} />
          {t('profile_back')}
        </button>
        <h1 className="text-2xl font-black text-[#ffd54f]">{t('profile_title')}</h1>
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
                  className={`rounded-lg border p-4 transition ${
                    active
                      ? 'border-[#ffd54f] bg-[#ffd54f]/10'
                      : 'border-white/10 bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-xl font-black text-white">{profile.name}</h2>
                        {active && (
                          <span className="rounded-md bg-[#ffd54f] px-2 py-0.5 text-xs font-black text-[#101827]">
                            {t('profile_active')}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center gap-2 text-sm text-slate-300">
                        <Trophy size={16} className={best ? 'text-[#ffd54f]' : 'text-slate-500'} />
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
                            ? 'cursor-default bg-white/10 text-slate-500'
                            : 'bg-[#40c4ff] text-[#07111d] hover:bg-[#81d4fa]'
                        }`}
                      >
                        <UserCheck size={17} />
                        {t('profile_switch')}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(profile.id)}
                        className="flex h-10 items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 text-sm font-bold text-red-100 transition hover:bg-red-500/20"
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

        <aside className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <h2 className="mb-3 text-lg font-black text-white">{t('profile_create_title')}</h2>
          <div className="flex flex-col gap-3">
            <input
              value={name}
              onChange={event => setName(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') handleCreate();
              }}
              placeholder={t('profile_name_placeholder')}
              className="h-11 rounded-lg border border-white/15 bg-[#0d1320] px-3 text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-[#ffd54f]"
              maxLength={24}
            />
            <button
              type="button"
              onClick={handleCreate}
              className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#ffb300] px-4 text-sm font-black text-[#101827] transition hover:bg-[#ffd54f]"
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
