import { ArrowLeft, Coins, Gauge, Magnet, Sparkles } from 'lucide-react';
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
  if (slot === 'magnet') return `+${lv * 4} ${t('enhance_stat_range')}`;
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
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      if (spriteCache.isMapleLoaded) {
        const assetKey = EQUIP_ASSETS[slot];
        const asset = spriteCache.mapleAssets[assetKey];
        if (!asset) return;
        const frames = asset.planByState['stand1'];
        if (!frames?.length) return;
        const frame = frames[0];
        const imgKey = `${asset.type}_${asset.id}_${frame.state}_${frame.frame}_${frame.part}`;
        if (spriteCache.mapleImages[imgKey]) { setTick(t => t + 1); clearInterval(id); }
      }
    }, 100);
    return () => clearInterval(id);
  }, [slot]);

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

    const baseScale = size / Math.max(img.width, img.height);
    const scale = (slot === 'shoes' ? baseScale * 0.6 : baseScale * 0.75);
    const dw = img.width * scale;
    const dh = img.height * scale;
    const dx = (size - dw) / 2;
    const dy = (size - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
  }, [slot, size, tick]);

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
          {t('enhance_back')}
        </button>
        <h1 className="text-2xl font-black text-amber-500">{t('enhance_title')}</h1>
        <div className="w-[124px]" />
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-4 px-8 py-6">
        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-500">
              <Coins size={18} className="text-amber-500" />
              {t('home_mesos')}
            </div>
            <div className="text-2xl font-black text-gray-900">{profile.mesos.toLocaleString()}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-500">
              <Gauge size={18} className="text-emerald-500" />
              {t('home_cp')}
            </div>
            <div className="text-2xl font-black text-gray-900">{calcCP(profile).toLocaleString()}</div>
          </div>
        </section>

        {message && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
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
                className="grid grid-cols-[88px_1fr_150px_126px] items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-gray-100">
                  {slot.id === 'magnet' ? (
                    <Magnet size={40} className="text-purple-400" />
                  ) : (
                    <EquipPreview slot={slot.id} size={64} />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-gray-900">{t(slot.nameKey)}</h2>
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-500">
                      {t('enhance_level')} {level}/{ENHANCE_MAX_LEVEL}
                    </span>
                  </div>
                  <div className="mt-2 text-sm font-semibold text-gray-500">
                    {t(slot.bonusKey)} · {bonusText(profile, slot.id)}
                  </div>
                </div>

                <div className={insufficient ? 'text-right text-red-400' : 'text-right text-amber-600'}>
                  <div className="text-xs font-bold text-gray-400">{t('enhance_cost')}</div>
                  <div className="text-lg font-black">{maxed ? t('enhance_max') : cost.toLocaleString()}</div>
                </div>

                <button
                  type="button"
                  disabled={maxed || insufficient}
                  onClick={() => handleEnhance(slot.id)}
                  className={`flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-black transition ${
                    maxed
                      ? 'cursor-default bg-gray-100 text-gray-400'
                      : insufficient
                        ? 'cursor-not-allowed border border-red-300 bg-red-50 text-red-400'
                        : 'bg-amber-400 text-white hover:bg-amber-500'
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
