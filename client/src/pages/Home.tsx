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
import { Lock, Unlock, AlertTriangle, AlertCircle, Printer, ChevronDown, ChevronUp, Info, FileSpreadsheet, Mail, RotateCcw, Save } from 'lucide-react';
import { exportToExcel } from '@/lib/exportExcel';
import { toast } from 'sonner';
import PostDiagram from '@/components/PostDiagram';

const DISCOUNT_STORAGE_KEY = 'ias-infinity-discount';
const DEALER_STORAGE_KEY = 'ias-infinity-dealer';
const MARKET_STORAGE_KEY = 'ias-infinity-market';
const FIRST_VISIT_KEY = 'ias-infinity-visited';
const DRAFT_STORAGE_KEY = 'ias-infinity-current-draft';
const SAVED_JOBS_KEY = 'ias-infinity-saved-jobs';

interface SavedJob {
  id: string;
  savedAt: number;
  jobReference: string;
  dealerName: string;
  color: string;
  mountType: 'surface' | 'fascia';
  railHeight: number;
  glassThickness: number;
  jobCost: number;
  config: ConfigInputs;
  jobInfo: { dealerName: string; jobReference: string; color: string; notes: string };
  revealUnlocked: boolean;
  bottomGapUnlocked: boolean;
}

interface DraftSnapshot {
  config: ConfigInputs;
  jobInfo: { dealerName: string; jobReference: string; color: string; notes: string };
  revealUnlocked: boolean;
  bottomGapUnlocked: boolean;
}

function loadDraft(): DraftSnapshot | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.config) return null;
    return parsed as DraftSnapshot;
  } catch { return null; }
}

