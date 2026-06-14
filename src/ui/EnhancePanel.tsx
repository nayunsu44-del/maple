import { ArrowLeft, Coins, Gauge, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  ARMOR_HP_PER_LEVEL,
  ENHANCE_MAX_LEVEL,
  ENHANCE_SLOTS,
  SHOES_SPD_MUL_PER_LEVEL,
  WEAPON_ATK_MUL_PER_LEVEL,
  enhanceCost,
  type EnhanceSlotId,
} from '../game/catalog';
import { calcCP, enhanceProfile, getActiveProfile, type Profile } from '../game/profile';
import { t } from '../game/i18n';
import * as spriteCache from '../game/spriteCache';

interface EnhancePanelProps {
  onBack: () => void;
  onProfilesChange: () => void;
}

function bonusText(profile: Profile, slot: EnhanceSlotId): string {
  const lv = profile.enhance[slot];
  if (slot === 'weapon') return `+${Math.round(lv * WEAPON_ATK_MUL_PER_LEVEL * 100)}% ${t('enhance_stat_attack')}`;
  if (slot === 'shoes') return `+${Math.round(lv * SHOES_SPD_MUL_PER_LEVEL * 100)}% ${t('enhance_stat_speed')}`;
  return `+${lv * ARMOR_HP_PER_LEVEL} HP`;
}

const EQUIP_ASSETS: Record<EnhanceSlotId, string> = {
  weapon: 'weapon_STAFF',
  top: 'coat_1040004',
  bottom: 'pants_1060040',
  shoes: 'shoes_1072850',
};

function EquipPreview({ slot, size = 64 }: { slot: EnhanceSlotId; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const assetKey = EQUIP_ASSETS[slot];
    const asset = spriteCache.mapleAssets[assetKey];
    if (!asset) return;
    const frames = asset.planByState['stand1'];
    if (!frames?.length) return;
    const frame = frames[0];
    const imgKey = `${asset.type}_${asset.id}_${frame.state}_${frame.frame}_${frame.part}`;
    const img = spriteCache.mapleImages[imgKey] || spriteCache.ensureImageLoaded(asset, frame);
    if (!img) return;

    const scale = size / Math.max(img.width, img.height) * 0.7;
    const ox = frame.origin.x * scale;
    const oy = frame.origin.y * scale;
    const dw = img.width * scale;
    const dh = img.height * scale;
    const dx = (size - dw) / 2 - ox + (size / 2);
    const dy = (size - dh) / 2 - oy + (size / 2);
    ctx.drawImage(img, dx, dy, dw, dh);
  }, [slot, size]);

  return <canvas ref={canvasRef} width={size} height={size} className="block" aria-hidden="true" />;
}

export default function EnhancePanel({ onBack, onProfilesChange }: EnhancePanelProps) {
  const [profile, setProfile] = useState<Profile>(() => getActiveProfile());
  const [message, setMessage] = useState('');

  const refresh = () => {
    const nextProfile = getActiveProfile();
    setProfile(nextProfile);
    onProfilesChange();
  };

  const handleEnhance = (slot: EnhanceSlotId) => {
    const result = enhanceProfile(slot);
    setProfile(result.profile);
    onProfilesChange();

    if (result.ok) {
      setMessage('');
    } else if (result.reason === 'max') {
      setMessage(t('enhance_max'));
    } else {
      setMessage(t('enhance_insufficient'));
    }
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-[#101827] text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-8 py-5">
        <button
          type="button"
          onClick={() => {
            refresh();
            onBack();
          }}
          className="flex h-10 items-center gap-2 rounded-lg border border-white/15 bg-white/[0.05] px-4 text-sm font-bold text-slate-100 transition hover:border-white/35"
        >
          <ArrowLeft size={18} />
          {t('enhance_back')}
        </button>
        <h1 className="text-2xl font-black text-[#ffd54f]">{t('enhance_title')}</h1>
        <div className="w-[124px]" />
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-4 px-8 py-6">
        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
              <Coins size={18} className="text-[#ffd54f]" />
              {t('home_mesos')}
            </div>
            <div className="text-2xl font-black">{profile.mesos.toLocaleString()}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
              <Gauge size={18} className="text-[#69f0ae]" />
              {t('home_cp')}
            </div>
            <div className="text-2xl font-black">{calcCP(profile).toLocaleString()}</div>
          </div>
        </section>

        {message && (
          <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">
            {message}
          </div>
        )}

        <section className="grid gap-3">
          {ENHANCE_SLOTS.map(slot => {
            const level = profile.enhance[slot.id];
            const maxed = level >= ENHANCE_MAX_LEVEL;
            const cost = maxed ? 0 : enhanceCost(level);
            const insufficient = !maxed && profile.mesos < cost;

            return (
              <article
                key={slot.id}
                className="grid grid-cols-[88px_1fr_150px_126px] items-center gap-4 rounded-lg border border-white/10 bg-white/[0.04] p-4"
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-[#0d1320]">
                  <EquipPreview slot={slot.id} size={64} />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-white">{t(slot.nameKey)}</h2>
                    <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-bold text-slate-300">
                      {t('enhance_level')} {level}/{ENHANCE_MAX_LEVEL}
                    </span>
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-300">
                    {t(slot.bonusKey)} · {bonusText(profile, slot.id)}
                  </div>
                </div>

                <div className={insufficient ? 'text-right text-red-200' : 'text-right text-[#ffd54f]'}>
                  <div className="text-xs font-bold text-slate-400">{t('enhance_cost')}</div>
                  <div className="text-lg font-black">{maxed ? t('enhance_max') : cost.toLocaleString()}</div>
                </div>

                <button
                  type="button"
                  disabled={maxed || insufficient}
                  onClick={() => handleEnhance(slot.id)}
                  className={`flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-black transition ${
                    maxed
                      ? 'cursor-default bg-white/10 text-slate-500'
                      : insufficient
                        ? 'cursor-not-allowed border border-red-400/30 bg-red-500/10 text-red-200'
                        : 'bg-[#ffb300] text-[#101827] hover:bg-[#ffd54f]'
                  }`}
                >
                  <Sparkles size={17} />
                  {maxed ? t('enhance_max') : t('enhance_button')}
                </button>
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}
