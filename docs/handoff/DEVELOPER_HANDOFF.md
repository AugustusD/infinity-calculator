# Infinity Glass Railing Calculator — Developer Handoff

**Project:** Infinity Glass Railing Estimation Tool  
**Client:** Innovative Aluminum Systems (IAS)  
**Audience:** Suneet — continuing development with Claude Code + Vercel  
**Prepared:** April 2026  
**Live URL (Manus hosted):** https://infinitycalc-vxc6ufyo.manus.space  
**GitHub:** Connected via `user_github` remote (main branch)

---

## 1. Overview

This is a **pure static React + TypeScript** single-page application that allows IAS-authorized dealers to generate material estimates and bills of materials (BOM) for the Infinity Glass Railing system. It supports two mount types (surface and fascia), two rail heights (36" and 42"), two glass thicknesses (12mm and 13mm), and both Canadian and US code configurations. The app produces a line-item BOM with dealer-discounted pricing, an Excel export, a print-ready estimate, and an email estimate feature.

There is **no backend, no database, and no authentication**. All calculation logic runs entirely in the browser. The app is deployable as a static site to Vercel with zero configuration changes — just `pnpm build` and deploy the `dist/public` output directory.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build tool | Vite 7 (root: `client/`) |
| Styling | Tailwind CSS 4 + shadcn/ui (Radix primitives) |
| Routing | Wouter (lightweight, single route `/`) |
| Excel export | ExcelJS |
| Animations | Framer Motion |
| Toast notifications | Sonner |
| Package manager | pnpm |
| Deployment target | Vercel (static) or any CDN |

The `server/` and `shared/` directories are **template scaffolding placeholders only** — they contain no business logic and are not used at runtime. The app is 100% client-side.

---

## 3. Project Structure

```
infinity-calculator/
├── client/
│   ├── index.html              # Vite entry, analytics script
│   └── src/
│       ├── main.tsx            # React root mount
│       ├── App.tsx             # Router + global providers
│       ├── index.css           # Design tokens, Tailwind config, print styles
│       ├── const.ts            # OAuth template carryover (unused by calculator)
│       ├── pages/
│       │   ├── Home.tsx        # *** ENTIRE UI lives here (~1200 lines) ***
│       │   └── NotFound.tsx    # 404 fallback
│       ├── lib/
│       │   ├── calculator.ts   # *** CORE ENGINE (~1100 lines) ***
│       │   └── exportExcel.ts  # Excel BOM export (ExcelJS, two sheets)
│       ├── components/
│       │   ├── ErrorBoundary.tsx
│       │   └── ui/             # shadcn/ui primitives (do not edit)
│       ├── contexts/
│       │   └── ThemeContext.tsx # Fixed light theme (switchable=false)
│       └── hooks/              # useMobile, useComposition, usePersistFn
├── vite.config.ts              # Aliases: @/* → client/src/*, build → dist/public
├── tsconfig.json               # Strict mode, no emit, bundler resolution
├── package.json                # pnpm, wouter pinned to 3.7.1
└── patches/                    # Empty — wouter patch removed for deployment
```

**The two files that matter most are `calculator.ts` and `Home.tsx`.** Everything else is infrastructure.

---

## 4. Calculator Engine (`client/src/lib/calculator.ts`)

### 4.1 Entry Point

```typescript
export function calculate(config: ConfigInputs): CalculationResult
```

This is the single public function. It delegates to either `calculateSurface(config)` or `calculateFascia(config)` based on `config.mountType`. Both return a `CalculationResult` object containing computed dimensions, a `lineItems[]` BOM array, and pricing totals.

### 4.2 Key Types

```typescript
type Country = 'CA' | 'US';
type MountType = 'surface' | 'fascia';
type RailHeight = 36 | 42;           // nominal; actual = 36.125" or 42.125"
type PostConfig = 'tall' | 'short';  // Canada only; short floors post at 24" above deck
type GlassThickness = 12 | 13;       // mm
```

`ConfigInputs` is the full input object. `CalculationResult` contains all computed dimensions, the `lineItems[]` BOM, and `subtotal`/`jobCost`.

### 4.3 Critical Dimensional Formulas

These formulas are the heart of the calculator. They were reverse-engineered from the original IAS Excel calculator and validated against the installation guides.

**Actual rail height:**
```
actualRailHeight = railHeight === 36 ? 36.125 : 42.125
```

**Post height above deck (surface mount):**
```
postHeightAboveDeck = max(24, actualRailHeight - topGlassReveal)
```
- Default `topGlassReveal` = 2.125" (2 1/8")
- Short Post (Canada): `topGlassReveal` is set to `actualRailHeight - 24` → post floors at 24"