function loadSavedJobs(): SavedJob[] {
  try {
    const raw = localStorage.getItem(SAVED_JOBS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

// CDN URLs for logos
const IAS_LOGO_URL = 'https://www.innovativealuminum.com/images/ias-newgold.svg';
const INFINITY_LOGO_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663093943154/Vxc6ufyoD2HuhTpJtdEazX/infinity-logo_2a84a66e.png';
const IAS_WEBSITE_URL = 'https://www.innovativealuminum.com/';

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
        <span className="text-sm text-[#7A7A7A]">{label}</span>
        {hint && <p className="text-xs text-[#9A9A9A] mt-0.5">{hint}</p>}
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

  const clamp = (v: number) =>
    Math.max(min, max !== undefined ? Math.min(max, v) : v);

  // preventDefault on mousedown keeps focus where it is. Without this, clicking
  // the button shifts focus to itself, which can trigger scroll-into-view and
  // make surrounding content shift under the cursor between rapid clicks.
  const bump = (delta: number) => (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (disabled) return;
    const current = Number.isFinite(value) ? value : 0;
    const next = clamp(current + delta);
    if (next !== value) onChange(next);
  };

  const atMax = max !== undefined && value >= max;
  const atMin = value <= min;

  const wrapperStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    display: 'block',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '6px 26px 6px 12px',
    fontSize: '14px',
    textAlign: 'right',
    background: disabled ? '#F5F5F5' : '#FFFFFF',
    color: '#111111',
    border: '1px solid #D8D8D8',
    borderRadius: '4px',
    outline: 'none',
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'textfield',
  };
  const btnLayerStyle: React.CSSProperties = {
    position: 'absolute',
    top: '1px',
    right: '1px',
    bottom: '1px',
    width: '20px',
    display: 'flex',
    flexDirection: 'column',
    pointerEvents: 'none',
  };
  const btnStyle = (atEdge: boolean): React.CSSProperties => ({
    flex: 1,
    display: 'grid',
    placeItems: 'center',
    fontSize: '9px',
    lineHeight: 1,
    color: (disabled || atEdge) ? '#C8C8C8' : '#3A3A3A',
    background: 'transparent',
    border: 'none',
    padding: 0,
    cursor: (disabled || atEdge) ? 'not-allowed' : 'pointer',
    pointerEvents: (disabled || atEdge) ? 'none' : 'auto',
  });

  return (
    <div className={className} style={wrapperStyle}>
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
            const clamped = clamp(v);
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
        className="mono no-native-spin"
        style={inputStyle}
      />
      <div style={btnLayerStyle}>
        <button
          type="button"
          tabIndex={-1}
          aria-label="Increment"
          disabled={disabled || atMax}
          onMouseDown={bump(step)}
          style={btnStyle(atMax)}
        >▲</button>
        <button
          type="button"
          tabIndex={-1}
          aria-label="Decrement"
          disabled={disabled || atMin}
          onMouseDown={bump(-step)}
          style={btnStyle(atMin)}
        >▼</button>
      </div>
    </div>
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
        className={`relative w-10 h-5 rounded-full transition-all duration-200 ${checked ? 'bg-[#B69A5A]' : 'bg-[#D8D8D8]'}`}
        style={{
          boxShadow: checked
            ? '0 0 0 1px rgba(182,154,90,0.35), 0 1px 4px rgba(182,154,90,0.35)'
            : 'inset 0 1px 2px rgba(0,0,0,0.12)',
        }}
      >
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
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
  defaultValue,
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
  defaultValue?: number;
}) {
  const isModified = defaultValue !== undefined && Math.abs(value - defaultValue) > 0.001;

  const handleReset = () => {
    if (defaultValue === undefined) return;
    onChange(defaultValue);
  };

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
        {isModified && (
          <button
            onClick={handleReset}
            title="Reset to standard"
            className="p-1.5 rounded transition-colors text-[#8A7240] bg-[#F5F0E8] hover:bg-[#EDE5D0]"
          >
            <RotateCcw size={14} />
          </button>
        )}
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

function DiscountInput({ value, onChange, locked, lockReason }: { value: number; onChange: (v: number) => void; locked?: boolean; lockReason?: string }) {
  if (locked) {
    return (
      <div
        className="relative"
        title={lockReason || "Discount set by Innovative Aluminum admin."}
      >
        <div
          className="mono w-full rounded border border-[#B69A5A] bg-[#FAF8F2] px-3 py-1.5 pr-8 text-sm text-[#3D2E14] cursor-not-allowed select-none"
          aria-readonly="true"
        >
          {value > 0 ? (value * 100).toFixed(3).replace(/\.?0+$/, '') : '0'}
        </div>
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold pointer-events-none" style={{ color: '#B69A5A' }}>%</span>
        <p className="text-[10px] uppercase tracking-wider text-[#B69A5A] font-bold mt-1">Set by IAS admin</p>
      </div>
    );
  }

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

// Soft access gate. Not real security — the password is shipped in the JS bundle
// and anyone can read it via DevTools. Purpose is to make stakeholders comfortable
// publishing the URL during private testing. Once entered, persists in localStorage.
const ACCESS_PASSWORD = 'innovative2026';
const ACCESS_STORAGE_KEY = 'ias-infinity-access';

// Read the dealer's Infinity discount from the URL hash, if the portal
// dropped them here via the Calculator tile. Format: #d=43.5 (percentage,
// 0-100). Returns a decimal in 0..0.99 to match the calculator's existing
// internal representation, or null if no hash discount is present.
//
// When set, this overrides any locally-saved discount and the DiscountInput
// is rendered as read-only — admin is the source of truth.
//
// Out-of-range values get clamped (not rejected) so a malformed admin
// link doesn't silently fall back to the dealer's local value — they'd
// be told they have 0% instead. Clamping surfaces the intent.
function readDiscountFromHash(): number | null {
  if (typeof window === 'undefined' || !window.location.hash) return null;
  const raw = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  // Accept both #d=43.5 and #d=43.5&other=...
  const params = new URLSearchParams(raw);
  const d = params.get('d');
  if (d === null) return null;
  const n = parseFloat(d);
  if (!Number.isFinite(n)) return null;
  // Clamp to the calculator's representable range. Anything ≥99% becomes
  // 99% (the existing max), anything ≤0% becomes 0%. Treat 0 as
  // "explicitly no discount, set by admin" — still locked.
  return Math.min(0.99, Math.max(0, n / 100));
}

export default function Home() {
  // Access gate state
  const [accessGranted, setAccessGranted] = useState(() => {
    try { return localStorage.getItem(ACCESS_STORAGE_KEY) === ACCESS_PASSWORD; } catch { return false; }
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  // Discount source priority: URL hash (portal admin) > localStorage > 0.
  // The hash value also locks the input so dealers can't override it.
  // No setter is exposed — there is no in-app unlock affordance today.
  const hashDiscount = readDiscountFromHash();
  const [discountLocked] = useState(hashDiscount !== null);

  // Load saved discount from localStorage on first render
  const savedDiscount = (() => {
    if (hashDiscount !== null) return hashDiscount;
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
  const initialDraft = loadDraft();
  const [config, setConfig] = useState<ConfigInputs>(() =>
    initialDraft?.config ?? ({
      ...defaultConfig(),
      discountLevel: savedDiscount,
      country: savedMarket,
      glassThickness: savedMarket === 'US' ? 12 : 13,
    })
  );
  const [jobInfo, setJobInfo] = useState(() =>
    initialDraft?.jobInfo ?? { dealerName: savedDealer, jobReference: '', color: '', notes: '' }
  );
  const [showAddOns, setShowAddOns] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showJobsModal, setShowJobsModal] = useState(false);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>(() => loadSavedJobs());
  const [customerFacingPrint, setCustomerFacingPrint] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [hoverDetails, setHoverDetails] = useState<{ idx: number; top: number; left: number; height: number } | null>(null);
  const [revealUnlocked, setRevealUnlocked] = useState(() => initialDraft?.revealUnlocked ?? false);
  const [bottomGapUnlocked, setBottomGapUnlocked] = useState(() => initialDraft?.bottomGapUnlocked ?? false);
  const [showCustomBasePlateAlert, setShowCustomBasePlateAlert] = useState(false);
  // Tracks the previous wedge-override state so we only pop the alert on a
  // false→true transition (not every render while the condition stays true).
  const [prevWedgeOverride, setPrevWedgeOverride] = useState(false);

  // Mark first visit done and persist discount.
  // If the dealer arrived via the portal's #d=... hash, their actual
  // manual-entry discount lives in localStorage from a prior standalone
  // session; we must NOT overwrite it with the admin-set value, otherwise
  // a later standalone visit (no hash) would load the admin number instead
  // of what they last typed in.
  useEffect(() => {
    try {
      localStorage.setItem(FIRST_VISIT_KEY, '1');
      if (!discountLocked) {
        localStorage.setItem(DISCOUNT_STORAGE_KEY, String(config.discountLevel));
      }
    } catch {}
  }, [config.discountLevel, discountLocked]);
  // Persist dealer name
  useEffect(() => {
    try { localStorage.setItem(DEALER_STORAGE_KEY, jobInfo.dealerName); } catch {}
  }, [jobInfo.dealerName]);
  // Persist market
  useEffect(() => {
    try { localStorage.setItem(MARKET_STORAGE_KEY, config.country); } catch {}
  }, [config.country]);

  // Auto-save the current draft on every change — refresh-proof workflow.
  // The draft is one snapshot; archived jobs live in SAVED_JOBS_KEY.
  useEffect(() => {
    try {
      const snapshot: DraftSnapshot = { config, jobInfo, revealUnlocked, bottomGapUnlocked };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(snapshot));
    } catch {}
  }, [config, jobInfo, revealUnlocked, bottomGapUnlocked]);

  // Persist the saved-jobs list whenever it changes.
  useEffect(() => {
    try { localStorage.setItem(SAVED_JOBS_KEY, JSON.stringify(savedJobs)); } catch {}
  }, [savedJobs]);

  // Dirty-state detection — true when user has entered job-specific info that
  // would be lost on navigation. Dealer name + discount + market are persisted,
  // so they don't count.
  const isDirty = useMemo(() => {
    const q = config.quantities;
    const totalPosts = q.midPosts + q.endPosts + q.outsideCornerPosts + q.insideCornerPosts +
      q.wallTracks + q.endPostsLeft25 + q.endPostsRight25;
    if (totalPosts > 0) return true;
    if (jobInfo.jobReference.trim() || jobInfo.color.trim() || jobInfo.notes.trim()) return true;
    const addOnEntries = Object.entries(config.addOns);
    for (const [, v] of addOnEntries) {
      if (typeof v === 'number' && v > 0) return true;
      if (typeof v === 'boolean' && v) return true;
      if (typeof v === 'string' && v.trim() !== '') return true;
    }
    return false;
  }, [config.quantities, config.addOns, jobInfo.jobReference, jobInfo.color, jobInfo.notes]);

  // Native browser leave-prompt for tab close / refresh when there's unsaved work.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const handleLogoClick = useCallback((e: React.MouseEvent) => {
    if (isDirty) {
      e.preventDefault();
      setShowLeaveConfirm(true);
    }
  }, [isDirty]);

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

  // ── Saved jobs handlers ──
  // archiveCurrentJob captures the current state into the saved-jobs list.
  // Used by "New Job" and when loading a different job from the list.
  // Skips if the current state is empty (no posts entered, no job ref/color/notes),
  // so we don't pollute the list with blank entries.
  const archiveCurrentJob = useCallback(() => {
    if (!isDirty) return;
    // If the current job reference already exists in the list, update that
    // entry in place instead of creating a new one (case-insensitive match on
    // trimmed ref). Empty refs always create new entries since there's no
    // unique key to match on.
    const currentRef = jobInfo.jobReference.trim().toLowerCase();
    setSavedJobs(prev => {
      const existingIdx = currentRef
        ? prev.findIndex(j => j.jobReference.trim().toLowerCase() === currentRef)
        : -1;
      const baseEntry: Omit<SavedJob, 'id'> = {
        savedAt: Date.now(),
        jobReference: jobInfo.jobReference || '',
        dealerName: jobInfo.dealerName || '',
        color: jobInfo.color || '',
        mountType: config.mountType,
        railHeight: config.railHeight,
        glassThickness: config.glassThickness,
        jobCost: result.jobCost,
        config,
        jobInfo,
        revealUnlocked,
        bottomGapUnlocked,
      };
      if (existingIdx >= 0) {
        // Preserve the existing id so refs stay stable; bump it to the top.
        const updated: SavedJob = { ...baseEntry, id: prev[existingIdx].id };
        const next = prev.slice();
        next.splice(existingIdx, 1);
        return [updated, ...next];
      }
      const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      return [{ ...baseEntry, id }, ...prev].slice(0, 50);
    });
  }, [isDirty, config, jobInfo, result.jobCost, revealUnlocked, bottomGapUnlocked]);

  const startNewJob = useCallback(() => {
    archiveCurrentJob();
    const country = config.country;
    setConfig({
      ...defaultConfig(),
      discountLevel: config.discountLevel,
      country,
      glassThickness: country === 'CA' ? 13 : 12,
    });
    setJobInfo(prev => ({ dealerName: prev.dealerName, jobReference: '', color: '', notes: '' }));
    setRevealUnlocked(false);
    setBottomGapUnlocked(false);
    setShowJobsModal(false);
    toast.success('Started new job');
  }, [archiveCurrentJob, config.country, config.discountLevel]);

  // Save current state to the Recent Jobs list without clearing the form.
  // Use this when the dealer wants a checkpoint but plans to keep working.
  const saveCurrentJob = useCallback(() => {
    if (!isDirty) {
      toast.error('Nothing to save yet — add some quantities or job info first.');
      return;
    }
    archiveCurrentJob();
    setShowJobsModal(false);
    toast.success(jobInfo.jobReference ? `Saved "${jobInfo.jobReference}"` : 'Saved snapshot');
  }, [isDirty, archiveCurrentJob, jobInfo.jobReference]);

  const loadJob = useCallback((id: string) => {
    const job = savedJobs.find(j => j.id === id);
    if (!job) return;
    archiveCurrentJob();
    setConfig(job.config);
    setJobInfo(job.jobInfo);
    setRevealUnlocked(job.revealUnlocked);
    setBottomGapUnlocked(job.bottomGapUnlocked);
    setShowJobsModal(false);
    toast.success(`Loaded ${job.jobReference || 'job'}`);
  }, [savedJobs, archiveCurrentJob]);

  const duplicateJob = useCallback((id: string) => {
    const job = savedJobs.find(j => j.id === id);
    if (!job) return;
    archiveCurrentJob();
    setConfig(job.config);
    setJobInfo({ ...job.jobInfo, jobReference: `${job.jobReference || 'Job'} (copy)`, notes: '' });
    setRevealUnlocked(job.revealUnlocked);
    setBottomGapUnlocked(job.bottomGapUnlocked);
    setShowJobsModal(false);
    toast.success('Duplicated to new draft');
  }, [savedJobs, archiveCurrentJob]);

  const deleteJob = useCallback((id: string) => {
    setSavedJobs(prev => prev.filter(j => j.id !== id));
  }, []);

  // Fascia wedge override pop-up: when setting block space exceeds the 5 1/8"
  // maximum (post too tall or bottom gap too large), the install switches to a
  // 3" wedge piece + reduced setting block. Mike + Bill confirmed this regime
  // may require custom base plates — flag it to the dealer.
  // We only fire on the false→true transition so the user isn't trapped by a
  // repeating modal while they're adjusting inputs that keep the flag true.
  useEffect(() => {
    if (result.useWedgeInsteadOfBlock && !prevWedgeOverride) {
      setShowCustomBasePlateAlert(true);
    }
    setPrevWedgeOverride(result.useWedgeInsteadOfBlock);
  }, [result.useWedgeInsteadOfBlock, prevWedgeOverride]);

  const isUS = config.country === 'US';
  const isCA = config.country === 'CA';
  const isFascia = config.mountType === 'fascia';
  const isSurface = config.mountType === 'surface';

  const handleCountryChange = (c: Country) => {
    update('country', c);
    // Pick a country-appropriate default reveal so the value never starts above
    // the country cap (US cap is 2.0", canonical default is 2.125").
    const newConstraints = computeRevealConstraints(
      c, config.mountType, config.railHeight, 'tall',
      2.125, config.bottomGlassGap, config.distTopBasePlateToDeck,
    );
    update('topGlassReveal', newConstraints.topRevealDefault);
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

  // Total posts that take a base plate / mount fixture (wall tracks excluded — they don't).
  // Used to cap base-plate customization quantities so they can't exceed the post count.
  const totalPostsForBasePlates =
    config.quantities.midPosts + config.quantities.endPosts +
    config.quantities.outsideCornerPosts + config.quantities.insideCornerPosts +
    config.quantities.endPostsLeft25 + config.quantities.endPostsRight25;
  const colorSelected = !!jobInfo.color && jobInfo.color !== '';
  const requireColorMsg = 'Please select a powder coat color in Job Information before exporting or printing.';

  // ── Soft access gate (private testing) ──
  if (!accessGranted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#F4F1EA', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
      >
        <div
          className="bg-white shadow-xl px-8 py-10 mx-4"
          style={{ border: '2px solid #B69A5A', borderRadius: '4px', maxWidth: '420px', width: '100%' }}
        >
          <img
            src={IAS_LOGO_URL}
            alt="Innovative Aluminum Systems"
            style={{ height: '52px', width: 'auto', display: 'block', margin: '0 auto 12px' }}
          />
          <img
            src={INFINITY_LOGO_URL}
            alt="Infinity"
            style={{ height: 'auto', width: '160px', display: 'block', margin: '0 auto 22px' }}
          />
          <h2 className="font-bold text-lg text-center mb-1" style={{ color: '#111' }}>
            Calculator Access
          </h2>
          <p className="text-sm text-center mb-6" style={{ color: '#666' }}>
            This tool is currently in private testing.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (passwordInput.trim() === ACCESS_PASSWORD) {
                try { localStorage.setItem(ACCESS_STORAGE_KEY, ACCESS_PASSWORD); } catch {}
                setAccessGranted(true);
                setPasswordError(false);
              } else {
                setPasswordError(true);
                setPasswordInput('');
              }
            }}
          >
            <input
              type="password"
              autoFocus
              value={passwordInput}
              onChange={(e) => { setPasswordInput(e.target.value); if (passwordError) setPasswordError(false); }}
              placeholder="Enter password"
              className="w-full px-3 py-2 mb-3 text-sm"
              style={{
                border: passwordError ? '1.5px solid #A03434' : '1.5px solid #D8CDA8',
                borderRadius: '3px',
                outline: 'none',
                background: '#FFFFFF',
                color: '#111',
              }}
            />
            {passwordError && (
              <div className="text-xs mb-3" style={{ color: '#A03434' }}>
                Incorrect password.
              </div>
            )}
            <button
              type="submit"
              className="w-full px-4 py-2 text-sm font-semibold transition-opacity"
              style={{ background: '#B69A5A', color: '#FFFFFF', borderRadius: '2px', letterSpacing: '0.04em' }}
            >
              Continue
            </button>
          </form>
          <p className="text-xs text-center mt-6" style={{ color: '#999' }}>
            Contact Innovative Aluminum Systems for access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#F4F1EA', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>

      {/* ====== HEADER ====== */}
      <header className="no-print" style={{ background: '#FAF8F3', borderBottom: '3px solid #B69A5A', borderTop: '3px solid #B69A5A' }}>
        <div className="container py-2 flex items-center justify-between">
          <div className="flex items-center">
            <a
              href={IAS_WEBSITE_URL}
              onClick={handleLogoClick}
              title="Return to innovativealuminum.com"
              className="transition-opacity duration-150 hover:opacity-80"
              style={{ display: 'block', cursor: 'pointer' }}
            >
              <img
                src={IAS_LOGO_URL}
                alt="Innovative Aluminum Systems"
                style={{ height: '68px', width: 'auto', objectFit: 'contain', display: 'block' }}
              />
            </a>
            <div
              aria-hidden="true"
              style={{ width: '1px', height: '52px', background: '#B69A5A', opacity: 0.55, marginLeft: '32px', marginRight: '32px' }}
            />
            <img
              src={INFINITY_LOGO_URL}
              alt="Infinity"
              style={{ height: 'auto', width: '200px', objectFit: 'contain', display: 'block' }}
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-end ml-auto">
            <button
              onClick={saveCurrentJob}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold transition-all no-print hover:opacity-90"
              style={{ background: '#1F3A60', color: '#FFFFFF', borderRadius: '4px', letterSpacing: '0.04em' }}
              title="Save the current job to your Recent Jobs list (keeps you on the form)"
            >
              <Save size={13} />
              <span className="hidden sm:inline">Save</span>
            </button>
            <button
              onClick={() => setShowJobsModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold transition-all no-print hover:opacity-90"
              style={{ background: '#3A3A3A', color: '#FFFFFF', borderRadius: '4px', letterSpacing: '0.04em' }}
              title="Recent jobs"
            >
              <span style={{ fontSize: '14px', lineHeight: '1' }}>&#9776;</span>
              <span className="hidden sm:inline">Jobs{savedJobs.length > 0 ? ` (${savedJobs.length})` : ''}</span>
            </button>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold transition-all no-print hover:bg-[#FAF6EC]"
              style={{ background: 'transparent', color: '#3A3A3A', border: '1px solid #D8CDA8', borderRadius: '4px', letterSpacing: '0.04em' }}
              title="Reset configuration to defaults"
            >
              <RotateCcw size={13} />
              <span className="hidden sm:inline">Reset</span>
            </button>
            {/* Custom Base Plate Alert — fires when fascia setting block space
                exceeds 5 1/8" (wedge-override regime). Click anywhere to dismiss. */}
            {showCustomBasePlateAlert && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
                style={{ background: 'rgba(0,0,0,0.45)' }}
                onClick={() => setShowCustomBasePlateAlert(false)}
                role="dialog"
                aria-modal="true"
                aria-labelledby="custom-base-plate-alert-title"
              >
                <div
                  className="bg-white rounded shadow-xl p-6 max-w-md w-full mx-4 cursor-default"
                  style={{ border: '2px solid #B69A5A' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <AlertTriangle size={22} style={{ color: '#B69A5A', flexShrink: 0, marginTop: '2px' }} />
                    <h3 id="custom-base-plate-alert-title" className="font-bold text-base" style={{ color: '#111' }}>
                      Custom Base Plates May Be Required
                    </h3>
                  </div>
                  <p className="text-sm mb-5" style={{ color: '#333', lineHeight: '1.5' }}>
                    This configuration exceeds the standard fascia setting block range.
                    <strong> May require custom base plates — please contact Innovative Aluminum</strong> before
                    finalizing this order.
                  </p>
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowCustomBasePlateAlert(false)}
                      className="px-4 py-2 text-sm font-semibold"
                      style={{ background: '#B69A5A', color: '#FFFFFF', borderRadius: '2px' }}
                    >Dismiss</button>
                  </div>
                </div>
              </div>
            )}
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
            {/* Leave Page Confirmation Dialog — appears when IAS logo is clicked
                with unsaved configuration. Offers a Save-then-leave option. */}
            {showLeaveConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
                <div className="bg-white rounded-md shadow-xl p-6 max-w-md w-full mx-4" style={{ border: '2px solid #B69A5A' }}>
                  <h3 className="font-bold text-base mb-2" style={{ color: '#111' }}>Leave the calculator?</h3>
                  <p className="text-sm mb-5" style={{ color: '#555', lineHeight: 1.5 }}>
                    You have unsaved progress on this estimate. Would you like to save it before leaving?
                  </p>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        archiveCurrentJob();
                        toast.success(jobInfo.jobReference ? `Saved "${jobInfo.jobReference}"` : 'Saved snapshot');
                        window.location.href = IAS_WEBSITE_URL;
                      }}
                      className="w-full px-4 py-2.5 text-sm font-semibold transition-all hover:opacity-90"
                      style={{ background: '#1A5C2A', color: '#FFFFFF', borderRadius: '4px' }}
                    >Save and Leave</button>
                    <button
                      onClick={() => { window.location.href = IAS_WEBSITE_URL; }}
                      className="w-full px-4 py-2.5 text-sm font-semibold transition-all hover:opacity-90"
                      style={{ background: '#B85C2D', color: '#FFFFFF', borderRadius: '4px' }}
                    >Leave Without Saving</button>
                    <button
                      onClick={() => setShowLeaveConfirm(false)}
                      className="w-full px-4 py-2.5 text-sm font-semibold transition-all hover:opacity-90"
                      style={{ background: '#F0F0F0', color: '#333', borderRadius: '4px' }}
                    >Stay</button>
                  </div>
                </div>
              </div>
            )}
            {/* Recent Jobs panel — lists archived jobs from this device.
                Current draft auto-saves to a separate key so it survives refresh. */}
            {showJobsModal && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.45)' }}
                onClick={() => setShowJobsModal(false)}
              >
                <div
                  className="bg-white rounded shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col"
                  style={{ border: '2px solid #B69A5A' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between p-5 pb-3" style={{ borderBottom: '1px solid #E8E2D2' }}>
                    <div>
                      <h3 className="font-bold text-base" style={{ color: '#111' }}>Recent Jobs</h3>
                      <p className="text-xs mt-0.5" style={{ color: '#7A7A7A' }}>
                        Current draft auto-saves on every change. Use "New Job" to archive the current one and start fresh.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowJobsModal(false)}
                      className="text-2xl leading-none px-2"
                      style={{ color: '#7A7A7A' }}
                      title="Close"
                    >&times;</button>
                  </div>
                  <div className="p-5 pt-3 overflow-y-auto flex-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                      <button
                        onClick={saveCurrentJob}
                        className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold transition-all hover:opacity-90"
                        style={{ background: '#1A5C2A', color: '#FFFFFF', borderRadius: '4px', letterSpacing: '0.04em' }}
                        title="Save the current job to the list. Keeps working on it — does not clear the form."
                      >
                        Save This Job
                      </button>
                      <button
                        onClick={startNewJob}
                        className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold transition-all hover:opacity-90"
                        style={{ background: '#B69A5A', color: '#FFFFFF', borderRadius: '4px', letterSpacing: '0.04em' }}
                        title="Archive the current job to the list AND clear the form to start a new one."
                      >
                        + New Job
                      </button>
                    </div>
                    <p className="text-[11px] mb-3" style={{ color: '#9A9A9A' }}>
                      Your current work auto-saves on every change, so a refresh won't lose anything. Use "Save This Job" to snapshot it into the list, or "New Job" to archive + start fresh.
                    </p>
                    {savedJobs.length === 0 ? (
                      <p className="text-sm text-center py-8" style={{ color: '#9A9A9A' }}>
                        No archived jobs yet. Click "New Job" above to archive your current configuration.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {savedJobs.map(job => {
                          const date = new Date(job.savedAt);
                          const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                          const timeStr = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
                          return (
                            <div
                              key={job.id}
                              className="flex items-center gap-3 p-3 transition-all hover:bg-[#FAF6EC]"
                              style={{ border: '1px solid #E8E2D2', borderRadius: '6px' }}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-sm truncate" style={{ color: '#111' }}>
                                  {job.jobReference || <em style={{ color: '#9A9A9A', fontWeight: 'normal' }}>Untitled job</em>}
                                </div>
                                <div className="text-xs mt-0.5" style={{ color: '#7A7A7A' }}>
                                  {job.dealerName ? `${job.dealerName} · ` : ''}
                                  {job.mountType === 'surface' ? 'Surface' : 'Fascia'} · {job.railHeight}" rail · {job.glassThickness}mm
                                  {job.color ? ` · ${job.color}` : ''}
                                </div>
                                <div className="text-[10px] mt-0.5" style={{ color: '#9A9A9A' }}>
                                  {dateStr} at {timeStr}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="mono font-bold text-sm" style={{ color: '#111' }}>
                                  {fmtCurrency(job.jobCost)}
                                </div>
                              </div>
                              <div className="flex flex-col gap-1 shrink-0">
                                <button
                                  onClick={() => loadJob(job.id)}
                                  className="text-xs font-semibold px-2 py-1 transition-all hover:opacity-90"
                                  style={{ background: '#B69A5A', color: '#FFFFFF', borderRadius: '3px' }}
                                >Load</button>
                                <button
                                  onClick={() => duplicateJob(job.id)}
                                  className="text-xs font-semibold px-2 py-1 transition-all hover:opacity-90"
                                  style={{ background: '#F0F0F0', color: '#333', borderRadius: '3px' }}
                                >Duplicate</button>
                                <button
                                  onClick={() => deleteJob(job.id)}
                                  className="text-xs font-semibold px-2 py-1 transition-all hover:opacity-90"
                                  style={{ background: '#FFFFFF', color: '#B85C2D', border: '1px solid #B85C2D', borderRadius: '3px' }}
                                  title="Remove this job from the list"
                                >Delete</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div className="relative no-print">
              <button
                onClick={() => setShowExportMenu(v => !v)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: '#111111', color: '#FFFFFF', borderRadius: '4px', letterSpacing: '0.04em' }}
                title="Export, email, or print this estimate"
              >
                <FileSpreadsheet size={13} />
                <span className="hidden sm:inline">Export</span>
                <ChevronDown size={12} style={{ marginLeft: '-2px', transition: 'transform 150ms', transform: showExportMenu ? 'rotate(180deg)' : 'rotate(0deg)' }} />
              </button>
              {showExportMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowExportMenu(false)}
                  />
                  <div
                    className="absolute right-0 mt-2 z-50 bg-white shadow-xl"
                    style={{ width: '240px', border: '1px solid #E8E2D2', borderRadius: '6px', overflow: 'hidden' }}
                  >
                    <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9A9A9A', borderBottom: '1px solid #F0EBDD' }}>
                      Export estimate
                    </div>
                    <button
                      onClick={async () => {
                        setShowExportMenu(false);
                        if (!colorSelected) { toast.error(requireColorMsg); return; }
                        try {
                          await exportToExcel(config, result, jobInfo);
                          toast.success('Excel file downloaded');
                        } catch (e) {
                          toast.error('Excel export failed');
                          console.error(e);
                        }
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors hover:bg-[#FAF6EC]"
                      style={{ color: '#111' }}
                    >
                      <FileSpreadsheet size={14} style={{ color: '#1A5C2A' }} />
                      Download Excel
                    </button>
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        if (!colorSelected) { toast.error(requireColorMsg); return; }
                        const subject = [jobInfo.jobReference, jobInfo.color, jobInfo.dealerName]
                          .filter(Boolean).join(' - ');
                        const body = encodeURIComponent(
                          `Please find attached the Material Estimate and Excel file for:\n\nJob Reference: ${jobInfo.jobReference || '—'}\nDealer: ${jobInfo.dealerName || '—'}\nColor: ${jobInfo.color || '—'}\nMount: ${config.mountType === 'surface' ? 'Surface Mount' : 'Fascia Mount'}\nRail Height: ${config.railHeight}"\nGlass: ${config.glassThickness}mm\nJob Cost: $${result.jobCost.toFixed(2)}\n\nPlease use the Print Estimate button to save the PDF, and the Export Excel button to download the Excel file, then attach both to this email before sending.`
                        );
                        window.location.href = `mailto:orders@innovativealuminum.com?subject=${encodeURIComponent(subject)}&body=${body}`;
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors hover:bg-[#FAF6EC]"
                      style={{ color: '#111' }}
                    >
                      <Mail size={14} style={{ color: '#1A5C2A' }} />
                      Email estimate
                    </button>
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        if (!colorSelected) { toast.error(requireColorMsg); return; }
                        window.print();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors hover:bg-[#FAF6EC]"
                      style={{ color: '#111' }}
                    >
                      <Printer size={14} style={{ color: '#111' }} />
                      Print estimate
                    </button>
                    <div style={{ borderTop: '1px solid #F0EBDD' }} />
                    <label className="flex items-center gap-2 px-3 py-2.5 text-sm cursor-pointer hover:bg-[#FAF6EC]" style={{ color: '#111' }}>
                      <input
                        type="checkbox"
                        checked={customerFacingPrint}
                        onChange={(e) => setCustomerFacingPrint(e.target.checked)}
                        className="h-3.5 w-3.5 accent-[#B69A5A] cursor-pointer"
                      />
                      <span>Hide prices on print</span>
                    </label>
                    <div className="px-3 pb-2.5 pt-0 text-[10px]" style={{ color: '#9A9A9A', lineHeight: '1.4' }}>
                      Hides per-line prices and the Job Cost on the printed estimate. Useful for customer-facing materials lists.
                    </div>
                  </div>
                </>
              )}
            </div>
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
              {!customerFacingPrint && (
                <>
                  <div className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#6B6B6B' }}>Job Cost</div>
                  <div className="mono text-2xl font-black" style={{ color: '#111111' }}>
                    {fmtCurrency(result.jobCost)}
                  </div>
                </>
              )}
              {!customerFacingPrint && config.discountLevel > 0 && (
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
                    {!customerFacingPrint && <th className="text-right" style={{ color: '#B69A5A' }}>Unit</th>}
                    {!customerFacingPrint && <th className="text-right" style={{ color: '#B69A5A' }}>Total</th>}
                  </tr>
                </thead>
                <tbody>
                  {result.lineItems.map((item, i) => (
                    <tr key={i}>
                      <td className="text-xs">
                        <div>{item.description}</div>
                        {item.note && <div className="text-[10px] text-amber-700 mt-0.5 italic">{item.note}</div>}
                      </td>
                      <td className="mono text-right text-xs">{item.qty % 1 === 0 ? item.qty : fmt(item.qty, 2)}</td>
                      {!customerFacingPrint && <td className="mono text-right text-xs">{fmtCurrency(item.unitCost)}</td>}
                      {!customerFacingPrint && <td className="mono text-right text-xs font-bold">{fmtCurrency(item.total)}</td>}
                    </tr>
                  ))}

                </tbody>
                {!customerFacingPrint && (
                  <tfoot>
                    <tr className="total-row">
                      <td colSpan={3} className="text-sm font-black uppercase tracking-wide" style={{ color: '#111111' }}>
                        {config.glassThickness === 12 ? '12mm' : '13mm'} Job Cost
                      </td>
                      <td className="mono text-right text-sm font-black" style={{ color: '#111111' }}>{fmtCurrency(result.jobCost)}</td>
                    </tr>
                  </tfoot>
                )}
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
                    <p className="text-xs mt-1 flex items-center gap-1 font-semibold" style={{ color: '#B85C2D' }}>
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
                    locked={discountLocked}
                    lockReason="Set by Innovative Aluminum admin via the Dealer Portal."
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
                          background: config.postConfig === pc ? '#111111' : '#FFFFFF',
                          color: config.postConfig === pc ? '#f4ce47' : '#3A3A3A',
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
                defaultValue={constraints.topRevealDefault}
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
                defaultValue={constraints.bottomGapDefault}
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
                  <div
                    className="mono text-4xl font-black leading-none inline-block"
                    style={{
                      color: '#111111',
                      letterSpacing: '-0.02em',
                      background: '#FAF6EC',
                      padding: '6px 12px',
                      borderRadius: '4px',
                    }}
                  >
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
                <div className="overflow-x-auto relative">
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
                      {result.lineItems.map((item, i) => {
                        const isHovered = hoverDetails?.idx === i;
                        const qtyDisplay = item.qty % 1 === 0 ? String(item.qty) : fmt(item.qty, 2);
                        return (
                          <tr
                            key={i}
                            onMouseEnter={(e) => {
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              setHoverDetails({ idx: i, top: rect.top, left: rect.right, height: rect.height });
                            }}
                            onMouseLeave={() => setHoverDetails(prev => prev?.idx === i ? null : prev)}
                            style={{
                              cursor: 'help',
                              background: isHovered ? '#FAF6EC' : 'transparent',
                              transition: 'background 120ms',
                            }}
                          >
                            <td className="text-xs">
                              <div>{item.description}</div>
                              {item.note && <div className="text-[10px] text-amber-700 mt-0.5 italic">{item.note}</div>}
                            </td>
                            <td className="mono text-right text-xs">{qtyDisplay}</td>
                            <td className="mono text-right text-xs">{fmtCurrency(item.unitCost)}</td>
                            <td className="mono text-right text-xs font-bold">{fmtCurrency(item.total)}</td>
                          </tr>
                        );
                      })}

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
                          const clamped = Math.min(v, totalPostsForBasePlates);
                          updateAddOn('add5x5BasePlate', clamped);
                          // If reduced below current assigned total, zero out sub-spinners
                          const assigned = config.addOns.basePlate5x5_midPost + config.addOns.basePlate5x5_outsideCorner + config.addOns.basePlate5x5_insideCorner + config.addOns.basePlate5x5_endPost25;
                          if (clamped < assigned) {
                            updateAddOn('basePlate5x5_midPost', 0);
                            updateAddOn('basePlate5x5_outsideCorner', 0);
                            updateAddOn('basePlate5x5_insideCorner', 0);
                            updateAddOn('basePlate5x5_endPost25', 0);
                          }
                        }}
                        min={0}
                        max={totalPostsForBasePlates}
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
                      <NumInput
                        value={config.addOns.addWeldedSurfaceBase}
                        onChange={v => updateAddOn('addWeldedSurfaceBase', Math.min(v, totalPostsForBasePlates))}
                        min={0}
                        max={totalPostsForBasePlates}
                      />
                    </FieldRow>
                    <FieldRow label="Add Welded Extruded Side Mount 1.9 Pipe">
                      <NumInput
                        value={config.addOns.addWeldedExtrudedSideMount}
                        onChange={v => updateAddOn('addWeldedExtrudedSideMount', Math.min(v, totalPostsForBasePlates))}
                        min={0}
                        max={totalPostsForBasePlates}
                      />
                    </FieldRow>
                  </>
                )}
                {isFascia && (
                  <>
                    <FieldRow label="Remove Track From Post">
                      <NumInput
                        value={config.addOns.removeTrackFromPost}
                        onChange={v => updateAddOn('removeTrackFromPost', v)}
                        min={0}
                      />
                    </FieldRow>
                    <FieldRow label="Add Welded Extruded Side Mount 1.9 Pipe">
                      <NumInput
                        value={config.addOns.addWeldedExtrudedSideMount}
                        onChange={v => updateAddOn('addWeldedExtrudedSideMount', Math.min(v, totalPostsForBasePlates))}
                        min={0}
                        max={totalPostsForBasePlates}
                      />
                    </FieldRow>
                  </>
                )}
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

        {/* Floating BOM row breakdown popover — appears next to a hovered line item.
            Built inline (no Radix) so the show/hide is instant and brand-styled. */}
        {hoverDetails && result.lineItems[hoverDetails.idx] && (() => {
          const item = result.lineItems[hoverDetails.idx];
          const qtyDisplay = item.qty % 1 === 0 ? String(item.qty) : fmt(item.qty, 2);
          const viewportRight = typeof window !== 'undefined' ? window.innerWidth : 1440;
          const popoverWidth = 280;
          const showOnLeft = hoverDetails.left + popoverWidth + 16 > viewportRight;
          return (
            <div
              className="fixed z-50 pointer-events-none no-print"
              style={{
                top: hoverDetails.top + hoverDetails.height / 2,
                left: showOnLeft ? undefined : hoverDetails.left + 12,
                right: showOnLeft ? viewportRight - hoverDetails.left + 12 + 'px' : undefined,
                transform: 'translateY(-50%)',
                width: popoverWidth,
                background: '#111111',
                color: '#FFFFFF',
                borderRadius: '6px',
                padding: '10px 12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                fontSize: '12px',
                lineHeight: 1.5,
              }}
            >
              <div className="font-bold mb-1" style={{ color: '#f4ce47', letterSpacing: '0.02em' }}>{item.description}</div>
              {item.note && <div className="italic mb-2" style={{ color: '#D8CDA8', fontSize: '11px' }}>{item.note}</div>}
              <div className="mono flex justify-between"><span style={{ color: '#9A9A9A' }}>Unit price:</span><span>{fmtCurrency(item.unitCost)}</span></div>
              <div className="mono flex justify-between"><span style={{ color: '#9A9A9A' }}>Quantity:</span><span>{qtyDisplay}</span></div>
              <div className="mono flex justify-between font-bold mt-1 pt-1" style={{ borderTop: '1px solid #3A3A3A', color: '#f4ce47' }}>
                <span>Line total:</span><span>{fmtCurrency(item.total)}</span>
              </div>
              {config.discountLevel > 0 && (
                <div className="mt-2 pt-1" style={{ borderTop: '1px solid #3A3A3A', fontSize: '10px', color: '#9A9A9A' }}>
                  Your {(config.discountLevel * 100).toFixed(1)}% dealer discount is already applied to most items. Fasteners are NET.
                </div>
              )}
            </div>
          );
        })()}
      </div>
  );
}
