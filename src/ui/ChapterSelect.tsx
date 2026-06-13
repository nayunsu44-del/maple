import { ArrowLeft, Check, Lock, Play, Trophy } from 'lucide-react';
import { useState } from 'react';
import { CHAPTERS, isChapterUnlocked, type ChapterDef } from '../game/catalog';
import { currentLang, mobName, t } from '../game/i18n';
import { getActiveProfile, type Profile } from '../game/profile';

interface ChapterSelectProps {
  onBack: () => void;
  onPlayChapter: (chapterId: string) => void;
}

const NODE_POS: Record<string, { x: number; y: number }> = {
  ch1: { x: 12, y: 72 },
  ch2: { x: 30, y: 34 },
  ch3: { x: 50, y: 63 },
  ch4: { x: 70, y: 28 },
  ch5: { x: 88, y: 54 },
};

function chapterName(chapter: ChapterDef) {
  return currentLang === 'ko' ? chapter.name.ko : chapter.name.en;
}

function bestRecord(profile: Profile, chapterId: string) {
  const record = profile.chapters[chapterId];
  if (!record || record.bestScore <= 0) return null;
  return record;
}

function formatTime(totalSeconds: number) {
  const min = Math.floor(totalSeconds / 60);
  const sec = Math.floor(totalSeconds % 60);
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export default function ChapterSelect({ onBack, onPlayChapter }: ChapterSelectProps) {
  const [profile] = useState(() => getActiveProfile());
  const [selectedId, setSelectedId] = useState('ch1');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const activeId = hoveredId || selectedId;
  const activeChapter = CHAPTERS.find(chapter => chapter.id === activeId) || CHAPTERS[0];
  const activeUnlocked = isChapterUnlocked(activeChapter.id, profile);
  const activeRecord = bestRecord(profile, activeChapter.id);
  const activeCleared = Boolean(profile.chapters[activeChapter.id]?.cleared);
  const activeCanPlay = activeUnlocked && activeChapter.playable;
  const pathPoints = CHAPTERS.map(chapter => `${NODE_POS[chapter.id].x},${NODE_POS[chapter.id].y}`).join(' ');

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-[#101827] text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-8 py-5">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 items-center gap-2 rounded-lg border border-white/15 bg-white/[0.05] px-4 text-sm font-bold text-slate-100 transition hover:border-white/35"
        >
          <ArrowLeft size={18} />
          {t('chapter_back')}
        </button>
        <h1 className="text-2xl font-black text-[#ffd54f]">{t('chapter_title')}</h1>
        <div className="w-[124px]" />
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-[1fr_270px] gap-5 px-8 py-6">
        <section className="relative overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,#123047,#142036_50%,#1f3142)]">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 z-0 h-full w-full"
            aria-hidden="true"
          >
            <path d="M0,88 C18,66 18,44 31,34 C42,24 39,72 51,63 C62,54 60,30 70,28 C80,26 78,56 100,48" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="18" />
            <polyline points={pathPoints} fill="none" stroke="rgba(255,213,79,0.42)" strokeWidth="1.7" strokeDasharray="3 2" />
          </svg>

          <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_25%,rgba(129,212,250,0.16),transparent_30%),radial-gradient(circle_at_78%_72%,rgba(255,213,79,0.12),transparent_28%)]" />

          {CHAPTERS.map((chapter, idx) => {
            const pos = NODE_POS[chapter.id];
            const unlocked = isChapterUnlocked(chapter.id, profile);
            const cleared = Boolean(profile.chapters[chapter.id]?.cleared);
            const canPlay = unlocked && chapter.playable;
            const currentObjective = canPlay && !cleared;
            const comingSoon = unlocked && !chapter.playable;
            const selected = activeId === chapter.id;
            const label = cleared
              ? t('chapter_cleared')
              : comingSoon
                ? t('chapter_coming_soon')
                : !unlocked
                  ? t('chapter_locked')
                  : t('chapter_play');

            const stateClass = cleared
              ? 'border-[#ffd54f] bg-[#ffd54f] text-[#101827] shadow-[#ffd54f]/40'
              : currentObjective
                ? 'border-[#69f0ae] bg-[#69f0ae] text-[#07111d] shadow-[#69f0ae]/40'
                : comingSoon
                  ? 'border-[#40c4ff]/60 bg-[#40c4ff]/15 text-[#b3e5fc] shadow-[#40c4ff]/20'
                  : 'border-white/15 bg-slate-700 text-slate-400 shadow-black/20';

            return (
              <div
                key={chapter.id}
                className="absolute z-10"
                style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
                onMouseEnter={() => setHoveredId(chapter.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <button
                  type="button"
                  aria-disabled={!canPlay}
                  onClick={() => {
                    if (canPlay) {
                      setSelectedId(chapter.id);
                      onPlayChapter(chapter.id);
                    } else if (unlocked) {
                      setSelectedId(chapter.id);
                    }
                  }}
                  className={`relative flex h-16 w-16 items-center justify-center rounded-full border-4 text-lg font-black shadow-xl transition ${
                    stateClass
                  } ${canPlay ? 'hover:scale-105' : 'cursor-default'} ${selected ? 'ring-4 ring-white/35' : ''}`}
                >
                  {cleared ? <Check size={28} strokeWidth={4} /> : !unlocked ? <Lock size={24} /> : idx + 1}
                </button>
                <div className="mt-2 max-w-24 text-center text-xs font-black text-white drop-shadow">
                  {chapterName(chapter)}
                </div>
                <div className={`mx-auto mt-1 w-fit rounded px-1.5 py-0.5 text-[10px] font-black ${
                  cleared
                    ? 'bg-[#ffd54f] text-[#101827]'
                    : comingSoon
                      ? 'bg-[#40c4ff]/20 text-[#b3e5fc]'
                      : !unlocked
                        ? 'bg-slate-900/60 text-slate-400'
                        : 'bg-[#69f0ae]/20 text-[#b9f6ca]'
                }`}>
                  {label}
                </div>
              </div>
            );
          })}
        </section>

        <aside className="flex flex-col justify-between rounded-lg border border-white/10 bg-white/[0.04] p-5">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-2xl font-black text-white">{chapterName(activeChapter)}</h2>
              {activeCleared && (
                <span className="rounded-md bg-[#ffd54f] px-2 py-0.5 text-xs font-black text-[#101827]">
                  {t('chapter_cleared')}
                </span>
              )}
            </div>

            <p className="min-h-10 text-sm font-semibold text-slate-300">{t(activeChapter.theme)}</p>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="font-bold text-slate-400">{t('chapter_boss')}</span>
                <span className="font-black text-red-200">{mobName(activeChapter.boss)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="flex items-center gap-1 font-bold text-slate-400">
                  <Trophy size={15} />
                  {t('chapter_best')}
                </span>
                <span className="font-black text-[#ffd54f]">
                  {activeRecord
                    ? `${activeRecord.bestGrade || '-'} · ${activeRecord.bestScore.toLocaleString()} · ${formatTime(activeRecord.bestTime)}`
                    : t('chapter_no_record')}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5">
            {!activeUnlocked && (
              <div className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-slate-400">
                {t('chapter_locked')} · {t('chapter_clear_previous')}
              </div>
            )}

            {activeUnlocked && !activeChapter.playable && (
              <div className="rounded-lg border border-[#40c4ff]/30 bg-[#40c4ff]/10 px-4 py-3 text-sm font-black text-[#b3e5fc]">
                {t('chapter_coming_soon')}
              </div>
            )}

            {activeCanPlay && (
              <button
                type="button"
                onClick={() => onPlayChapter(activeChapter.id)}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#ffb300] px-4 text-base font-black text-[#101827] transition hover:bg-[#ffd54f]"
              >
                <Play size={20} fill="currentColor" />
                {t('chapter_play')}
              </button>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
