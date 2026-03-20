/**
 * Infinity Glass Railing Calculator — Main Page
 * Design: Clean Professional (Sora + IBM Plex Mono, warm white, navy/blue/red)
 * Three-panel layout: Job Info (left) | Configuration (center) | Live Results (right)
 */

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  calculate,
  defaultConfig,
  computeRevealConstraints,
  COLOR_OPTIONS,
  type ConfigInputs,
  type CalculationResult,
  type Country,
  type MountType,
  type RailHeight,
  type PostConfig,
  type GlassThickness,
  type FasciaOffset,
} from '@/lib/calculator';
import { Lock, Unlock, AlertTriangle, AlertCircle, Printer, ChevronDown, ChevronUp, Info } from 'lucide-react';

// ============================================================
// HELPERS
// ============================================================

function fmt(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

function fmtCurrency(n: number): string {
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function fmtIn(n: number): string {
  return fmt(n, 3) + '"';
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-[oklch(0.52_0.018_255)] mb-0.5">{title}</h3>
      {subtitle && <p className="text-xs text-[oklch(0.6_0.01_255)]">{subtitle}</p>}
    </div>
  );
}

function FieldRow({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-[oklch(0.93_0.004_90)] last:border-0">
      <div className="w-44 flex-shrink-0">
        <span className="text-sm text-[oklch(0.35_0.02_250)]">{label}</span>
        {hint && <p className="text-xs text-[oklch(0.6_0.01_255)] mt-0.5">{hint}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function NumInput({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  disabled = false,
  className = '',
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}) {
  const [localVal, setLocalVal] = useState(String(value));
  const [focused, setFocused] = useState(false);

  // Sync external value when not focused
  if (!focused && String(value) !== localVal && !isNaN(value)) {
    setLocalVal(String(value));
  }

  return (
    <input
      type="number"
      value={focused ? localVal : value}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onFocus={e => {
        setFocused(true);
        setLocalVal(String(value));
        e.target.select();
      }}
      onBlur={() => {
        setFocused(false);
        const v = parseFloat(localVal);
        if (!isNaN(v)) {
          const clamped = max !== undefined ? Math.min(max, Math.max(min, v)) : Math.max(min, v);
          onChange(clamped);
          setLocalVal(String(clamped));
        } else {
          setLocalVal(String(value));
        }
      }}
      onChange={e => {
        setLocalVal(e.target.value);
        const v = parseFloat(e.target.value);
        if (!isNaN(v)) onChange(v);
      }}
      className={`mono w-full rounded border border-[oklch(0.89_0.006_90)] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.45_0.12_255)] disabled:bg-[oklch(0.95_0.003_90)] disabled:cursor-not-allowed ${className}`}
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string | number;
  onChange: (v: string) => void;
  options: { value: string | number; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full rounded border border-[oklch(0.89_0.006_90)] px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[oklch(0.45_0.12_255)]"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-[oklch(0.28_0.08_255)]' : 'bg-[oklch(0.82_0.01_255)]'}`}
      >
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
      {label && <span className="text-sm text-[oklch(0.35_0.02_250)]">{label}</span>}
    </label>
  );
}

function UnlockableField({
  label,
  value,
  onChange,
  unlocked,
  onUnlock,
  min,
  max,
  step = 0.125,
  hint,
  unit = '"',
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unlocked: boolean;
  onUnlock: () => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
  unit?: string;
}) {
  return (
    <FieldRow label={label} hint={hint}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <NumInput
            value={value}
            onChange={onChange}
            min={min}
            max={max}
            step={step}
            disabled={!unlocked}
          />
          <span className="absolute right-8 top-1/2 -translate-y-1/2 text-xs text-[oklch(0.6_0.01_255)]">{unit}</span>
        </div>
        <button
          onClick={onUnlock}
          title={unlocked ? 'Lock to default' : 'Unlock to customize'}
          className={`p-1.5 rounded transition-colors ${unlocked ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' : 'text-[oklch(0.52_0.018_255)] bg-[oklch(0.95_0.003_90)] hover:bg-[oklch(0.92_0.006_90)]'}`}
        >
          {unlocked ? <Unlock size={14} /> : <Lock size={14} />}
        </button>
      </div>
    </FieldRow>
  );
}

function DimBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] text-[oklch(0.52_0.018_255)] uppercase tracking-wide mb-0.5">{label}</span>
      <span className="dim-badge">{value}</span>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Home() {
  const [config, setConfig] = useState<ConfigInputs>(defaultConfig());
  const [jobInfo, setJobInfo] = useState({ dealerName: '', jobReference: '', color: 'Innovative Series Black' });
  const [showAddOns, setShowAddOns] = useState(false);
  const [revealUnlocked, setRevealUnlocked] = useState(false);
  const [bottomGapUnlocked, setBottomGapUnlocked] = useState(false);

  const update = useCallback(<K extends keyof ConfigInputs>(key: K, value: ConfigInputs[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateQty = useCallback((key: keyof ConfigInputs['quantities'], value: number) => {
    setConfig(prev => ({
      ...prev,
      quantities: { ...prev.quantities, [key]: Math.max(0, value) },
    }));
  }, []);

  const updateAddOn = useCallback((key: keyof ConfigInputs['addOns'], value: number) => {
    setConfig(prev => ({
      ...prev,
      addOns: { ...prev.addOns, [key]: Math.max(0, value) },
    }));
  }, []);

  // Compute constraints
  const constraints = useMemo(() =>
    computeRevealConstraints(
      config.country,
      config.mountType,
      config.railHeight,
      config.postConfig,
      config.topGlassReveal,
      config.bottomGlassGap,
      config.distTopBasePlateToDeck,
    ),
    [config.country, config.mountType, config.railHeight, config.postConfig, config.topGlassReveal, config.bottomGlassGap, config.distTopBasePlateToDeck]
  );

  // Run calculation
  const result: CalculationResult = useMemo(() => calculate(config), [config]);

  // Country-specific reveal max
  const topRevealMax = constraints.topRevealMax;
  const isUS = config.country === 'US';
  const isCA = config.country === 'CA';
  const isFascia = config.mountType === 'fascia';
  const isSurface = config.mountType === 'surface';

  // Handle country change — reset reveal to default
  const handleCountryChange = (c: Country) => {
    update('country', c);
    update('topGlassReveal', 2.125);
    update('postConfig', 'tall');
    setRevealUnlocked(false);
  };

  // Handle rail height change — recalculate constraints
  const handleRailHeightChange = (rh: RailHeight) => {
    update('railHeight', rh);
    update('topGlassReveal', 2.125);
    setRevealUnlocked(false);
  };

  const handleRevealChange = (v: number) => {
    const clamped = Math.max(constraints.topRevealMin, Math.min(constraints.topRevealMax, v));
    update('topGlassReveal', clamped);
  };

  const handleUnlockReveal = () => {
    if (revealUnlocked) {
      // Lock: reset to default
      update('topGlassReveal', 2.125);
    }
    setRevealUnlocked(!revealUnlocked);
  };

  const totalLineItems = result.lineItems.length;
  const hasContent = config.quantities.midPosts + config.quantities.endPosts +
    config.quantities.outsideCornerPosts + config.quantities.insideCornerPosts +
    config.quantities.wallTracks + config.quantities.endPostsLeft25 + config.quantities.endPostsRight25 > 0;

  return (
    <div className="min-h-screen bg-[oklch(0.99_0.003_90)]">
      {/* Header */}
      <header className="bg-[oklch(0.22_0.06_255)] text-white no-print">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
                  <span className="text-white">|</span>nfinity
                </span>
                <span className="text-[oklch(0.65_0.14_255)] text-xs font-medium tracking-widest uppercase mt-1">Railing Calculator</span>
              </div>
              <p className="text-[oklch(0.7_0.05_255)] text-xs mt-0.5">Railings for million dollar views · 2026 Pricing</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-3 py-1.5 rounded bg-[oklch(0.30_0.07_255)] hover:bg-[oklch(0.35_0.07_255)] text-sm transition-colors"
            >
              <Printer size={14} />
              Print Quote
            </button>
          </div>
        </div>
      </header>

      <div className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_380px] gap-6">

          {/* ====== LEFT PANEL: Job Info + Country ====== */}
          <div className="space-y-4 no-print">

            {/* Job Info */}
            <div className="calc-card p-5">
              <SectionHeader title="Job Information" />
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-[oklch(0.52_0.018_255)] uppercase tracking-wide block mb-1">Dealer Name</label>
                  <input
                    type="text"
                    value={jobInfo.dealerName}
                    onChange={e => setJobInfo(p => ({ ...p, dealerName: e.target.value }))}
                    placeholder="Enter dealer name"
                    className="w-full rounded border border-[oklch(0.89_0.006_90)] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.45_0.12_255)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[oklch(0.52_0.018_255)] uppercase tracking-wide block mb-1">Job Reference</label>
                  <input
                    type="text"
                    value={jobInfo.jobReference}
                    onChange={e => setJobInfo(p => ({ ...p, jobReference: e.target.value }))}
                    placeholder="Project / job name"
                    className="w-full rounded border border-[oklch(0.89_0.006_90)] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.45_0.12_255)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[oklch(0.52_0.018_255)] uppercase tracking-wide block mb-1">Color</label>
                  <SelectInput
                    value={jobInfo.color}
                    onChange={v => setJobInfo(p => ({ ...p, color: v }))}
                    options={COLOR_OPTIONS.map(c => ({ value: c, label: c }))}
                  />
                  {jobInfo.color === 'Custom' && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <AlertTriangle size={11} /> Contact IAS for custom color pricing
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Country Selection */}
            <div className="calc-card p-5">
              <SectionHeader title="Market" subtitle="Select your country for code-compliant configuration" />
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleCountryChange('US')}
                  className={`rounded-lg p-4 text-center border-2 transition-all ${config.country === 'US' ? 'bg-[oklch(0.52_0.22_255)] border-[oklch(0.52_0.22_255)] text-white shadow-md' : 'bg-[oklch(0.96_0.015_255)] border-[oklch(0.75_0.12_255)] text-[oklch(0.35_0.18_255)] hover:border-[oklch(0.52_0.22_255)]'}`}
                >
                  <div className="text-2xl mb-1">🇺🇸</div>
                  <div className="font-semibold text-sm">United States</div>
                  <div className="text-xs mt-0.5 opacity-75">IBC / IRC Code</div>
                </button>
                <button
                  onClick={() => handleCountryChange('CA')}
                  className={`rounded-lg p-4 text-center border-2 transition-all ${config.country === 'CA' ? 'bg-[oklch(0.52_0.22_27)] border-[oklch(0.52_0.22_27)] text-white shadow-md' : 'bg-[oklch(0.97_0.015_27)] border-[oklch(0.75_0.12_27)] text-[oklch(0.35_0.18_27)] hover:border-[oklch(0.52_0.22_27)]'}`}
                >
                  <div className="text-2xl mb-1">🇨🇦</div>
                  <div className="font-semibold text-sm">Canada</div>
                  <div className="text-xs mt-0.5 opacity-75">NBC Code</div>
                </button>
              </div>
            </div>

            {/* Discount & Shipping */}
            <div className="calc-card p-5">
              <SectionHeader title="Pricing Options" />
              <div className="space-y-0">
                <FieldRow label="Discount Level" hint="e.g. 0.435 = 43.5%">
                  <NumInput
                    value={config.discountLevel}
                    onChange={v => update('discountLevel', Math.max(0, Math.min(0.99, v)))}
                    min={0}
                    max={0.99}
                    step={0.005}
                  />
                </FieldRow>
                <FieldRow label="Ship Via Courier">
                  <Toggle checked={config.shipViaCourier} onChange={v => update('shipViaCourier', v)} />
                </FieldRow>
              </div>
            </div>
          </div>

          {/* ====== CENTER PANEL: Configuration ====== */}
          <div className="space-y-4">

            {/* Mount Type */}
            <div className="calc-card p-5 no-print">
              <SectionHeader title="Mount Type" />
              <div className="grid grid-cols-2 gap-3">
                {(['surface', 'fascia'] as MountType[]).map(mt => (
                  <button
                    key={mt}
                    onClick={() => update('mountType', mt)}
                    className={`rounded-lg p-4 border-2 transition-all text-left ${config.mountType === mt ? 'bg-[oklch(0.28_0.08_255)] border-[oklch(0.28_0.08_255)] text-white shadow-md' : 'bg-white border-[oklch(0.89_0.006_90)] hover:border-[oklch(0.45_0.12_255)]'}`}
                  >
                    <div className="font-semibold text-sm capitalize">{mt} Mount</div>
                    <div className={`text-xs mt-1 ${config.mountType === mt ? 'text-[oklch(0.75_0.05_255)]' : 'text-[oklch(0.52_0.018_255)]'}`}>
                      {mt === 'surface' ? 'Post bolted through deck surface' : 'Post attached to fascia board'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Rail Height & Post Config */}
            <div className="calc-card p-5 no-print">
              <SectionHeader title="Railing Configuration" />

              <FieldRow label="Rail Height (nominal)">
                <div className="flex gap-2">
                  {([36, 42] as RailHeight[]).map(rh => (
                    <button
                      key={rh}
                      onClick={() => handleRailHeightChange(rh)}
                      className={`flex-1 py-1.5 rounded border-2 text-sm font-semibold transition-all ${config.railHeight === rh ? 'bg-[oklch(0.28_0.08_255)] border-[oklch(0.28_0.08_255)] text-white' : 'border-[oklch(0.89_0.006_90)] hover:border-[oklch(0.45_0.12_255)]'}`}
                    >
                      {rh}"
                    </button>
                  ))}
                </div>
              </FieldRow>

              {/* Canada: Post Config */}
              {isCA && (
                <FieldRow label="Post Configuration" hint={'Tall: 34-40" above deck. Short: down to 24"'}>
                  <div className="flex gap-2">
                    {(['tall', 'short'] as PostConfig[]).map(pc => (
                      <button
                        key={pc}
                        onClick={() => update('postConfig', pc)}
                        className={`flex-1 py-1.5 rounded border-2 text-sm font-semibold capitalize transition-all ${config.postConfig === pc ? 'bg-[oklch(0.52_0.22_27)] border-[oklch(0.52_0.22_27)] text-white' : 'border-[oklch(0.89_0.006_90)] hover:border-[oklch(0.52_0.22_27)]'}`}
                      >
                        {pc} Post
                      </button>
                    ))}
                  </div>
                </FieldRow>
              )}

              <FieldRow label="Glass Thickness">
                <div className="flex gap-2">
                  {([12, 13] as GlassThickness[]).map(t => (
                    <button
                      key={t}
                      onClick={() => update('glassThickness', t)}
                      className={`flex-1 py-1.5 rounded border-2 text-sm font-semibold transition-all ${config.glassThickness === t ? 'bg-[oklch(0.28_0.08_255)] border-[oklch(0.28_0.08_255)] text-white' : 'border-[oklch(0.89_0.006_90)] hover:border-[oklch(0.45_0.12_255)]'}`}
                    >
                      {t}mm
                    </button>
                  ))}
                </div>
              </FieldRow>

              {/* Top Glass Reveal */}
              <UnlockableField
                label="Top Glass Reveal"
                value={config.topGlassReveal}
                onChange={handleRevealChange}
                unlocked={revealUnlocked}
                onUnlock={handleUnlockReveal}
                min={constraints.topRevealMin}
                max={constraints.topRevealMax}
                step={0.125}
                hint={revealUnlocked
                  ? `Range: ${fmt(constraints.topRevealMin, 3)}" – ${fmt(constraints.topRevealMax, 3)}"`
                  : `Default 2⅛". Click 🔓 to customize`}
              />

              {/* Bottom Glass Gap */}
              <UnlockableField
                label="Bottom Glass Gap"
                value={config.bottomGlassGap}
                onChange={v => update('bottomGlassGap', v)}
                unlocked={bottomGapUnlocked}
                onUnlock={() => setBottomGapUnlocked(!bottomGapUnlocked)}
                min={0}
                max={6}
                step={0.125}
                hint={bottomGapUnlocked ? 'Gap from deck to bottom of glass' : 'Default 2". Click 🔓 to customize'}
              />

              {/* Fascia-specific */}
              {isFascia && (
                <>
                  <FieldRow label="Fascia Offset">
                    <div className="flex gap-2">
                      {([{ v: 0.4375, l: '7/16" Standard' }, { v: 1.5, l: '1½" Extended' }] as { v: FasciaOffset; l: string }[]).map(o => (
                        <button
                          key={o.v}
                          onClick={() => update('fasciaOffset', o.v)}
                          className={`flex-1 py-1.5 rounded border-2 text-xs font-semibold transition-all ${config.fasciaOffset === o.v ? 'bg-[oklch(0.28_0.08_255)] border-[oklch(0.28_0.08_255)] text-white' : 'border-[oklch(0.89_0.006_90)] hover:border-[oklch(0.45_0.12_255)]'}`}
                        >
                          {o.l}
                        </button>
                      ))}
                    </div>
                  </FieldRow>
                  <FieldRow label="Base Plate Top to Deck" hint={'Standard = 3" (base plate top is 3" below deck)'}>
                    <NumInput
                      value={config.distTopBasePlateToDeck}
                      onChange={v => update('distTopBasePlateToDeck', v)}
                      min={0}
                      max={8}
                      step={0.125}
                    />
                  </FieldRow>
                </>
              )}

              {/* Surface: base plate gaskets */}
              {isSurface && (
                <FieldRow label="Include Base Plate Gaskets">
                  <Toggle checked={config.basePlateGaskets} onChange={v => update('basePlateGaskets', v)} />
                </FieldRow>
              )}
            </div>

            {/* Computed Dimensions Summary */}
            <div className="calc-card p-5 no-print">
              <SectionHeader title="Computed Dimensions" subtitle="Auto-calculated from your configuration" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <DimBadge label="Rail Height" value={`${fmt(result.railHeightActual, 3)}"`} />
                <DimBadge label="Post Top Above Deck" value={`${fmt(result.postHeightAboveDeck, 3)}"`} />
                {isFascia && result.physicalPostLength !== undefined && (
                  <DimBadge label="Physical Post Length" value={`${fmt(result.physicalPostLength, 3)}"`} />
                )}
                <DimBadge label="Glass Insert (Post)" value={`${fmt(result.glassInsertLength, 3)}"`} />
                <DimBadge label="Glass Insert (End Post)" value={`${fmt(result.endPostInsertLength, 3)}"`} />
                <DimBadge label="Glass Insert (Track)" value={`${fmt(result.glassInsertLengthTrack, 3)}"`} />
                <DimBadge label="Setting Block Height" value={`${fmt(result.settingBlockHeight, 3)}"`} />
                <DimBadge label="Wall Track Height" value={`${fmt(result.wallTrackHeight, 3)}"`} />
                <DimBadge label="Courier Length" value={`${result.courierLength}"`} />
              </div>
              {result.useWedgeInsteadOfBlock && (
                <div className="warning-banner mt-4 text-xs">
                  <strong>Setting Block &gt; 5":</strong> Replace setting block with wedge. Use 1.5" piece of setting block + {fmt(result.extraWedgeLength || 0, 3)}" extra wedge at each side of post.
                </div>
              )}
              {isCA && constraints.isShortPost && (
                <div className="mt-3 flex items-start gap-2 text-xs text-[oklch(0.35_0.18_27)] bg-[oklch(0.97_0.015_27)] border border-[oklch(0.75_0.12_27)] rounded p-2.5">
                  <Info size={13} className="mt-0.5 flex-shrink-0" />
                  <span>Short post configuration active — post finishes {fmt(result.postHeightAboveDeck, 2)}" above deck.</span>
                </div>
              )}
            </div>

            {/* Quantities */}
            <div className="calc-card p-5">
              <SectionHeader title="Post Quantities" />
              <div className="space-y-0">
                {[
                  { key: 'midPosts', label: '# of Mid Posts' },
                  { key: 'endPosts', label: '# of End Posts' },
                  { key: 'outsideCornerPosts', label: '# of Outside Corner Posts' },
                  { key: 'insideCornerPosts', label: '# of Inside Corner Posts' },
                  { key: 'wallTracks', label: '# of Wall Tracks' },
                  { key: 'endPostsLeft25', label: '# of 2.5" End Left Posts' },
                  { key: 'endPostsRight25', label: '# of 2.5" End Right Posts' },
                ].map(({ key, label }) => (
                  <FieldRow key={key} label={label}>
                    <NumInput
                      value={config.quantities[key as keyof typeof config.quantities]}
                      onChange={v => updateQty(key as keyof typeof config.quantities, v)}
                      min={0}
                      step={1}
                    />
                  </FieldRow>
                ))}
              </div>
            </div>

            {/* Add-Ons */}
            <div className="calc-card p-5 no-print">
              <button
                onClick={() => setShowAddOns(!showAddOns)}
                className="flex items-center justify-between w-full"
              >
                <SectionHeader title="Add-Ons & Accessories" />
                {showAddOns ? <ChevronUp size={16} className="text-[oklch(0.52_0.018_255)]" /> : <ChevronDown size={16} className="text-[oklch(0.52_0.018_255)]" />}
              </button>
              <AnimatePresence>
                {showAddOns && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-0 mt-2">
                      {isSurface && [
                        { key: 'removeTrackFromPost', label: 'Remove Track From Post' },
                        { key: 'cutDownTrack', label: 'Cut Down One Track' },
                        { key: 'add5x5BasePlate', label: 'Add 5"×5"×0.5" Base Plate (Infinity Post)' },
                        { key: 'addWeldedSurfaceBase', label: 'Add Welded Surface Base' },
                        { key: 'addWeldedExtrudedSideMount', label: 'Add Welded Extruded Side Mount 1.9 Pipe' },
                      ].map(({ key, label }) => (
                        <FieldRow key={key} label={label}>
                          <NumInput
                            value={config.addOns[key as keyof typeof config.addOns]}
                            onChange={v => updateAddOn(key as keyof typeof config.addOns, v)}
                            min={0}
                          />
                        </FieldRow>
                      ))}
                      {isFascia && [
                        { key: 'removeTrackFromPost', label: 'Remove Track From Post' },
                        { key: 'cutDownTrack', label: 'Cut Down One Track' },
                        { key: 'addWeldedExtrudedSideMount', label: 'Add Welded Extruded Side Mount 1.9 Pipe' },
                      ].map(({ key, label }) => (
                        <FieldRow key={key} label={label}>
                          <NumInput
                            value={config.addOns[key as keyof typeof config.addOns]}
                            onChange={v => updateAddOn(key as keyof typeof config.addOns, v)}
                            min={0}
                          />
                        </FieldRow>
                      ))}
                      {[
                        { key: 'drinkHolders', label: 'Drink Holders' },
                        { key: 'glassShelfKits', label: 'Glass Shelf Kits' },
                        { key: 'midBasePlateCover', label: 'Mid Base Plate Covers' },
                        { key: 'outsideBasePlateCover', label: 'Outside Base Plate Covers' },
                        { key: 'insideBasePlateCover', label: 'Inside Base Plate Covers' },
                      ].map(({ key, label }) => (
                        <FieldRow key={key} label={label}>
                          <NumInput
                            value={config.addOns[key as keyof typeof config.addOns]}
                            onChange={v => updateAddOn(key as keyof typeof config.addOns, v)}
                            min={0}
                          />
                        </FieldRow>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ====== RIGHT PANEL: Live Results ====== */}
          <div className="space-y-4">

            {/* Warnings & Errors */}
            {(result.warnings.length > 0 || result.errors.length > 0 || constraints.warningMessages.length > 0) && (
              <div className="space-y-2 no-print">
                {result.errors.map((e, i) => (
                  <div key={i} className="error-banner flex items-start gap-2">
                    <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                    <span className="text-xs">{e}</span>
                  </div>
                ))}
                {[...result.warnings, ...constraints.warningMessages].map((w, i) => (
                  <div key={i} className="warning-banner flex items-start gap-2">
                    <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                    <span className="text-xs">{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Quote Header */}
            <div className="calc-card p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-[oklch(0.18_0.025_250)]">Material Quote</h2>
                  <p className="text-xs text-[oklch(0.52_0.018_255)] mt-0.5">
                    {config.country === 'US' ? '🇺🇸 United States' : '🇨🇦 Canada'} ·{' '}
                    {config.mountType === 'surface' ? 'Surface Mount' : 'Fascia Mount'} ·{' '}
                    {config.railHeight}" Rail Height ·{' '}
                    {config.glassThickness}mm Glass
                  </p>
                  {jobInfo.jobReference && (
                    <p className="text-xs text-[oklch(0.52_0.018_255)] mt-0.5">Ref: {jobInfo.jobReference}</p>
                  )}
                  {jobInfo.dealerName && (
                    <p className="text-xs text-[oklch(0.52_0.018_255)]">Dealer: {jobInfo.dealerName}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs text-[oklch(0.52_0.018_255)] uppercase tracking-wide">Job Cost</div>
                  <div className="mono text-2xl font-bold text-[oklch(0.28_0.08_255)]">
                    {fmtCurrency(result.jobCost)}
                  </div>
                  {config.discountLevel > 0 && (
                    <div className="text-xs text-[oklch(0.52_0.018_255)]">
                      {(config.discountLevel * 100).toFixed(1)}% discount applied
                    </div>
                  )}
                </div>
              </div>

              {/* Fastener info */}
              {hasContent && (
                <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-[oklch(0.96_0.004_90)] rounded">
                  <div>
                    <div className="text-xs text-[oklch(0.52_0.018_255)] uppercase tracking-wide">Deck Fasteners</div>
                    <div className="mono font-semibold text-sm">{result.deckFasteners} required</div>
                    <div className="text-xs text-[oklch(0.6_0.01_255)]">Not included</div>
                  </div>
                  {result.wallFasteners > 0 && (
                    <div>
                      <div className="text-xs text-[oklch(0.52_0.018_255)] uppercase tracking-wide">Wall Fasteners</div>
                      <div className="mono font-semibold text-sm">{result.wallFasteners} required</div>
                      <div className="text-xs text-[oklch(0.6_0.01_255)]">Not included</div>
                    </div>
                  )}
                </div>
              )}

              {/* Bill of Materials */}
              {hasContent ? (
                <div className="overflow-x-auto">
                  <table className="results-table w-full text-left">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th className="text-right">QTY</th>
                        <th className="text-right">Unit</th>
                        <th className="text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.lineItems.map((item, i) => (
                        <tr key={i}>
                          <td className="text-xs">{item.description}</td>
                          <td className="mono text-right text-xs">{item.qty % 1 === 0 ? item.qty : fmt(item.qty, 2)}</td>
                          <td className="mono text-right text-xs">{fmtCurrency(item.unitCost)}</td>
                          <td className="mono text-right text-xs font-medium">{fmtCurrency(item.total)}</td>
                        </tr>
                      ))}
                      {result.lineItems.some(i => i.paintCost) && (
                        <tr>
                          <td className="text-xs text-[oklch(0.52_0.018_255)] italic" colSpan={3}>Paint costs included in totals</td>
                          <td className="mono text-right text-xs text-[oklch(0.52_0.018_255)]">
                            {fmtCurrency(result.lineItems.reduce((s, i) => s + (i.paintCost || 0), 0))}
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="total-row">
                        <td colSpan={3} className="text-sm font-bold">
                          {config.glassThickness === 12 ? '12mm' : '13mm'} Job Cost
                        </td>
                        <td className="mono text-right text-sm font-bold">{fmtCurrency(result.jobCost)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-[oklch(0.6_0.01_255)]">
                  <div className="text-3xl mb-2">📐</div>
                  <p className="text-sm">Enter post quantities above to generate your material list and pricing.</p>
                </div>
              )}
            </div>

            {/* Material Details Summary */}
            {hasContent && (
              <div className="calc-card p-5">
                <SectionHeader title="Material Details" subtitle="Cut lengths and quantities for ordering" />
                <div className="space-y-2 text-xs">
                  {[
                    { label: 'Glass Insert — Post', value: fmtIn(result.glassInsertLength) },
                    { label: 'Glass Insert — End Post', value: fmtIn(result.endPostInsertLength) },
                    { label: 'Glass Insert — Wall Track', value: fmtIn(result.glassInsertLengthTrack) },
                    { label: 'Setting Block Height', value: fmtIn(result.settingBlockHeight) },
                    { label: 'Setting Block — 10 Ft Lengths', value: `${result.settingBlockLengths} lengths` },
                    { label: 'Setting Block — Per Ft', value: `${fmt(result.settingBlockFt, 2)} ft` },
                    ...(result.settingBlock15Pieces > 0 ? [{ label: 'Setting Block — 1.5" Pieces', value: `${result.settingBlock15Pieces} pcs` }] : []),
                    { label: 'Glass Wedge Pieces', value: `${result.glassWedgeQty} pcs` },
                    { label: 'Gasket Lengths', value: `${result.gasketLengths} × ${result.gasketDescription}` },
                    ...(result.useWedgeInsteadOfBlock ? [
                      { label: '⚠ Extra Wedge (each side)', value: fmtIn(result.extraWedgeLength || 0) },
                    ] : []),
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between py-1.5 border-b border-[oklch(0.93_0.004_90)] last:border-0">
                      <span className="text-[oklch(0.52_0.018_255)]">{label}</span>
                      <span className="mono font-medium text-[oklch(0.18_0.025_250)]">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="text-xs text-[oklch(0.6_0.01_255)] p-3 bg-[oklch(0.96_0.004_90)] rounded border border-[oklch(0.89_0.006_90)]">
              <strong>Note:</strong> Glass is not included with the Infinity system. Pricing based on 2026 Dealer Price List. Please ensure topless rail fastening details are acceptable to local building authorities. This calculator is for material estimation purposes — verify final sales order for accuracy.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
