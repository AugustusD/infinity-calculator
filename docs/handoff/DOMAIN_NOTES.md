# Domain notes

Non-obvious knowledge that's easy to lose when reading the code in isolation. Most of this was reverse-engineered from `source-data/CUSTOM_Infinity_Calculator2021.xltx` and validated against the IAS installation guides.

---

## Paint cost derivation

The per-inch paint cost in `calculator.ts` (`postPaintCost`, `trackPaintCost`) interpolates between fixed anchor points from the 2021 Excel calculator. The anchors and the underlying math:

**Per-inch base cost** (Excel formula F7 in the source workbook):

```
$0.06613 / inch  =  (2.3 / 40) × 1.15
```

i.e., 2.3" reference height divided over 40 inches of post, times a 15% material loss factor.

**Material markup** (Excel F8): **4.8375×**, derived from `119.68 / 24.74` (final paint material cost / raw aluminum cost ratio).

**Effective per-inch finish cost**: `0.06613 × 4.8375 ≈ $0.32 / in`.

**Post paint cost interpolation** (Excel F29):

| Post height above deck | Paint cost |
|---|---|
| ≤ 24" | $8.25 |
| 24"–34" | $8.25 (flat) |
| 34"–40" | $8.25 + (h − 34) × ($1.79 / 6") ≈ $0.298 / in |
| 40" | $10.04 |
| 40"–48" | $10.04 + (h − 40) × ($1.93 / 8") ≈ $0.241 / in |

**Wall track paint cost** (Excel F30):

```
trackHeight < 40"  →  $3.17 (flat)
trackHeight ≥ 40"  →  $3.17 + (h − 40) × ($3.17 / 40)
```

Wall track uses a flat-then-linear curve because tracks under 40" don't see the same finishing complexity as taller post members.

---

## Vinyl cut tiers (manufacturer-fixed)

`courierCutSpec()` in `calculator.ts` picks one of three cut sizes per post height. The tiers aren't arbitrary — they're the **manufacturer's stocked cut lengths**. Don't tweak these without confirming new stock sizes with IAS.

**13mm laminate gasket** (10 ft / 120" stock):

| Post height | Cut size | Cuts per stock length | Notes |
|---|---|---|---|
| ≥ 38" | 40" | 3 | Kerf = 0 (perfect division) |
| 27"–37" | 30" | 4 | Kerf = 0 |
| < 27" | 24" | 5 | Used when post is below courier-friendly threshold |

**12mm tempered gasket** (12 ft / 144" stock):

| Post height | Cut size | Cuts per stock length |
|---|---|---|
| ≥ 38" | 48" | 3 |
| 27"–37" | 36" | 4 |
| < 27" | 24" | 6 |

**Critical rule:** wall track vinyl always uses `wallTrackHeight` for tier selection — never the post height. If short posts are selected, post-height vinyl drops to the 24" tier but wall tracks stay at full rail height.

---

## Glass insert length formulas

These match the IAS installation guides (`installation-guides/InfinityInstallationGuideSurface.pdf` etc.) and are verbatim from the 2021 Excel:

| Element | Formula |
|---|---|
| Post glass insert | `postHeightAboveDeck − bottomGap − 3` |
| End post insert | `postHeightAboveDeck − 0.75` |
| Wall track panel | `wallTrackHeight − bottomGap − 3` |

The `−3` and `−0.75` constants come from physical clearance in the post / track channels (not arbitrary).

`wallTrackHeight = actualRailHeight − DEFAULT_TOP_REVEAL` always — the track's height is tied to the rail, not the post. This matters because users can drive `topGlassReveal` very high (Canada short-post mode), but the wall track must remain at the full rail height. There's an extensive comment about this in `calculateSurface()` and `calculateFascia()`.

---

## Setting block & wedge logic

- Standard setting block heights: **0.5"** and **0.25"** (used in pairs to make up the bottom gap).
- Fascia setting block space = `bottomGap + distToDeck`. Typical = 2" + 3" = 5".
- **If fascia setting block space > 5":** switch to a wedge instead of a stock setting block. Wedge length = setting block space − 1.5" per side. The calculator emits a warning when this triggers.
- Glass wedge thicknesses (used at the top, not the bottom): **4"** for 10mm glass, **3"** for 12mm.

---

## Country / mount constraints

| Constraint | Surface (US) | Surface (CA) | Fascia (US) | Fascia (CA) |
|---|---|---|---|---|
| Min post above deck | rail − 2" | 24" | n/a | n/a |
| Min reveal | 0" | 0" | 0" | 0" |
| Max reveal | **2"** | rail − 24 | **2"** | rail − 24 (also bounded by min physical post) |
| Min physical post (fascia only) | 32" | 32" | 32" | 32" |

**The US 2" cap applies to both mount types** — it's a regulatory/sales-compliance rule (short posts cannot be sold in the US under any guise), not just a geometric constraint. This was the reason for the `computeRevealConstraints` US cap fix on 2026-05-04.

For 42" rails in Canada, max reveal is **18.125"**, which produces a 24"-above-deck "short post" configuration. Triggered explicitly by the Short Post button — not reachable via reveal alone.

---

## Price update workflow

Prices are **manually transcribed** from `source-data/Dealer_Price_List-2026.xltx` into the `PRICES_2026` constant in `client/src/lib/calculator.ts`. There is no auto-sync.

When a new dealer price list arrives:

1. Open the new XLTX. Sheets are: `Infinity`, `Parts`, `Fasteners`.
2. For each post type / part, transcribe the dealer price into the matching field in `PRICES_2026`.
3. **Note:** fastener prices in the price list are NET (no dealer discount applied downstream).
4. Run `pnpm check` to ensure the structure still type-checks.
5. Spot-check a handful of jobs in the calculator and confirm totals roughly match a hand calc using the new sheet.
6. Replace `source-data/Dealer_Price_List-2026.xltx` with the new file (rename the constant if the year rolls).

See also `price-list-extraction.md` for partial-automation notes (`extract_infinity_prices.py`-style scripts existed in the original handoff but weren't kept — process is manual now).

---

## Hosting

Per `DEVELOPER_HANDOFF.md`, the live URL on file is `https://infinitycalc-vxc6ufyo.manus.space` (Manus hosting). The transcript discussion implied Vercel was the eventual target. Worth confirming with Mike before the next deployment.

The build is a pure static SPA — `pnpm build` produces `dist/public/`, deployable to any CDN with no env vars or backend.