**Wall track height — ALWAYS uses DEFAULT_TOP_REVEAL (2.125"), never the user's topGlassReveal:**
```
wallTrackHeight = actualRailHeight - DEFAULT_TOP_REVEAL   // e.g. 42.125 - 2.125 = 40"
```
> **Critical rule:** The wall track is a fixed-height channel tied to the rail height, not the post configuration. When Short Post is selected, `topGlassReveal` is set to ~18.125" to push posts down to 24" above deck — but the wall track must remain at the full rail height. This is why `DEFAULT_TOP_REVEAL` (the constant 2.125) is used here, not the variable `topReveal`.

**Glass insert lengths:**
```
// Surface mount
glassInsertLength (post)      = postHeightAboveDeck - bottomGap - 3
glassInsertLengthTrack (wall) = wallTrackHeight - bottomGap - 3
endPostInsertLength           = postHeightAboveDeck - 0.75

// Fascia mount
glassInsertLength (post)      = postHeightAboveDeck - 5 - distToDeck - bottomGap - 3
glassInsertLengthTrack (wall) = wallTrackHeight - 3 - distToDeck
endPostInsertLength           = postHeightAboveDeck - 0.25 - 5
```

**Fascia physical post length:**
```
physicalPostLength = postHeightAboveDeck + distToDeck + BASE_PLATE_HEIGHT   // BASE_PLATE_HEIGHT = 5"
```

**Setting block height:**
```
settingBlock05Height  = bottomGap - 0.5    // for 0.5" base plate
settingBlock025Height = bottomGap - 0.25   // for 0.25" base plate
```

**2.5" end post height:**
```
// Surface: actualRailHeight + 1
// Fascia:  postHeightAboveDeck + 1 + distToDeck + BASE_PLATE_HEIGHT
```

### 4.4 Gasket / Vinyl Sizing

**Non-courier mode:** Uses `optimizeCut(insertLength, stockLength)` — finds the integer cut size that maximizes pieces per stock length. Stock length is 144" (12mm, 12 ft) or 120" (13mm, 10 ft).

**Courier mode:** Uses manufacturer-standard lookup tables. The cut size is determined by `postHeightAboveDeck` (for posts) or `wallTrackHeight` (for wall tracks):

| Height Above Deck | 12mm Cut | 13mm Cut | Pieces per Length |
|---|---|---|---|
| ≥ 38" (tall post, 42" rail) | 48" | 40" | 3 |
| ≥ 27" (tall post, 36" rail) | 36" | 30" | 4 |
| < 27" (short post) | 24" | 24" | 6 (12mm) / 5 (13mm) |

