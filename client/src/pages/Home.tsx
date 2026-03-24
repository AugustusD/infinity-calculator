/**
 * Infinity Glass Railing Calculator — Main Page
 * Brand: Innovative Aluminum Systems
 * Design: Helvetica, gold (#B69A5A), black, grey, white, yellow highlight (#f4ce47)
 * Layout: 3-column — Left (job info, market, discount, diagram) | Centre (configuration) | Right (quote, details, disclaimer)
 * Discount level persisted via localStorage key "ias-infinity-discount"
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
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
import PostDiagram from '@/components/PostDiagram';

const DISCOUNT_STORAGE_KEY = 'ias-infinity-discount';

// CDN URLs for logos
const IAS_LOGO_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663093943154/Vxc6ufyoD2HuhTpJtdEazX/ias-logo-2024_bbb213b4.webp';
const INFINITY_LOGO_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663093943154/Vxc6ufyoD2HuhTpJtdEazX/infinity-logo_2a84a66e.png';

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
      <h3 className="section-label mb-0.5">{title}</h3>
      {subtitle && <p className="text-xs text-[#6B6B6B]">{subtitle}</p>}
    </div>
  );
}

function FieldRow({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-[#EBEBEB] last:border-0">
      <div className="w-44 flex-shrink-0">
        <span className="text-sm text-[#3A3A3A]">{label}</span>
        {hint && <p className="text-xs text-[#6B6B6B] mt-0.5">{hint}</p>}
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
      className={`mono w-full rounded border border-[#D8D8D8] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#B69A5A] disabled:bg-[#F5F5F5] disabled:cursor-not-allowed bg-white ${className}`}
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
      className="w-full rounded border border-[#D8D8D8] px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#B69A5A]"
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
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-[#B69A5A]' : 'bg-[#D8D8D8]'}`}
      >
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
      {label && <span className="text-sm text-[#3A3A3A]">{label}</span>}
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
          <span className="absolute right-8 top-1/2 -translate-y-1/2 text-xs text-[#6B6B6B]">{unit}</span>
        </div>
        <button
          onClick={onUnlock}
          title={unlocked ? 'Lock to default' : 'Unlock to customize'}
          className={`p-1.5 rounded transition-colors ${unlocked ? 'text-[#8A7240] bg-[#F5F0E8] hover:bg-[#EDE5D0]' : 'text-[#6B6B6B] bg-[#F5F5F5] hover:bg-[#EBEBEB]'}`}
        >
          {unlocked ? <Unlock size={14} /> : <Lock size={14} />}
        </button>
      </div>
    </FieldRow>
  );
}

function DiscountInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  // Display as percentage string while editing; accept both "43.5" and "0.435" on blur
  const [raw, setRaw] = useState(() => value > 0 ? (value * 100).toFixed(3).replace(/\.?0+$/, '') : '');
  const [focused, setFocused] = useState(false);

  // Keep display in sync when value changes externally (e.g. on load)
  useEffect(() => {
    if (!focused) {
      setRaw(value > 0 ? (value * 100).toFixed(3).replace(/\.?0+$/, '') : '');
    }
  }, [value, focused]);

  const commit = (input: string) => {
    const trimmed = input.trim();
    if (trimmed === '' || trimmed === '0') { onChange(0); setRaw(''); return; }
    let n = parseFloat(trimmed);
    if (isNaN(n)) { setRaw(value > 0 ? (value * 100).toFixed(3).replace(/\.?0+$/, '') : ''); return; }
    // If user typed a decimal < 1 treat as already a fraction (e.g. 0.435)
    if (n > 0 && n < 1) { /* already fractional */ }
    else { n = n / 100; } // convert percentage to decimal
    n = Math.max(0, Math.min(0.99, n));
    onChange(n);
    setRaw((n * 100).toFixed(3).replace(/\.?0+$/, ''));
  };

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        value={focused ? raw : (value > 0 ? (value * 100).toFixed(3).replace(/\.?0+$/, '') : '')}
        placeholder="e.g. 43.5"
        onFocus={e => { setFocused(true); e.target.select(); }}
        onBlur={e => { setFocused(false); commit(e.target.value); }}
        onChange={e => setRaw(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }}
        className="mono w-full rounded border border-[#D8D8D8] px-3 py-1.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[#B69A5A] bg-white"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold pointer-events-none" style={{ color: '#B69A5A' }}>%</span>
    </div>
  );
}

function DimBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] text-[#6B6B6B] uppercase tracking-wide mb-0.5">{label}</span>
      <span className="dim-badge">{value}</span>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Home() {
  // Load saved discount from localStorage on first render
  const savedDiscount = (() => {
    try {
      const v = localStorage.getItem(DISCOUNT_STORAGE_KEY);
      if (v !== null) {
        const n = parseFloat(v);
        if (!isNaN(n) && n >= 0 && n < 1) return n;
      }
    } catch {}
    return 0;
  })();

  const [config, setConfig] = useState<ConfigInputs>(() => ({
    ...defaultConfig(),
    discountLevel: savedDiscount,
  }));
  const [jobInfo, setJobInfo] = useState({ dealerName: '', jobReference: '', color: 'Innovative Series Black' });
  const [showAddOns, setShowAddOns] = useState(false);
  const [revealUnlocked, setRevealUnlocked] = useState(false);
  const [bottomGapUnlocked, setBottomGapUnlocked] = useState(false);

  // Persist discount whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(DISCOUNT_STORAGE_KEY, String(config.discountLevel));
    } catch {}
  }, [config.discountLevel]);

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

  const result: CalculationResult = useMemo(() => calculate(config), [config]);

  const isUS = config.country === 'US';
  const isCA = config.country === 'CA';
  const isFascia = config.mountType === 'fascia';
  const isSurface = config.mountType === 'surface';

  const handleCountryChange = (c: Country) => {
    update('country', c);
    update('topGlassReveal', 2.125);
    update('postConfig', 'tall');
    setRevealUnlocked(false);
  };

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
      update('topGlassReveal', 2.125);
    }
    setRevealUnlocked(!revealUnlocked);
  };

  const hasContent = config.quantities.midPosts + config.quantities.endPosts +
    config.quantities.outsideCornerPosts + config.quantities.insideCornerPosts +
    config.quantities.wallTracks + config.quantities.endPostsLeft25 + config.quantities.endPostsRight25 > 0;

  return (
    <div className="min-h-screen" style={{ background: '#F5F5F5', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>

      {/* ====== HEADER ====== */}
      <header className="no-print" style={{ background: '#FFFFFF', borderBottom: '3px solid #B69A5A', borderTop: '3px solid #B69A5A' }}>
        <div className="container py-3 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <img
              src={IAS_LOGO_URL}
              alt="Innovative Aluminum Systems"
              style={{ height: '56px', width: 'auto', objectFit: 'contain', display: 'block' }}
            />
            <div className="flex flex-col justify-center">
              <img
                src={INFINITY_LOGO_URL}
                alt="Infinity"
                className="h-14 w-auto object-contain"
              />
              <span className="text-[10px] tracking-[0.18em] uppercase mt-0.5" style={{ color: '#B69A5A', letterSpacing: '0.18em' }}>
                Railing Calculator
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs hidden sm:block" style={{ color: '#6B6B6B', letterSpacing: '0.06em' }}>
              2026 Dealer Pricing
            </span>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-all"
              style={{ background: '#111111', color: '#FFFFFF', borderRadius: '2px', letterSpacing: '0.04em' }}
            >
              <Printer size={13} />
              Print Quote
            </button>
          </div>
        </div>
      </header>

      {/* ====== GOLD ACCENT BAR ====== */}
      <div className="no-print" style={{ background: '#B69A5A', height: '2px' }} />

      <div className="container py-6">
        {/* 3-column layout: left sidebar (320px) | centre config | right quote (360px) */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_360px] gap-6">

          {/* ====== LEFT COLUMN ====== */}
          <div className="space-y-4">

            {/* Job Info */}
            <div className="calc-card p-5 no-print">
              <SectionHeader title="Job Information" />
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-widest block mb-1">Dealer Name</label>
                  <input
                    type="text"
                    value={jobInfo.dealerName}
                    onChange={e => setJobInfo(p => ({ ...p, dealerName: e.target.value }))}
                    placeholder="Enter dealer name"
                    className="w-full px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#B69A5A] bg-white"
                    style={{ border: '1px solid #D8D8D8', borderRadius: '2px' }}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-widest block mb-1">Job Reference</label>
                  <input
                    type="text"
                    value={jobInfo.jobReference}
                    onChange={e => setJobInfo(p => ({ ...p, jobReference: e.target.value }))}
                    placeholder="Project / job name"
                    className="w-full px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#B69A5A] bg-white"
                    style={{ border: '1px solid #D8D8D8', borderRadius: '2px' }}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-widest block mb-1">Color</label>
                  <SelectInput
                    value={jobInfo.color}
                    onChange={v => setJobInfo(p => ({ ...p, color: v }))}
                    options={COLOR_OPTIONS.map(c => ({ value: c, label: c }))}
                  />
                  {jobInfo.color === 'Custom' && (
                    <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#8A7240' }}>
                      <AlertTriangle size={11} /> Contact IAS for custom color pricing
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Country Selection */}
            <div className="calc-card p-5 no-print">
              <SectionHeader title="Market" subtitle="Select your country for code-compliant configuration" />
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleCountryChange('US')}
                  className="p-4 text-center transition-all"
                  style={{
                    borderRadius: '2px',
                    border: config.country === 'US' ? '2px solid #B69A5A' : '2px solid #D8D8D8',
                    background: config.country === 'US' ? '#111111' : '#FFFFFF',
                    color: config.country === 'US' ? '#FFFFFF' : '#3A3A3A',
                  }}
                >
                  <div className="text-2xl mb-1">🇺🇸</div>
                  <div className="font-bold text-sm" style={{ letterSpacing: '0.02em' }}>United States</div>
                  <div className="text-xs mt-0.5 opacity-70">IRC Code</div>
                  {config.country === 'US' && (
                    <div className="mt-1.5 text-[10px] font-bold tracking-widest uppercase" style={{ color: '#B69A5A' }}>US</div>
                  )}
                </button>
                <button
                  onClick={() => handleCountryChange('CA')}
                  className="p-4 text-center transition-all"
                  style={{
                    borderRadius: '2px',
                    border: config.country === 'CA' ? '2px solid #B69A5A' : '2px solid #D8D8D8',
                    background: config.country === 'CA' ? '#111111' : '#FFFFFF',
                    color: config.country === 'CA' ? '#FFFFFF' : '#3A3A3A',
                  }}
                >
                  <div className="text-2xl mb-1">🇨🇦</div>
                  <div className="font-bold text-sm" style={{ letterSpacing: '0.02em' }}>Canada</div>
                  <div className="text-xs mt-0.5 opacity-70">NBC Code</div>
                </button>
              </div>
            </div>

            {/* Discount & Shipping */}
            <div className="calc-card p-5 no-print">
              <SectionHeader title="Discount" />
              <div className="space-y-0">
                <FieldRow label="Discount Level" hint="Enter as % (e.g. 43.5) or decimal (e.g. 0.435)">
                  <DiscountInput
                    value={config.discountLevel}
                    onChange={v => update('discountLevel', v)}
                  />
                </FieldRow>
                <FieldRow label="Ship Via Courier">
                  <Toggle checked={config.shipViaCourier} onChange={v => update('shipViaCourier', v)} />
                </FieldRow>
              </div>
            </div>

            {/* ====== POST DIAGRAM ====== */}
            <PostDiagram
              mountType={config.mountType}
              railHeight={config.railHeight}
              postHeightAboveDeck={result.postHeightAboveDeck}
              isShortPost={constraints.isShortPost}
              topGlassReveal={config.topGlassReveal}
              bottomGlassGap={config.bottomGlassGap}
            />
          </div>

          {/* ====== CENTRE COLUMN: Configuration ====== */}
          <div className="space-y-4">

            {/* Mount Type */}
            <div className="calc-card p-5 no-print">
              <SectionHeader title="Mount Type" />
              <div className="grid grid-cols-2 gap-3">
                {(['surface', 'fascia'] as MountType[]).map(mt => (
                  <button
                    key={mt}
                    onClick={() => update('mountType', mt)}
                    className="p-4 text-left transition-all"
                    style={{
                      borderRadius: '2px',
                      border: config.mountType === mt ? '2px solid #B69A5A' : '2px solid #D8D8D8',
                      background: config.mountType === mt ? '#111111' : '#FFFFFF',
                      color: config.mountType === mt ? '#FFFFFF' : '#3A3A3A',
                    }}
                  >
                    <div className="font-bold text-sm capitalize" style={{ letterSpacing: '0.02em' }}>{mt} Mount</div>
                    <div className="text-xs mt-1" style={{ color: config.mountType === mt ? '#B69A5A' : '#6B6B6B' }}>
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
                      className="flex-1 py-1.5 text-sm font-bold transition-all"
                      style={{
                        borderRadius: '2px',
                        border: config.railHeight === rh ? '2px solid #B69A5A' : '2px solid #D8D8D8',
                        background: config.railHeight === rh ? '#111111' : '#FFFFFF',
                        color: config.railHeight === rh ? '#f4ce47' : '#3A3A3A',
                      }}
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
                        onClick={() => {
                          update('postConfig', pc as PostConfig);
                          if (config.country === 'CA') {
                            update('topGlassReveal', pc === 'short' ? 18.125 : 2.125);
                            setRevealUnlocked(false);
                          }
                        }}
                        className="flex-1 py-1.5 text-sm font-bold capitalize transition-all"
                        style={{
                          borderRadius: '2px',
                          border: config.postConfig === pc ? '2px solid #B69A5A' : '2px solid #D8D8D8',
                          background: config.postConfig === pc ? '#B69A5A' : '#FFFFFF',
                          color: config.postConfig === pc ? '#111111' : '#3A3A3A',
                        }}
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
                      className="flex-1 py-1.5 text-sm font-bold transition-all"
                      style={{
                        borderRadius: '2px',
                        border: config.glassThickness === t ? '2px solid #B69A5A' : '2px solid #D8D8D8',
                        background: config.glassThickness === t ? '#111111' : '#FFFFFF',
                        color: config.glassThickness === t ? '#f4ce47' : '#3A3A3A',
                      }}
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
                  ? `Range: ${fmt(constraints.topRevealMin, 3)}" - ${fmt(constraints.topRevealMax, 3)}"`
                  : `Default 2-1/8". Click lock to customize`}
              />

              <UnlockableField
                label="Bottom Glass Gap"
                value={config.bottomGlassGap}
                onChange={v => update('bottomGlassGap', v)}
                unlocked={bottomGapUnlocked}
                onUnlock={() => setBottomGapUnlocked(!bottomGapUnlocked)}
                min={0}
                max={6}
                step={0.125}
                hint={bottomGapUnlocked ? 'Gap from deck to bottom of glass' : 'Default 2". Click lock to customize'}
              />

              {/* Fascia-specific */}
              {isFascia && (
                <>
                  <FieldRow label="Fascia Offset">
                    <div className="flex gap-2">
                      {([{ v: 0.4375, l: '7/16" Standard' }, { v: 1.5, l: '1-1/2" Extended' }] as { v: FasciaOffset; l: string }[]).map(o => (
                        <button
                          key={o.v}
                          onClick={() => update('fasciaOffset', o.v)}
                          className="flex-1 py-1.5 text-xs font-bold transition-all"
                          style={{
                            borderRadius: '2px',
                            border: config.fasciaOffset === o.v ? '2px solid #B69A5A' : '2px solid #D8D8D8',
                            background: config.fasciaOffset === o.v ? '#111111' : '#FFFFFF',
                            color: config.fasciaOffset === o.v ? '#f4ce47' : '#3A3A3A',
                          }}
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
                <div className="mt-3 flex items-start gap-2 text-xs rounded p-2.5" style={{ background: '#FFFBEB', border: '1px solid #D4B97A', color: '#5C4A1E' }}>
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
                {showAddOns
                  ? <ChevronUp size={16} style={{ color: '#B69A5A' }} />
                  : <ChevronDown size={16} style={{ color: '#B69A5A' }} />}
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
                        { key: 'add5x5BasePlate', label: 'Add 5"x5"x0.5" Base Plate (Infinity Post)' },
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

          {/* ====== RIGHT COLUMN: Quote & Details ====== */}
          <div className="space-y-4">

            {/* Warnings & Errors */}
            {(result.warnings.length > 0 || result.errors.length > 0 || constraints.warningMessages.length > 0) && (
              <div className="space-y-2">
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

            {/* Quote Card */}
            <div className="calc-card p-5">
              <div className="flex items-start justify-between mb-4 pb-3" style={{ borderBottom: '2px solid #B69A5A' }}>
                <div>
                  <h2 className="text-base font-black uppercase tracking-widest" style={{ color: '#111111', letterSpacing: '0.12em' }}>
                    Material Quote
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: '#6B6B6B' }}>
                    {config.mountType === 'surface' ? 'Surface Mount' : 'Fascia Mount'} &middot;{' '}
                    {config.railHeight}" Rail &middot; {config.glassThickness}mm Glass
                  </p>
                  {jobInfo.jobReference && (
                    <p className="text-xs mt-0.5" style={{ color: '#6B6B6B' }}>Ref: {jobInfo.jobReference}</p>
                  )}
                  {jobInfo.dealerName && (
                    <p className="text-xs" style={{ color: '#6B6B6B' }}>Dealer: {jobInfo.dealerName}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#6B6B6B' }}>Job Cost</div>
                  <div className="mono text-2xl font-black" style={{ color: '#111111' }}>
                    {fmtCurrency(result.jobCost)}
                  </div>
                  {config.discountLevel > 0 && (
                    <div className="text-xs" style={{ color: '#B69A5A' }}>
                      {(config.discountLevel * 100).toFixed(1)}% discount applied
                    </div>
                  )}
                </div>
              </div>

              {/* Fastener info */}
              {hasContent && (
                <div className="grid grid-cols-2 gap-3 mb-4 p-3 rounded" style={{ background: '#F5F5F5', border: '1px solid #EBEBEB' }}>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#6B6B6B' }}>Deck Fasteners</div>
                    <div className="mono font-bold text-sm" style={{ color: '#111111' }}>{result.deckFasteners} required</div>
                    <div className="text-xs" style={{ color: '#6B6B6B' }}>Not included</div>
                  </div>
                  {result.wallFasteners > 0 && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#6B6B6B' }}>Wall Fasteners</div>
                      <div className="mono font-bold text-sm" style={{ color: '#111111' }}>{result.wallFasteners} required</div>
                      <div className="text-xs" style={{ color: '#6B6B6B' }}>Not included</div>
                    </div>
                  )}
                </div>
              )}

              {/* Bill of Materials */}
              {hasContent ? (
                <div className="overflow-x-auto">
                  <table className="results-table w-full text-left">
                    <thead>
                      <tr style={{ background: '#111111' }}>
                        <th style={{ color: '#B69A5A' }}>Description</th>
                        <th className="text-right" style={{ color: '#B69A5A' }}>QTY</th>
                        <th className="text-right" style={{ color: '#B69A5A' }}>Unit</th>
                        <th className="text-right" style={{ color: '#B69A5A' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.lineItems.map((item, i) => (
                        <tr key={i}>
                          <td className="text-xs">{item.description}</td>
                          <td className="mono text-right text-xs">{item.qty % 1 === 0 ? item.qty : fmt(item.qty, 2)}</td>
                          <td className="mono text-right text-xs">{fmtCurrency(item.unitCost)}</td>
                          <td className="mono text-right text-xs font-bold">{fmtCurrency(item.total)}</td>
                        </tr>
                      ))}
                      {result.lineItems.some(i => i.paintCost) && (
                        <tr>
                          <td className="text-xs italic" colSpan={3} style={{ color: '#6B6B6B' }}>Paint costs included in totals</td>
                          <td className="mono text-right text-xs" style={{ color: '#6B6B6B' }}>
                            {fmtCurrency(result.lineItems.reduce((s, i) => s + (i.paintCost || 0), 0))}
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="total-row">
                        <td colSpan={3} className="text-sm font-black uppercase tracking-wide" style={{ color: '#111111' }}>
                          {config.glassThickness === 12 ? '12mm' : '13mm'} Job Cost
                        </td>
                        <td className="mono text-right text-sm font-black" style={{ color: '#111111' }}>{fmtCurrency(result.jobCost)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8" style={{ color: '#6B6B6B' }}>
                  <div className="mb-3">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded" style={{ background: '#F5F0E8', border: '1px solid #D4B97A' }}>
                      <span style={{ color: '#B69A5A', fontSize: '1.25rem' }}>&#9656;</span>
                    </div>
                  </div>
                  <p className="text-sm">Enter post quantities above to generate your material list and pricing.</p>
                </div>
              )}
            </div>

            {/* Material Details Summary */}
            {hasContent && (
              <div className="calc-card p-5">
                <SectionHeader title="Material Details" subtitle="Cut lengths and quantities for ordering" />
                <div className="space-y-0 text-xs">
                  {[
                    { label: 'Glass Insert — Post', value: fmtIn(result.glassInsertLength) },
                    { label: 'Glass Insert — End Post', value: fmtIn(result.endPostInsertLength) },
                    { label: 'Glass Insert — Wall Track', value: fmtIn(result.glassInsertLengthTrack) },
                    { label: 'Setting Block Height', value: fmtIn(result.settingBlockHeight) },
                    { label: 'Setting Block — 10 Ft Lengths', value: `${result.settingBlockLengths} lengths` },
                    { label: 'Setting Block — Per Ft', value: `${fmt(result.settingBlockFt, 2)} ft` },
                    ...(result.settingBlock15Pieces > 0 ? [{ label: 'Setting Block — 1.5" Pieces', value: `${result.settingBlock15Pieces} pcs` }] : []),
                    { label: 'Glass Wedge Pieces', value: `${result.glassWedgeQty} pcs` },
                    { label: 'Gasket Lengths', value: `${result.gasketLengths} x ${result.gasketDescription}` },
                    ...(result.useWedgeInsteadOfBlock ? [
                      { label: 'Extra Wedge (each side)', value: fmtIn(result.extraWedgeLength || 0) },
                    ] : []),
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between py-1.5" style={{ borderBottom: '1px solid #EBEBEB' }}>
                      <span style={{ color: '#6B6B6B' }}>{label}</span>
                      <span className="mono font-bold" style={{ color: '#111111' }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="text-xs p-3 rounded" style={{ color: '#6B6B6B', background: '#F5F5F5', border: '1px solid #D8D8D8' }}>
              <strong style={{ color: '#3A3A3A' }}>Note:</strong> Glass is not included with the Infinity system. Pricing based on 2026 Dealer Price List. Please ensure topless rail fastening details are acceptable to local building authorities. This calculator is for material estimation purposes — verify final sales order for accuracy.
            </div>

            {/* IAS footer branding */}
            <div className="flex items-center justify-center gap-3 py-2 no-print">
              <img src={IAS_LOGO_URL} alt="Innovative Aluminum Systems" className="h-6 w-auto opacity-60" />
              <span className="text-[10px] tracking-widest uppercase" style={{ color: '#B69A5A' }}>Innovative Aluminum Systems</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
