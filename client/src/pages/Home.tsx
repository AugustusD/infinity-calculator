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
import { Lock, Unlock, AlertTriangle, AlertCircle, Printer, ChevronDown, ChevronUp, Info, FileSpreadsheet, Mail } from 'lucide-react';
import { exportToExcel } from '@/lib/exportExcel';
import { toast } from 'sonner';
import PostDiagram from '@/components/PostDiagram';

const DISCOUNT_STORAGE_KEY = 'ias-infinity-discount';
const DEALER_STORAGE_KEY = 'ias-infinity-dealer';
const MARKET_STORAGE_KEY = 'ias-infinity-market';
const FIRST_VISIT_KEY = 'ias-infinity-visited';

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

  const savedDealer = (() => { try { return localStorage.getItem(DEALER_STORAGE_KEY) || ''; } catch { return ''; } })();
  const savedMarket = (() => { try { return (localStorage.getItem('ias-infinity-market') as 'US' | 'CA') || 'CA'; } catch { return 'CA' as const; } })();
  const [config, setConfig] = useState<ConfigInputs>(() => ({
    ...defaultConfig(),
    discountLevel: savedDiscount,
    country: savedMarket,
    glassThickness: savedMarket === 'US' ? 12 : 13,
  }));
  const [jobInfo, setJobInfo] = useState({ dealerName: savedDealer, jobReference: '', color: '', notes: '' });
  const [showAddOns, setShowAddOns] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [revealUnlocked, setRevealUnlocked] = useState(false);
  const [bottomGapUnlocked, setBottomGapUnlocked] = useState(false);

  // Mark first visit done and persist discount
  useEffect(() => {
    try {
      localStorage.setItem(FIRST_VISIT_KEY, '1');
      localStorage.setItem(DISCOUNT_STORAGE_KEY, String(config.discountLevel));
    } catch {}
  }, [config.discountLevel]);
  // Persist dealer name
  useEffect(() => {
    try { localStorage.setItem(DEALER_STORAGE_KEY, jobInfo.dealerName); } catch {}
  }, [jobInfo.dealerName]);
  // Persist market
  useEffect(() => {
    try { localStorage.setItem(MARKET_STORAGE_KEY, config.country); } catch {}
  }, [config.country]);

  const update = useCallback(<K extends keyof ConfigInputs>(key: K, value: ConfigInputs[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateQty = useCallback((key: keyof ConfigInputs['quantities'], value: number) => {
    if (value > 0 && config.discountLevel === 0) {
      toast.warning('Infinity Discount Level is blank — please enter your dealer discount before adding quantities.', { duration: 5000 });
    }
    setConfig(prev => ({
      ...prev,
      quantities: { ...prev.quantities, [key]: Math.max(0, value) },
    }));
  }, [config.discountLevel]);

  const updateAddOn = useCallback((key: keyof ConfigInputs['addOns'], value: number | boolean | string) => {
    setConfig(prev => ({
      ...prev,
      addOns: {
        ...prev.addOns,
        [key]: typeof value === 'boolean' ? value
             : typeof value === 'string' ? value
             : Math.max(0, value),
      },
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
  const colorSelected = !!jobInfo.color && jobInfo.color !== '';
  const requireColorMsg = 'Please select a powder coat color in Job Information before exporting or printing.';

  return (
    <div className="min-h-screen" style={{ background: '#F5F5F5', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>

      {/* ====== HEADER ====== */}
      <header className="no-print" style={{ background: '#FFFFFF', borderBottom: '3px solid #B69A5A', borderTop: '3px solid #B69A5A' }}>
        <div className="container py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={IAS_LOGO_URL}
              alt="Innovative Aluminum Systems"
              style={{ height: '68px', width: 'auto', objectFit: 'contain', display: 'block' }}
            />
            <div className="flex flex-col justify-center gap-1">
              <img
                src={INFINITY_LOGO_URL}
                alt="Infinity"
                style={{ height: 'auto', width: '200px', objectFit: 'contain' }}
              />

            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-end ml-auto">
            <button
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold transition-all no-print"
              style={{ background: '#3A3A3A', color: '#FFFFFF', borderRadius: '2px', letterSpacing: '0.04em' }}
              title="Reset configuration to defaults"
            >
              <span style={{ fontSize: '14px', lineHeight: '1' }}>&#8635;</span>
              <span className="hidden sm:inline">Reset</span>
            </button>
            {/* Reset Confirmation Dialog */}
            {showResetConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
                <div className="bg-white rounded shadow-xl p-6 max-w-sm w-full mx-4" style={{ border: '2px solid #B69A5A' }}>
                  <h3 className="font-bold text-base mb-2" style={{ color: '#111' }}>Reset Configuration?</h3>
                  <p className="text-sm mb-4" style={{ color: '#555' }}>This will clear the color selection, all post quantities, all add-ons, and reset the configuration to default settings (Tall Post / 42" / 13mm CA or 12mm US). Your dealer name and discount level will be preserved.</p>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setShowResetConfirm(false)}
                      className="px-4 py-2 text-sm font-semibold"
                      style={{ background: '#F0F0F0', color: '#333', borderRadius: '2px' }}
                    >Cancel</button>
                    <button
                      onClick={() => {
                        const country = config.country;
                        setConfig(prev => ({
                          ...defaultConfig(),
                          discountLevel: prev.discountLevel,
                          country,
                          glassThickness: country === 'CA' ? 13 : 12,
                        }));
                        setJobInfo(prev => ({ ...prev, color: '', notes: '' }));
                        setRevealUnlocked(false);
                        setBottomGapUnlocked(false);
                        setShowResetConfirm(false);
                        toast.success('Configuration reset to defaults');
                      }}
                      className="px-4 py-2 text-sm font-semibold"
                      style={{ background: '#B69A5A', color: '#FFFFFF', borderRadius: '2px' }}
                    >Yes, Reset</button>
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={async () => {
                if (!colorSelected) { toast.error(requireColorMsg); return; }
                try {
                  await exportToExcel(config, result, jobInfo);
                  toast.success('Excel file downloaded');
                } catch (e) {
                  toast.error('Excel export failed');
                  console.error(e);
                }
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold transition-all no-print"
              style={{ background: '#1A5C2A', color: '#FFFFFF', borderRadius: '2px', letterSpacing: '0.04em' }}
              title="Export to Excel"
            >
              <FileSpreadsheet size={13} />
              <span className="hidden sm:inline">Export Excel</span>
            </button>
            <button
              onClick={() => {
                if (!colorSelected) { toast.error(requireColorMsg); return; }
                const subject = [jobInfo.jobReference, jobInfo.color, jobInfo.dealerName]
                  .filter(Boolean).join(' - ');
                const body = encodeURIComponent(
                  `Please find attached the Material Estimate and Excel file for:\n\nJob Reference: ${jobInfo.jobReference || '—'}\nDealer: ${jobInfo.dealerName || '—'}\nColor: ${jobInfo.color || '—'}\nMount: ${config.mountType === 'surface' ? 'Surface Mount' : 'Fascia Mount'}\nRail Height: ${config.railHeight}"\nGlass: ${config.glassThickness}mm\nJob Cost: $${result.jobCost.toFixed(2)}\n\nPlease use the Print Estimate button to save the PDF, and the Export Excel button to download the Excel file, then attach both to this email before sending.`
                );
                window.location.href = `mailto:orders@innovativealuminum.com?subject=${encodeURIComponent(subject)}&body=${body}`;
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold transition-all no-print"
              style={{ background: '#B69A5A', color: '#FFFFFF', borderRadius: '2px', letterSpacing: '0.04em' }}
              title="Email estimate"
            >
              <Mail size={13} />
              <span className="hidden sm:inline">Email Estimate</span>
            </button>
            <button
              onClick={() => { if (!colorSelected) { toast.error(requireColorMsg); return; } window.print(); }}
              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold transition-all no-print"
              style={{ background: '#111111', color: '#FFFFFF', borderRadius: '2px', letterSpacing: '0.04em' }}
            >
              <Printer size={13} />
              <span className="hidden sm:inline">Print Estimate</span>
            </button>
          </div>
        </div>
      </header>

      {/* ====== GOLD ACCENT BAR ====== */}
      <div className="no-print" style={{ background: '#B69A5A', height: '2px' }} />

      {/* ====== PRINT-ONLY JOB SUMMARY HEADER ====== */}
      <div className="print-only" style={{ background: '#FFFFFF', borderBottom: '2px solid #B69A5A', padding: '14px 24px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
          <img src={IAS_LOGO_URL} alt="Innovative Aluminum Systems" style={{ height: '44px', width: 'auto' }} />
          <img src={INFINITY_LOGO_URL} alt="Infinity" style={{ height: '24px', width: 'auto' }} />
          <span style={{ fontSize: '9px', color: '#B69A5A', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'Helvetica, Arial, sans-serif' }}>Estimation Tool</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px 20px', fontSize: '11px', fontFamily: 'Helvetica, Arial, sans-serif' }}>
          {jobInfo.dealerName && (
            <div><span style={{ color: '#888', textTransform: 'uppercase', fontSize: '8px', letterSpacing: '0.08em', display: 'block' }}>Dealer</span><strong>{jobInfo.dealerName}</strong></div>
          )}
          {jobInfo.jobReference && (
            <div><span style={{ color: '#888', textTransform: 'uppercase', fontSize: '8px', letterSpacing: '0.08em', display: 'block' }}>Job Reference</span><strong>{jobInfo.jobReference}</strong></div>
          )}
          {jobInfo.color && (
            <div><span style={{ color: '#888', textTransform: 'uppercase', fontSize: '8px', letterSpacing: '0.08em', display: 'block' }}>Color</span><strong>{jobInfo.color}</strong></div>
          )}
          <div><span style={{ color: '#888', textTransform: 'uppercase', fontSize: '8px', letterSpacing: '0.08em', display: 'block' }}>Mount Type</span><strong>{config.mountType === 'surface' ? 'Surface Mount' : 'Fascia Mount'}</strong></div>
          <div><span style={{ color: '#888', textTransform: 'uppercase', fontSize: '8px', letterSpacing: '0.08em', display: 'block' }}>Rail Height</span><strong>{config.railHeight >= 40 ? '42 1/8"' : '36 1/8"'}</strong></div>
          <div><span style={{ color: '#888', textTransform: 'uppercase', fontSize: '8px', letterSpacing: '0.08em', display: 'block' }}>Glass</span><strong>{config.glassThickness}mm</strong></div>
          <div><span style={{ color: '#888', textTransform: 'uppercase', fontSize: '8px', letterSpacing: '0.08em', display: 'block' }}>Market</span><strong>{config.country === 'US' ? 'United States (IRC)' : 'Canada (NBC)'}</strong></div>
          <div><span style={{ color: '#888', textTransform: 'uppercase', fontSize: '8px', letterSpacing: '0.08em', display: 'block' }}>Post Config</span><strong>{config.postConfig === 'tall' ? 'Tall Post' : 'Short Post'}</strong></div>
          {isFascia && (
            <div><span style={{ color: '#888', textTransform: 'uppercase', fontSize: '8px', letterSpacing: '0.08em', display: 'block' }}>Fascia Offset</span><strong>{config.fasciaOffset}"</strong></div>
          )}
        </div>
        {jobInfo.notes && (
          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #E8E4DC', fontSize: '11px', fontFamily: 'Helvetica, Arial, sans-serif' }}>
            <span style={{ color: '#888', textTransform: 'uppercase', fontSize: '8px', letterSpacing: '0.08em', display: 'block', marginBottom: '2px' }}>Notes</span>
            <span style={{ whiteSpace: 'pre-wrap' }}>{jobInfo.notes}</span>
          </div>
        )}
      </div>

      {/* ====== PRINT-ONLY: 2-column CAD + Material Quote ====== */}
      <div className="print-only print-two-col" style={{ marginBottom: '12pt' }}>
        {/* Left: CAD Diagram */}
        <PostDiagram
          mountType={config.mountType}
          railHeight={config.railHeight}
          postHeightAboveDeck={result.postHeightAboveDeck}
          isShortPost={constraints.isShortPost}
        />
        {/* Right: Material Quote */}
        <div className="calc-card p-5">
          <div className="flex items-start justify-between mb-4 pb-3" style={{ borderBottom: '2px solid #B69A5A' }}>
            <div>
              <h2 className="text-base font-black uppercase tracking-widest" style={{ color: '#111111', letterSpacing: '0.12em' }}>
                Material Estimate
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
              {jobInfo.color && (
                <p className="text-xs" style={{ color: '#6B6B6B' }}>Color: <strong style={{ color: '#111111' }}>{jobInfo.color}</strong></p>
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
            <div className="text-center py-4" style={{ color: '#6B6B6B' }}>
              <p className="text-sm">No quantities entered.</p>
            </div>
          )}
        </div>
      </div>

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
                    options={[{ value: '', label: '— Choose a color —' }, ...COLOR_OPTIONS.map(c => ({ value: c, label: c }))]}
                  />
                  {!colorSelected && (
                    <p className="text-xs mt-1 flex items-center gap-1 font-semibold" style={{ color: '#C0392B' }}>
                      <AlertTriangle size={11} /> Color selection required before printing or exporting
                    </p>
                  )}
                  {jobInfo.color === 'Custom' && (
                    <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#8A7240' }}>
                      <AlertTriangle size={11} /> Contact IAS for custom color pricing
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-widest block mb-1">Notes</label>
                  <textarea
                    value={jobInfo.notes}
                    onChange={e => setJobInfo(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Job notes, special instructions, site conditions..."
                    rows={3}
                    className="w-full px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#B69A5A] bg-white resize-y"
                    style={{ border: '1px solid #D8D8D8', borderRadius: '2px', minHeight: '60px' }}
                  />
                </div>
                <div style={{ borderTop: '1px solid #E8E4DC', paddingTop: '10px', marginTop: '4px' }}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-widest">Ship Via Courier</div>
                      <div className="text-[10px] text-[#8A8A8A] mt-0.5">(Vinyl Cut Down for courier friendly lengths)</div>
                    </div>
                    <Toggle checked={config.shipViaCourier} onChange={v => update('shipViaCourier', v)} />
                  </div>
                </div>
              </div>
            </div>

            {/* ====== POST DIAGRAM (screen only — print version is in print-two-col below) ====== */}
            <div className="no-print">
              <PostDiagram
                mountType={config.mountType}
                railHeight={config.railHeight}
                postHeightAboveDeck={result.postHeightAboveDeck}
                isShortPost={constraints.isShortPost}
              />
            </div>

            {/* Discount & Shipping — bottom left */}
            <div className="calc-card p-5 no-print">
              <SectionHeader title="Infinity Discount" />
              <div className="space-y-0">
                <FieldRow label="Infinity Discount Level" hint="Enter as % (e.g. 43.5) or decimal (e.g. 0.435)">
                  <DiscountInput
                    value={config.discountLevel}
                    onChange={v => update('discountLevel', v)}
                  />
                </FieldRow>

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


          </div>

          {/* ====== CENTRE COLUMN: Configuration ====== */}
          <div className="space-y-4">

            {/* Configuration (Mount Type + Rail Height + Post Config) */}
            <div className="calc-card p-5 no-print">
              <SectionHeader title="Configuration" />

              {/* Mount Type */}
              <FieldRow label="Mount Type">
                <div className="grid grid-cols-2 gap-2">
                  {(['surface', 'fascia'] as MountType[]).map(mt => (
                    <button
                      key={mt}
                      onClick={() => update('mountType', mt)}
                      className="p-3 text-left transition-all"
                      style={{
                        borderRadius: '2px',
                        border: config.mountType === mt ? '2px solid #B69A5A' : '2px solid #D8D8D8',
                        background: config.mountType === mt ? '#111111' : '#FFFFFF',
                        color: config.mountType === mt ? '#FFFFFF' : '#3A3A3A',
                      }}
                    >
                      <div className="font-bold text-sm capitalize" style={{ letterSpacing: '0.02em' }}>{mt} Mount</div>
                      <div className="text-xs mt-0.5" style={{ color: config.mountType === mt ? '#B69A5A' : '#6B6B6B' }}>
                        {mt === 'surface' ? 'Post screwed into deck surface' : 'Post screwed to fascia w/adequate blocking'}
                      </div>
                    </button>
                  ))}
                </div>
              </FieldRow>

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
                          // Set top reveal based on post config
                          // Short post: reveal = actualRailHeight - 24 (floors post at 24" above deck)
                          // Tall post: reveal = 2.125" (default)
                          const actualRailHeight = config.railHeight === 36 ? 36.125 : 42.125;
                          const shortReveal = actualRailHeight - 24;
                          update('topGlassReveal', pc === 'short' ? shortReveal : 2.125);
                          setRevealUnlocked(false);
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


            </div>

            {/* Material Quote — centre column, after Configuration (screen only — print version is in print-two-col) */}
            <div className="calc-card p-5 no-print">
              <div className="flex items-start justify-between mb-4 pb-3" style={{ borderBottom: '2px solid #B69A5A' }}>
                <div>
                  <h2 className="text-base font-black uppercase tracking-widest" style={{ color: '#111111', letterSpacing: '0.12em' }}>
                    Cost Estimation
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
                  {jobInfo.color && (
                    <p className="text-xs" style={{ color: '#6B6B6B' }}>Color: <strong style={{ color: '#111111' }}>{jobInfo.color}</strong></p>
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

            {/* Add-Ons */}
            <div className="calc-card p-5 no-print">
              <SectionHeader title="Add-Ons & Accessories" />
              <div className="space-y-0 mt-2">

                {/* ── SURFACE: Covers + Gaskets (full width) then Deck Fasteners ── */}
                {isSurface && (
                  <>
                    <FieldRow label="Include Base Plate Covers" >
                      <Toggle
                        checked={config.addOns.includeBasePlateCovers}
                        onChange={v => updateAddOn('includeBasePlateCovers', v)}
                      />
                    </FieldRow>
                    <FieldRow label="Include Base Plate Gaskets" >
                      <Toggle
                        checked={config.basePlateGaskets}
                        onChange={v => update('basePlateGaskets', v)}
                      />
                    </FieldRow>
                    {/* Deck Fasteners — full width for surface */}
                    <div className="pt-3 mt-1" style={{ borderTop: '1px solid #E8E4DC' }}>
                      <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#B69A5A' }}>Deck Fasteners</div>
                      <p className="text-[10px] mb-2" style={{ color: '#8A8A8A' }}>
                        Screws provided are not included in Infinity Engineering specifications.
                      </p>
                      <div className="space-y-1">
                        <label className="flex items-center gap-2 cursor-pointer py-1">
                          <input type="radio" name="deckFastenerOption" value="none"
                            checked={config.addOns.deckFastenerOption === 'none'}
                            onChange={() => updateAddOn('deckFastenerOption', 'none')}
                            className="accent-[#B69A5A]" />
                          <span className="text-xs" style={{ color: '#3A3A3A' }}>No deck fasteners</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer py-1">
                          <input type="radio" name="deckFastenerOption" value="panHead14x3"
                            checked={config.addOns.deckFastenerOption === 'panHead14x3'}
                            onChange={() => updateAddOn('deckFastenerOption', 'panHead14x3')}
                            className="accent-[#B69A5A]" />
                          <span className="text-xs" style={{ color: '#3A3A3A' }}>#14 x 3&quot; Pan Head Screws (box/100, 4 per post)</span>
                        </label>
                        {config.addOns.deckFastenerOption === 'panHead14x3' && (
                          <label className="flex items-center gap-2 cursor-pointer py-1 ml-5">
                            <input type="checkbox"
                              checked={config.addOns.includeDeckNylonWashers}
                              onChange={e => updateAddOn('includeDeckNylonWashers', e.target.checked)}
                              className="accent-[#B69A5A]" />
                            <span className="text-xs" style={{ color: '#3A3A3A' }}>Add #14 Nylon Insulators RPLSCI14 (box/100, 4 per post)</span>
                          </label>
                        )}
                        <label className="flex items-center gap-2 cursor-pointer py-1">
                          <input type="radio" name="deckFastenerOption" value="hexHead516x5"
                            checked={config.addOns.deckFastenerOption === 'hexHead516x5'}
                            onChange={() => updateAddOn('deckFastenerOption', 'hexHead516x5')}
                            className="accent-[#B69A5A]" />
                          <span className="text-xs" style={{ color: '#3A3A3A' }}>5/16&quot; x 5&quot; Hex Head Screws (box/50, 4 per post)</span>
                        </label>
                        {config.addOns.deckFastenerOption === 'hexHead516x5' && (
                          <label className="flex items-center gap-2 cursor-pointer py-1 ml-5">
                            <input type="checkbox"
                              checked={config.addOns.includeDeckNylonWashers}
                              onChange={e => updateAddOn('includeDeckNylonWashers', e.target.checked)}
                              className="accent-[#B69A5A]" />
                            <span className="text-xs" style={{ color: '#3A3A3A' }}>Add 5/16&quot; Nylon Insulators RPLSCI516 (box/100, 4 per post)</span>
                          </label>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* ── FASCIA: Shims (left) + Deck Fasteners (right) side by side ── */}
                {isFascia && (
                  <div className="grid grid-cols-2 gap-4 mb-2">
                    {/* Left: Shims */}
                    <div>
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <div className="text-xs font-semibold" style={{ color: '#3A3A3A' }}>Include Shims</div>
                          <div className="text-[11px]" style={{ color: '#8A8A8A' }}>(1/4&quot; Base Plate Gaskets)</div>
                        </div>
                        <Toggle
                          checked={config.addOns.includeShims}
                          onChange={v => updateAddOn('includeShims', v)}
                        />
                      </div>
                    </div>
                    {/* Right: Deck Fasteners */}
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest mb-1 pt-2" style={{ color: '#B69A5A' }}>Deck Fasteners</div>
                      <p className="text-[10px] mb-2" style={{ color: '#8A8A8A' }}>
                        Not in Infinity Engineering specs.
                      </p>
                      <div className="space-y-1">
                        <label className="flex items-center gap-2 cursor-pointer py-1">
                          <input type="radio" name="deckFastenerOption" value="none"
                            checked={config.addOns.deckFastenerOption === 'none'}
                            onChange={() => updateAddOn('deckFastenerOption', 'none')}
                            className="accent-[#B69A5A]" />
                          <span className="text-xs" style={{ color: '#3A3A3A' }}>No fasteners</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer py-1">
                          <input type="radio" name="deckFastenerOption" value="hexHead516x5"
                            checked={config.addOns.deckFastenerOption === 'hexHead516x5'}
                            onChange={() => updateAddOn('deckFastenerOption', 'hexHead516x5')}
                            className="accent-[#B69A5A]" />
                          <span className="text-xs" style={{ color: '#3A3A3A' }}>5/16&quot; x 5&quot; Hex Head (box/50)</span>
                        </label>
                        {config.addOns.deckFastenerOption === 'hexHead516x5' && (
                          <label className="flex items-center gap-2 cursor-pointer py-1 ml-5">
                            <input type="checkbox"
                              checked={config.addOns.includeShoulderWashers}
                              onChange={e => updateAddOn('includeShoulderWashers', e.target.checked)}
                              className="accent-[#B69A5A]" />
                            <span className="text-xs" style={{ color: '#3A3A3A' }}>Add 5/16&quot; Nylon RPLSCI516 (box/100)</span>
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Other Add-Ons ── */}
                <div className="pt-3 mt-1" style={{ borderTop: '1px solid #E8E4DC' }}>
                  <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#B69A5A' }}>Other Add-Ons</div>
                </div>
                {isSurface && (
                  <>
                    <FieldRow label="Remove Track From Post">
                      <NumInput value={config.addOns.removeTrackFromPost} onChange={v => updateAddOn('removeTrackFromPost', v)} min={0} />
                    </FieldRow>

                    {/* 5x5 base plate with per-post-type sub-spinners */}
                    <FieldRow label='Add 5"×5"×0.5" Base Plate'>
                      <NumInput
                        value={config.addOns.add5x5BasePlate}
                        onChange={v => {
                          updateAddOn('add5x5BasePlate', v);
                          // If reduced below current assigned total, zero out sub-spinners
                          const assigned = config.addOns.basePlate5x5_midPost + config.addOns.basePlate5x5_outsideCorner + config.addOns.basePlate5x5_insideCorner + config.addOns.basePlate5x5_endPost25;
                          if (v < assigned) {
                            updateAddOn('basePlate5x5_midPost', 0);
                            updateAddOn('basePlate5x5_outsideCorner', 0);
                            updateAddOn('basePlate5x5_insideCorner', 0);
                            updateAddOn('basePlate5x5_endPost25', 0);
                          }
                        }}
                        min={0}
                      />
                    </FieldRow>

                    {config.addOns.add5x5BasePlate > 0 && (() => {
                      const assigned = config.addOns.basePlate5x5_midPost + config.addOns.basePlate5x5_outsideCorner + config.addOns.basePlate5x5_insideCorner + config.addOns.basePlate5x5_endPost25;
                      const remaining = config.addOns.add5x5BasePlate - assigned;
                      const isOver = assigned > config.addOns.add5x5BasePlate;
                      return (
                        <div className="ml-4 mb-2 rounded" style={{ background: '#F9F7F3', border: '1px solid #E8E4DC', padding: '8px 10px' }}>
                          <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#B69A5A' }}>Post Type Breakdown</div>
                          <div className="text-xs mb-2" style={{ color: isOver ? '#C0392B' : remaining === 0 ? '#27AE60' : '#6B6B6B' }}>
                            {isOver
                              ? `⚠ Over-assigned by ${assigned - config.addOns.add5x5BasePlate}`
                              : remaining === 0
                                ? '✓ All plates assigned'
                                : `${remaining} plate${remaining !== 1 ? 's' : ''} unassigned`}
                          </div>
                          {([
                            { key: 'basePlate5x5_midPost' as const,        label: 'MP/EP — Mid & End Posts',   max: config.quantities.midPosts + config.quantities.endPosts },
                            { key: 'basePlate5x5_outsideCorner' as const,  label: 'OC — Outside Corner Posts', max: config.quantities.outsideCornerPosts },
                            { key: 'basePlate5x5_insideCorner' as const,   label: 'IC — Inside Corner Posts',  max: config.quantities.insideCornerPosts },
                            { key: 'basePlate5x5_endPost25' as const,      label: '2.5" EP — 2.5" End Posts',  max: config.quantities.endPostsLeft25 + config.quantities.endPostsRight25 },
                          ] as { key: keyof typeof config.addOns; label: string; max: number }[]).filter(({ max }) => max > 0).map(({ key, label, max }) => (
                            <div key={key} className="flex items-center gap-2 py-1 border-b border-[#EBEBEB] last:border-0">
                              <span className="text-xs flex-1" style={{ color: '#3A3A3A' }}>{label}</span>
                              <div className="w-20">
                                <NumInput
                                  value={config.addOns[key] as number}
                                  onChange={v => updateAddOn(key, Math.min(v, max))}
                                  min={0}
                                  max={max}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    <FieldRow label="Add Welded Surface Base">
                      <NumInput value={config.addOns.addWeldedSurfaceBase} onChange={v => updateAddOn('addWeldedSurfaceBase', v)} min={0} />
                    </FieldRow>
                    <FieldRow label="Add Welded Extruded Side Mount 1.9 Pipe">
                      <NumInput value={config.addOns.addWeldedExtrudedSideMount} onChange={v => updateAddOn('addWeldedExtrudedSideMount', v)} min={0} />
                    </FieldRow>
                  </>
                )}
                {isFascia && [
                  { key: 'removeTrackFromPost', label: 'Remove Track From Post' },
                  { key: 'addWeldedExtrudedSideMount', label: 'Add Welded Extruded Side Mount 1.9 Pipe' },
                ].map(({ key, label }) => (
                  <FieldRow key={key} label={label}>
                    <NumInput
                      value={config.addOns[key as keyof typeof config.addOns] as number}
                      onChange={v => updateAddOn(key as keyof typeof config.addOns, v)}
                      min={0}
                    />
                  </FieldRow>
                ))}
                <FieldRow label="Glass Shelf Kits">
                  <NumInput
                    value={config.addOns.glassShelfKits}
                    onChange={v => updateAddOn('glassShelfKits', v)}
                    min={0}
                  />
                </FieldRow>
              </div>
            </div>


          </div>
          {/* ====== RIGHT COLUMN: Post Quantities, Computed Dimensions, Material Details, Footer ====== */}
          <div className="space-y-4">

            {/* Post Quantities — top of right column */}
            <div className="calc-card p-5 no-print">
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

            {/* Computed Dimensions Summary — above Material Details */}
            <div className="calc-card p-5 no-print">
              <SectionHeader title="Computed Dimensions" subtitle="Auto-calculated from your configuration" />
              <div className="grid grid-cols-2 gap-4">
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

            {/* Material Details Summary */}
            {hasContent && (
              <div className="calc-card p-5">
                <SectionHeader title="Material Details" subtitle="Cut lengths and quantities for ordering" />
                <div className="space-y-0 text-xs">
                  {[
                    // Overall post heights
                    ...(isSurface ? [
                      { label: 'Post Height Above Deck', value: fmtIn(result.postHeightAboveDeck) },
                      { label: '2.5" End Post Height', value: fmtIn(result.endPost25Height) },
                    ] : [
                      { label: 'Post Height Above Deck', value: fmtIn(result.postHeightAboveDeck) },
                      { label: 'Physical Post Length (overall)', value: fmtIn(result.physicalPostLength || 0) },
                      { label: '2.5" End Post Overall Length', value: fmtIn(result.endPost25Height) },
                    ]),
                    // Wall track height (only if wall tracks are used)
                    ...(config.quantities.wallTracks > 0 ? [{ label: 'Wall Track Height', value: fmtIn(result.wallTrackHeight) }] : []),
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
              <strong style={{ color: '#3A3A3A' }}>Note:</strong> Glass is not included with the Infinity system. Pricing based on 2026 Dealer Price List. Please ensure topless rail fastening details are acceptable to local building authorities. All material quantities and types should be checked by the dealer prior to sending customer estimates or orders to Innovative Aluminum Systems.
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