> **Wall track vinyl always uses `wallTrackHeight` for tier selection** (which is always ≥ 34" for supported rail heights), so wall track vinyl always falls in the "≥ 27"" or "≥ 38"" tier — never the short post tier — even when Short Post is selected.

The function `courierCutSpec(postHeightAboveDeck, thickness)` returns `{ cutSize, cutsPerLength, stockLength }`. The function `courierTerminationCutSpec(terminationLength, thickness)` handles the end post termination (vinyl-only) side.

### 4.5 Pricing

All 2026 dealer prices are in the `PRICES_2026` constant object at the top of `calculator.ts`. Prices are **pre-discount list prices**. The dealer discount is applied as:

```
jobCost = subtotal * (1 - discountLevel)
```

Post prices are interpolated between the three anchor points (24", 34", 40" above deck) using `surfacePostPrice(postHeightAboveDeck)`. Wall track prices are looked up by rail height using `surfaceWallTrackPrice(railHeight)`.

Paint cost is added per post using `postPaintCost(postHeightAboveDeck)` and per wall track using `trackPaintCost(trackHeight)`.

**Fasteners are net price (no dealer discount).**

### 4.6 Reveal Constraints

`computeRevealConstraints(country, mountType, railHeight, postConfig, topReveal, bottomGap, distToDeck)` returns the min/max/default bounds for the top glass reveal and bottom glass gap. This is used by the UI to clamp the reveal sliders and show validation warnings.

- **US surface mount:** `topRevealMax = 2.0"` (post can be at most 2" shorter than rail)
- **Canada surface mount:** `topRevealMax = actualRailHeight - 24` (post floors at 24" above deck)
- **Fascia:** constrained by minimum physical post length of 32"

---

## 5. UI (`client/src/pages/Home.tsx`)

The entire calculator UI is a single large component (~1200 lines). It is structured as:

1. **State** — `config: ConfigInputs` (the full calculator input), `jobInfo`, `revealUnlocked`, `trackUnlocked`, UI state for modals/toasts
2. **Derived state** — `result = useMemo(() => calculate(config), [config...])` — the BOM is recomputed on every config change
3. **Sections rendered left-to-right:**
   - Left column: Job Information, Configuration Detail diagram
   - Center column: Configuration controls (mount type, rail height, post config, glass thickness, reveal, quantities, add-ons)
   - Right column: Post Quantities, Computed Dimensions, Material Details BOM

**Key UI conventions:**
- `update(key, value)` is a helper that calls `setConfig(prev => ({ ...prev, [key]: value }))`
- The Short Post button sets both `postConfig: 'short'` AND `topGlassReveal: actualRailHeight - 24` simultaneously
- The Tall Post button resets `topGlassReveal` to 2.125"
- `revealUnlocked` and `trackUnlocked` control whether the reveal/gap spinners are editable
- The `FieldRow` component (inline in Home.tsx) is a labeled two-column row used throughout the config panel

---

## 6. Excel Export (`client/src/lib/exportExcel.ts`)

`exportToExcel(config, result, jobInfo)` generates a two-sheet workbook using ExcelJS:

- **Sheet 1 — Material Quote:** Branded header (IAS logo text, gold/black palette), job info block, BOM table with Description, Qty, Unit Cost, Total columns, subtotal/job cost footer, and a disclaimer note.
- **Sheet 2 — Vinyl Optimization Validation:** Shows glass insert lengths vs post counts for quality checking.

The file is downloaded directly in the browser via a Blob URL. No server required.

> **Known gap:** The `partCode` field exists on every `MaterialLineItem` but is not yet included as a column in the Excel export. Adding it between Description and Qty in Sheet 1 would be straightforward.

---

## 7. Design System

The design is defined entirely in `client/src/index.css`. Key tokens:

| Token | Value | Usage |
|---|---|---|
| Background | `#FAFAF8` (warm off-white) | Page background |
| Primary | `#111111` (near-black) | Text, borders |
| Accent / Gold | `#B69A5A` | Buttons, active states, BOM headers |
| Card background | `#FFFFFF` | Calculator cards |
| Font | System Helvetica stack | Body text |
| Mono font | IBM Plex Mono (via `.mono` class) | Dimension values |

**Print styles** are extensive — the `@media print` block in `index.css` hides the header, collapses the three-column layout to a single column, scales tables to fit, and suppresses page breaks inside cards. The print output is the primary deliverable for dealers.

---

## 8. Deployment to Vercel

The app is a pure static build. To deploy:

```bash
pnpm install
pnpm build
# Output is in dist/public/
```

In Vercel:
- **Framework preset:** Vite
- **Root directory:** `.` (repo root)
- **Build command:** `pnpm build`
- **Output directory:** `dist/public`
- **No environment variables required** for basic functionality

The `vite.config.ts` already sets `build.outDir: 'dist/public'` and `root: 'client'`.

> **Note:** The `server/` directory contains Express placeholder code from the Manus template. It is not used and does not affect the static build. You can safely delete it.

---

## 9. Known Issues & Incomplete Features

| Area | Status | Notes |
|---|---|---|
| Part Code column in Excel export | Not implemented | `partCode` field exists on `MaterialLineItem`; just needs a column added in `exportExcel.ts` |
| Email Estimate button | Placeholder | Shows "Feature coming soon" toast; no backend email sending |
| 5×5 base plate sub-spinners | Partially manual | When `add5x5BasePlate > 0`, the user must manually distribute counts across post types |
| Custom reveal for Short Post | Works but UX is rough | The reveal spinner shows 18.125" when Short Post is selected; a cleaner UX would hide the spinner and show a fixed label |
| Fascia mount wall track pricing | Uses same prices as surface | `wallTrack_34in` and `wallTrack_40in` prices are shared between surface and fascia in `PRICES_2026` — verify this is correct with IAS |
| US market | Functional but less tested | Short Post is hidden for US; fascia mount has fewer constraints |

---

## 10. Suggested Next Steps

The following features were identified during development as high-value additions:

**1. Part Code column in Excel BOM** — The `partCode` field (e.g. `RPLINFGL12`, `PPSINF42MID`) is already stored on every `MaterialLineItem`. Adding it as a column between Description and Qty in `exportExcel.ts` Sheet 1 would make the Excel output directly usable as an order form without manual lookup.

**2. Auto-assign 5×5 base plate sub-spinners** — When `add5x5BasePlate > 0` and only one post type has a non-zero quantity, automatically set that post type's sub-spinner to match the main count. This eliminates a manual step for single-post-type jobs.

**3. Email Estimate backend** — The Email Estimate button is a placeholder. A simple Vercel serverless function (or Resend/SendGrid integration) could accept the BOM JSON and send a formatted HTML email to the dealer. The BOM data is already fully computed client-side.

**4. Persist configuration to URL params** — Encoding the `ConfigInputs` as URL query params would allow dealers to bookmark or share a specific configuration without re-entering all values.

**5. Glass panel count / linear footage helper** — Dealers frequently need to know how many glass panels the system requires. A derived field showing estimated glass panel count (based on post spacing assumptions) would complete the estimate for glass procurement.

---

## 11. File Checklist for Suneet

| File | Purpose | Edit frequency |
|---|---|---|
| `client/src/lib/calculator.ts` | All calculation logic, pricing, BOM generation | High — any formula or pricing change |
| `client/src/pages/Home.tsx` | All UI, state management, config controls | High — any UI change |
| `client/src/lib/exportExcel.ts` | Excel export layout and data | Medium — BOM column changes |
| `client/src/index.css` | Design tokens, print styles | Low — brand/style changes only |
| `client/index.html` | Analytics script, page title | Rarely |
| `vite.config.ts` | Build config, aliases | Rarely |
| `package.json` | Dependencies | When adding packages |

---

*Document prepared for developer handoff. All formula logic has been validated against the IAS 2026 Dealer Price List and installation guides. For pricing updates, edit the `PRICES_2026` constant object at the top of `calculator.ts`.*
