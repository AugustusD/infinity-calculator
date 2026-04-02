/**
 * Infinity Glass Railing Calculator — Core Engine
 * Design: Clean Professional (Sora + IBM Plex Mono, warm white, navy/blue/red)
 * 
 * Pricing source: Dealer_Price_List-2026.xltx
 * Formula source: CUSTOM_Infinity_Calculator2021.xltx
 * Installation logic: InfinityInstallationGuideSurface.pdf, InfinityInstallationGuideFascia.pdf
 */

// ============================================================
// 2026 DEALER PRICING (from Dealer_Price_List-2026.xltx)
// ============================================================

export const PRICES_2026 = {
  // Surface Mount Posts (INF-SFC-POSTS)
  surface: {
    post_24in: 203.354317979155,   // PPSINF24MID - 24" post height (12mm only)
    post_34in: 216.62870955621003, // PPSINF36MID - 34" post height (36 1/8" rail)
    post_40in: 231.04722107330502, // PPSINF42MID - 40" post height (42 1/8" rail)
    wallTrack_34in: 60.352326837110006, // PINFWM36
    wallTrack_40in: 63.53,              // PINFWM42
    endPost_37in: 145.420244651675,     // PPSINF362ENDL/R - 2.5" end post, 36 1/8" rail
    endPost_43in: 165.76737767625002,   // PPSINF422ENDL/R - 2.5" end post, 42 1/8" rail
    postCap_25: 14.678538776195,        // PCP250 - 2.5" pyramid post cap
    basePlateGasket: 3.74,              // RPLBPG - Base Plate Gasket Neoprene 1/8x4x4
    ezShim: 6.955729180925,            // RPLBPSHIM - base plate E-Z shim (bag of 10)
  },

  // Fascia Mount Posts (INF-FASC-POSTS)
  fascia: {
    post_32in: 165.650365409655,   // PPFINF24MID - 32" post (24" rail height)
    post_42in: 186.98560201881,    // PPFINF36MID - 42" post (36 1/8" rail)
    post_48in: 201.39,             // PPFINF42MID - 48" post (42 1/8" rail)
    wallTrack_34in: 60.352326837110006, // PINFWM36
    wallTrack_40in: 63.53,              // PINFWM42
    endPost_45in: 206.0169242075,       // PPFINF362ENDL/R - 2.5" end post, 36 1/8" rail
    endPost_51in: 220.148312167,        // PPFINF422ENDL/R - 2.5" end post, 42 1/8" rail
    postCap_25: 14.678538776195,        // PCP250
    // Fascia base plates (INF-FASC-BPLATES)
    bplate_std_midInside: 42.319436418525,   // PPLFINFLT1/RT1 - 7/16" offset, mid/inside
    bplate_std_outside: 43.619572714025004,  // PPLFINFLT2/RT2 - 7/16" offset, outside
    bplate_ext_midInside: 46.975017928999996, // PPLFINFLT3/RT3 - 1.5" offset, mid/inside
    bplate_ext_outside: 48.9069961625,        // PPLFINFLT4/RT4 - 1.5" offset, outside
  },

  // Parts & Options (INF-PARTS&OPTS)
  parts: {
    glassInsert_12mm_12ft: 24.62458143677,  // RPLINFGL12
    glassInsert_13mm_10ft: 20.5227121785,   // RPLINFGL13
    glassWedge_12mm_12ft: 74.54981518397001, // RPLINFGW12
    glassWedge_12mm_3in: 3.33,              // RPLINFGW123
    settingBlock_10ft: 61.94,               // RPLINFSB
    settingBlock_1_5in: 2.62627531691,      // RPLINFSB15
    endCap: 16.576737767625,               // PCPINF - top cap for end posts
    basePlateCover_mid: 22.102317023500003, // PBCIM
    basePlateCover_outside: 23.402453319000003, // PBCIO
    basePlateCover_inside: 23.402453319000003,  // PBCII
    glassShelfKit: 229.24003162255997,      // PSHLINF12
    fasciaShim_midInside: 4.21,              // RPLFINFSH25 - 1/4" rubber gasket MP/IC
    fasciaShim_outside: 12.39,              // RPLFINFOSH25 - 1/4" rubber gasket OC
    shoulderWasherBox: 21.54,              // RPLSCI516 - 5/16" nylon insulator box/100 (no discount)
  },

  // Fasteners — all NET PRICE, no dealer discount
  fasteners: {
    tekScrew_10x075: 27.31,       // PSC10X075PTS - #10x3/4 painted tek screw (box/100)
    // #14x3 Pan Head: Painted (PSC14X300PHS) when no base plate covers, Mill Finish (RSC14X300FHD) when covers included
    panHeadScrew_14x3_painted: 56.85,  // PSC14X300PHS - #14x3 P.H. Stainless Painted (box/100)
    panHeadScrew_14x3_mill: 30.30,     // RSC14X300FHD - #14x3 F.H. Yellow Zinc Mill Finish (box/100)
    hexHeadScrew_516x5: 85.12,         // PSC516X500HHS - 5/16"x5" H.H. Stainless Painted (box/50)
    nylonWasher_14: 20.00,             // RPLSCI14 - #14 Nylon Insulator 1/4" ID (box/100) — pairs with pan head
    nylonWasher_516: 21.54,            // RPLSCI516 - 5/16" Nylon Insulator (box/100) — pairs with hex head
  },
};

// ============================================================
// PRICING INTERPOLATION HELPERS
// ============================================================

/**
 * Surface mount Infinity post price at a given post height above deck.
 * Uses 2026 base prices with per-inch interpolation from original calculator.
 * Post height = rail height - top glass reveal
 */
export function surfacePostPrice(postHeightAboveDeck: number): number {
  const h = postHeightAboveDeck;
  const p24 = PRICES_2026.surface.post_24in;
  const p34 = PRICES_2026.surface.post_34in;
  const p40 = PRICES_2026.surface.post_40in;

  // Per-inch rates derived from 2026 prices
  const perInch_24_34 = (p34 - p24) / 10; // $1.328/inch
  const perInch_34_40 = (p40 - p34) / 6;  // $2.403/inch

  // Calc A (linear from 34" base)
  let calcA: number;
  if (h <= 34) {
    calcA = p34 + (h - 34) * perInch_24_34;
  } else {
    calcA = p34 + (h - 34) * perInch_34_40;
  }

  // Calc B (alternative slope from original)
  const perInch_B_low = (p34 - p24) / 10;
  const perInch_B_high = perInch_34_40;
  let calcB: number;
  if (h <= 34) {
    calcB = p34 + (h - 34) * perInch_B_low;
  } else {
    calcB = p34 + (h - 34) * perInch_B_high;
  }

  return Math.max(calcA, calcB);
}

/**
 * Surface mount wall track price at a given post height.
 * Wall track height = rail height - 2 (from formula H5 = D38 - 2)
 */
export function surfaceWallTrackPrice(railHeight: number): number {
  const wt34 = PRICES_2026.surface.wallTrack_34in;
  const wt40 = PRICES_2026.surface.wallTrack_40in;
  const perInch = (wt40 - wt34) / 6;
  const trackHeight = railHeight - 2;
  return wt34 + (trackHeight - 34) * perInch;
}

/**
 * Surface mount 2.5" end post price at a given post height above deck.
 * End post height = post height above deck + 1 (from formula H4 = D38 + 1)
 */
export function surfaceEndPostPrice(postHeightAboveDeck: number): number {
  const ep37 = PRICES_2026.surface.endPost_37in;
  const ep43 = PRICES_2026.surface.endPost_43in;
  const perInch = (ep43 - ep37) / 6;
  // End post physical height = post height + 1
  const endPostHeight = postHeightAboveDeck + 1;
  const baseHeight = 37; // corresponds to 36" post top (36 1/8" rail - 2 1/8" reveal = 34" + 1 = 37? Actually 34+1=35... let me use the 36 1/8" rail standard)
  // At 36 1/8" rail, post top = 34", end post = 37" (34+3? or 34+1=35?)
  // From price list: 36 1/8" rail → end post height 37", 42 1/8" rail → end post height 43"
  // Difference: 43-37=6" for 6" rail height difference → 1:1 ratio
  return ep37 + (endPostHeight - 37) * perInch;
}

/**
 * Fascia mount Infinity post price at a given physical post length.
 * Physical post length = (rail height - top reveal) + dist_to_deck + base_plate_height
 */
export function fasciaPostPrice(physicalPostLength: number): number {
  const p32 = PRICES_2026.fascia.post_32in;
  const p42 = PRICES_2026.fascia.post_42in;
  const p48 = PRICES_2026.fascia.post_48in;

  const perInch_32_42 = (p42 - p32) / 10;
  const perInch_42_48 = (p48 - p42) / 6;

  if (physicalPostLength <= 42) {
    return p42 + (physicalPostLength - 42) * perInch_32_42;
  } else {
    return p42 + (physicalPostLength - 42) * perInch_42_48;
  }
}

/**
 * Fascia mount wall track price.
 */
export function fasciaWallTrackPrice(railHeight: number): number {
  const wt34 = PRICES_2026.fascia.wallTrack_34in;
  const wt40 = PRICES_2026.fascia.wallTrack_40in;
  const perInch = (wt40 - wt34) / 6;
  const trackHeight = railHeight - 2;
  return wt34 + (trackHeight - 34) * perInch;
}

/**
 * Fascia mount 2.5" end post price at a given physical post length.
 */
export function fasciaEndPostPrice(physicalPostLength: number): number {
  const ep45 = PRICES_2026.fascia.endPost_45in;
  const ep51 = PRICES_2026.fascia.endPost_51in;
  const perInch = (ep51 - ep45) / 6;
  return ep45 + (physicalPostLength - 45) * perInch;
}

// ============================================================
// COURIER CUT SIZE LOOKUP TABLE
// ============================================================

/**
 * Manufacturer-defined courier cut sizes keyed on post height above deck.
 * These are batch-friendly sizes that divide evenly into stock lengths:
 *   12mm stock = 144" (12 ft)  →  tiers: 48" (×3), 36" (×4), 24" (×6)
 *   13mm stock = 120" (10 ft)  →  tiers: 40" (×3), 30" (×4), 24" (×5)
 *
 * Tier thresholds (based on post height above deck):
 *   ≥ 38"  →  Tall Post tier   (40" above deck standard)
 *   ≥ 27"  →  Mid tier         (34" above deck standard)
 *   < 27"  →  Short Post tier  (24" above deck standard)
 *
 * The 1/8" base plate gasket is already embedded in the post height values
 * (e.g. 40 1/8" above deck for 42" rail tall post), so thresholds use round numbers.
 */
export interface CutSpec { cutSize: number; cutsPerLength: number; stockLength: number; }

export function courierCutSpec(postHeightAboveDeck: number, thickness: 12 | 13): CutSpec {
  const stockLength = thickness === 12 ? 144 : 120;
  let cutSize: number;
  if (postHeightAboveDeck >= 38) {
    // Tall Post tier: 40" above deck (42 1/8" rail)
    cutSize = thickness === 12 ? 48 : 40;
  } else if (postHeightAboveDeck >= 27) {
    // Mid tier: 34" above deck (36 1/8" rail)
    cutSize = thickness === 12 ? 36 : 30;
  } else {
    // Short Post tier: 24" above deck
    cutSize = 24;
  }
  return { cutSize, cutsPerLength: Math.floor(stockLength / cutSize), stockLength };
}

/**
 * Cut spec for the end post termination side (vinyl-only, no glass).
 * Termination vinyl length = postHeightAboveDeck + distToDeck - 0.25" (end cap)
 * For surface mount: distToDeck = 0 (channel starts at deck), so length = postHeight - 0.75"
 * For fascia mount: distToDeck > 0, so length is longer.
 *
 * Tier thresholds mirror the glass insert tiers but for the longer termination lengths.
 * Surface termination sizes (distToDeck=0): ~39.25", ~33.25", ~23.25"
 *   12mm: 48" (×3), 36" (×4), 24" (×6)
 *   13mm: 40" (×3), 40" (×3), 24" (×5)  — 34" post termination uses 40" tier
 * Fascia termination adds distToDeck (typically 3"), making lengths ~42", ~36", ~26"
 *   These still fit within the same tier cut sizes.
 */
export function courierTerminationCutSpec(terminationLength: number, thickness: 12 | 13): CutSpec {
  const stockLength = thickness === 12 ? 144 : 120;
  let cutSize: number;
  if (terminationLength > 36) {
    cutSize = thickness === 12 ? 48 : 40;
  } else if (terminationLength > 27) {
    cutSize = thickness === 12 ? 36 : 40; // 13mm: 30" too short for 33.25", use 40"
  } else {
    cutSize = 24;
  }
  return { cutSize, cutsPerLength: Math.floor(stockLength / cutSize), stockLength };
}

/** @deprecated Use courierCutSpec() instead. Kept for any legacy references. */
export function optimizeCut(insertLength: number, stockLength: number): { cutSize: number; cutsPerLength: number } {
  if (insertLength <= 0) return { cutSize: stockLength, cutsPerLength: 1 };
  if (insertLength >= stockLength) return { cutSize: stockLength, cutsPerLength: 1 };
  let bestCuts = 1;
  let bestCutSize = stockLength;
  const minCut = Math.ceil(insertLength);
  for (let c = minCut; c <= stockLength; c++) {
    const cuts = Math.floor(stockLength / c);
    if (cuts > bestCuts) { bestCuts = cuts; bestCutSize = c; }
    if (cuts <= 1 && bestCuts >= 1 && c > minCut) break;
  }
  return { cutSize: bestCutSize, cutsPerLength: bestCuts };
}

// ============================================================
// PAINT COST PER INCH (from original calculator)
// ============================================================
const PAINT_MARKUP = 49.67 / 11.03;
const PAINT_PER_INCH_BASE = (2.3 / 40) * 1.15;
const PAINT_PER_INCH = PAINT_PER_INCH_BASE * PAINT_MARKUP;

export function postPaintCost(postHeightAboveDeck: number): number {
  // From original: F29 = IF(H3<34,8.25,IF(H3<40,8.25+(H3-34)*(10.04-8.25)/6,IF(H3=40,10.04,10.04+(H3-40)*(11.97-10.04)/8)))
  const h = postHeightAboveDeck;
  if (h < 34) return 8.25;
  if (h < 40) return 8.25 + (h - 34) * ((10.04 - 8.25) / 6);
  if (h === 40) return 10.04;
  return 10.04 + (h - 40) * ((11.97 - 10.04) / 8);
}

export function trackPaintCost(trackHeight: number): number {
  // From original: F30 = IF(F44<40,3.17,3.17+(F44-40)*(3.17/40))
  if (trackHeight < 40) return 3.17;
  return 3.17 + (trackHeight - 40) * (3.17 / 40);
}

// ============================================================
// TYPES
// ============================================================

export type Country = 'CA' | 'US';
export type MountType = 'surface' | 'fascia';
export type RailHeight = 36 | 42;
export type PostConfig = 'tall' | 'short'; // Canada only
export type GlassThickness = 12 | 13;
export type FasciaOffset = 0.4375 | 1.5; // 7/16" or 1.5"

export interface JobInfo {
  dealerName: string;
  jobReference: string;
  color: string;
}

export interface QuantityInputs {
  midPosts: number;
  endPosts: number;
  outsideCornerPosts: number;
  insideCornerPosts: number;
  wallTracks: number;
  endPostsLeft25: number;
  endPostsRight25: number;
}

export interface AddOns {
  removeTrackFromPost: number;
  cutDownTrack: number;
  add5x5BasePlate: number;
  // Per-post-type breakdown for 5x5 base plate (surface mount only)
  // Each value = how many of that post type get the 5x5 plate
  basePlate5x5_midPost: number; // covers both mid posts and end posts (they share a BOM line)
  basePlate5x5_outsideCorner: number;
  basePlate5x5_insideCorner: number;
  basePlate5x5_endPost25: number; // combined left + right 2.5" end posts
  addWeldedSurfaceBase: number;
  addWeldedExtrudedSideMount: number;
  glassShelfKits: number;
  includeBasePlateCovers: boolean;
  includeShims: boolean; // fascia only — 1/4" base plate rubber gaskets
  includeShoulderWashers: boolean; // fascia only — 5/16" nylon insulators, no discount
  // Deck fasteners add-on
  deckFastenerOption: 'none' | 'panHead14x3' | 'hexHead516x5'; // surface: both; fascia: hexHead516x5 only
  includeDeckNylonWashers: boolean; // surface only, paired with either screw type
}

export interface ConfigInputs {
  country: Country;
  mountType: MountType;
  railHeight: RailHeight; // nominal: 36 or 42
  postConfig: PostConfig; // Canada only
  glassThickness: GlassThickness;
  topGlassReveal: number; // inches above post top
  bottomGlassGap: number; // inches from deck to bottom of glass
  discountLevel: number; // 0 to 1 (e.g., 0.435 = 43.5% discount)
  shipViaCourier: boolean;
  basePlateGaskets: boolean; // include 4x4 base plate gaskets
  customRevealUnlocked: boolean;
  // Surface mount specific
  // Fascia mount specific
  fasciaOffset: FasciaOffset;
  distTopBasePlateToDeck: number; // inches (standard = 3")
  quantities: QuantityInputs;
  addOns: AddOns;
}

export interface MaterialLineItem {
  description: string;
  partCode?: string;
  qty: number;
  unitCost: number;
  total: number;
  paintCost?: number;
  note?: string;
}

export interface CalculationResult {
  // Computed dimensions
  railHeightActual: number;       // 36.125 or 42.125
  postHeightAboveDeck: number;    // top of post above deck
  physicalPostLength?: number;    // fascia only
  settingBlockHeight: number;     // height of setting block
  glassInsertLength: number;      // length of glass insert in post
  endPostInsertLength: number;    // length of glass insert in end post
  wallTrackHeight: number;        // height of wall track
  endPost25Height: number;        // height of 2.5" end post
  glassInsertLengthTrack: number; // length of glass insert in wall track

  // Gasket/insert lengths for courier sizing
  maxCutLength: number;
  courierLength: number;

  // Setting block calculations
  settingBlockFt: number;
  settingBlockLengths: number;
  settingBlockLeftover: number;
  settingBlock15Pieces: number;
  useWedgeInsteadOfBlock: boolean; // fascia: setting block > 5"
  extraWedgeLength?: number;       // fascia: (setting block space - 1.5") per side

  // Gasket quantities
  gasketLengths: number;
  gasketDescription: string;

  // Glass wedge
  glassWedgeQty: number;

  // Fastener counts
  deckFasteners: number;
  wallFasteners: number;

  // Error/warning messages
  warnings: string[];
  errors: string[];

  // Bill of materials
  lineItems: MaterialLineItem[];

  // Totals
  subtotal: number;
  jobCost: number;
}

// ============================================================
// CONSTANTS
// ============================================================

const RAIL_HEIGHT_MAP: Record<RailHeight, number> = {
  36: 36.125,
  42: 42.125,
};

// Standard glass reveal defaults
const DEFAULT_TOP_REVEAL = 2.125; // 2 1/8"
const DEFAULT_BOTTOM_GAP = 2.0;   // 2"
const DEFAULT_DIST_TO_DECK = 3.0; // 3" (fascia)
const BASE_PLATE_HEIGHT = 5.0;    // 5" standard fascia base plate

// Minimum post heights
const MIN_POST_HEIGHT_ABOVE_DECK = 24.0; // absolute minimum
const MIN_FASCIA_PHYSICAL_LENGTH = 32.0; // minimum fascia post length

// ============================================================
// CONSTRAINT LOGIC
// ============================================================

export interface RevealConstraints {
  topRevealMin: number;
  topRevealMax: number;
  topRevealDefault: number;
  bottomGapMin: number;
  bottomGapMax: number;
  bottomGapDefault: number;
  postHeightAboveDeck: number;
  physicalFasciaLength?: number;
  isShortPost: boolean;
  warningMessages: string[];
}

export function computeRevealConstraints(
  country: Country,
  mountType: MountType,
  railHeight: RailHeight,
  postConfig: PostConfig,
  topReveal: number,
  bottomGap: number,
  distToDeck: number,
): RevealConstraints {
  const actualRailHeight = RAIL_HEIGHT_MAP[railHeight];
  const warnings: string[] = [];

  // Post height above deck = rail height - top reveal
  let postHeightAboveDeck = actualRailHeight - topReveal;
  let isShortPost = postConfig === 'short';

  // Determine top reveal constraints
  let topRevealMin = 0;
  let topRevealMax: number;

  if (mountType === 'surface') {
    if (country === 'US') {
      // US: post can be max 2" shorter than rail height → reveal 0" to 2"
      topRevealMax = 2.0;
      topRevealMin = 0;
    } else {
      // Canada: post can go down to 24" above deck
      // Max reveal = rail height - 24
      topRevealMax = actualRailHeight - MIN_POST_HEIGHT_ABOVE_DECK;
    }
  } else {
    // Fascia: physical post length must be >= 32"
    // Physical length = (rail height - top reveal) + dist_to_deck + base_plate_height
    // Min physical = 32 → rail height - top reveal >= 32 - dist_to_deck - base_plate_height
    const minPostTop = 32 - distToDeck - BASE_PLATE_HEIGHT;
    topRevealMax = actualRailHeight - Math.max(MIN_POST_HEIGHT_ABOVE_DECK, minPostTop);
  }

  // Clamp top reveal
  const clampedTopReveal = Math.max(topRevealMin, Math.min(topRevealMax, topReveal));
  postHeightAboveDeck = actualRailHeight - clampedTopReveal;

  // Check if short post threshold is crossed (Canada)
  if (country === 'CA' && postHeightAboveDeck <= MIN_POST_HEIGHT_ABOVE_DECK) {
    isShortPost = true;
    warnings.push(`Post height at minimum (24"). Short post configuration applied.`);
  }

  // Fascia physical length
  let physicalFasciaLength: number | undefined;
  if (mountType === 'fascia') {
    physicalFasciaLength = postHeightAboveDeck + distToDeck + BASE_PLATE_HEIGHT;
    if (physicalFasciaLength < MIN_FASCIA_PHYSICAL_LENGTH) {
      warnings.push(`Fascia post physical length would be ${physicalFasciaLength.toFixed(2)}" — minimum is 32". Adjusting reveal.`);
    }
  }

  return {
    topRevealMin,
    topRevealMax,
    topRevealDefault: DEFAULT_TOP_REVEAL,
    bottomGapMin: 0,
    bottomGapMax: 6,
    bottomGapDefault: DEFAULT_BOTTOM_GAP,
    postHeightAboveDeck,
    physicalFasciaLength,
    isShortPost,
    warningMessages: warnings,
  };
}

// ============================================================
// MAIN CALCULATION ENGINE — SURFACE MOUNT
// ============================================================

export function calculateSurface(config: ConfigInputs): CalculationResult {
  const actualRailHeight = RAIL_HEIGHT_MAP[config.railHeight];
  const topReveal = config.topGlassReveal;
  const bottomGap = config.bottomGlassGap;
  const discount = config.discountLevel;
  const q = config.quantities;
  const addons = config.addOns;
  const isCourier = config.shipViaCourier;
  const thickness = config.glassThickness; // 12 or 13

  const warnings: string[] = [];
  const errors: string[] = [];

  // --- Computed dimensions ---
  const postHeightAboveDeck = Math.max(24, actualRailHeight - topReveal);
  const wallTrackHeight = actualRailHeight - 2;
  const endPost25Height = actualRailHeight + 1;

  // Glass insert lengths
  // Post glass panel: post height above deck - bottom gap - 3
  const glassInsertLength = postHeightAboveDeck - bottomGap - 3;
  // End post insert: post height above deck - 0.75
  const endPostInsertLength = postHeightAboveDeck - 0.75;
  // Wall track panel: wall track height - bottom gap - 3
  const glassInsertLengthTrack = wallTrackHeight - bottomGap - 3;

  // Setting block heights
  const settingBlock05Height = bottomGap - 0.5;  // 0.5" base plate setting block
  const settingBlock025Height = bottomGap - 0.25; // 0.25" base plate setting block

  // Total pieces needing glass inserts
  const totalPostPieces = q.midPosts * 2 + q.endPosts + q.outsideCornerPosts * 2 + q.insideCornerPosts * 2;
  const totalTrackPieces = q.wallTracks + q.endPostsLeft25 + q.endPostsRight25;
  const totalEndPostPieces = q.endPosts - addons.removeTrackFromPost;

  // ── COURIER / VINYL CUT OPTIMIZATION ──
  // Stock lengths: 12mm = 144" (12 ft), 13mm = 120" (10 ft)
  const stockLength = thickness === 12 ? 144 : 120;
  const stockLabel = thickness === 12 ? 'Gasket 12mm 12 Ft Lengths' : 'Gasket 13mm 10 Ft Lengths';
  // Courier price multiplier (from Patrick's original workbook)
  const courierMultiplier = thickness === 12 ? 1.181 : 1.337;

  // Manufacturer lookup table cut specs (keyed on postHeightAboveDeck)
  const postOpt  = courierCutSpec(postHeightAboveDeck, thickness);
  // Wall track uses same tier as post (same post height drives the rail height)
  const trackOpt = courierCutSpec(postHeightAboveDeck, thickness);
  // End post glass side = same as mid post (mounting-style agnostic)
  const endOpt   = postOpt;

  // Surface mount: end post vinyl-only side = (postHeightAboveDeck - 0.5" base plate) - 0.25" end cap
  const surfaceTrackOpening = postHeightAboveDeck - 0.5;
  const endPostVinylLength = surfaceTrackOpening - 0.25;
  const endPostVinylOpt = courierTerminationCutSpec(endPostVinylLength, thickness);

  // Stock lengths needed per group
  const stockLengths_post  = totalPostPieces   > 0 ? Math.ceil(totalPostPieces   / postOpt.cutsPerLength)  : 0;
  const stockLengths_track = totalTrackPieces   > 0 ? Math.ceil(totalTrackPieces   / trackOpt.cutsPerLength) : 0;
  const endPostVinylQty = q.endPosts;
  const stockLengths_endVinyl = endPostVinylQty > 0 ? Math.ceil(endPostVinylQty / endPostVinylOpt.cutsPerLength) : 0;

  let gasketLengths: number;
  let gasketDescription: string;
  const maxCutLength = Math.max(glassInsertLength, glassInsertLengthTrack);
  const courierLength = isCourier ? postOpt.cutSize : postOpt.stockLength; // for return value compat

  if (!isCourier) {
    // Non-courier: all pieces come from full stock lengths
    gasketLengths = Math.ceil(
      totalPostPieces   / postOpt.cutsPerLength +
      totalTrackPieces  / trackOpt.cutsPerLength
    );
    gasketDescription = stockLabel;
  } else {
    // Courier: post + track grouped (same tier); end post vinyl is separate
    gasketLengths = stockLengths_post + stockLengths_track;
    gasketDescription = stockLabel;
  }

  // Setting block calculations
  const totalSettingBlockPieces = q.midPosts * 2 + q.endPosts + q.outsideCornerPosts * 2 + q.insideCornerPosts * 2 + q.wallTracks + q.endPostsLeft25;
  // Only subtract 5x5 plates assigned specifically to 2.5" end posts — not the full add5x5BasePlate total
  const totalSettingBlock025Pieces = Math.max(0, q.endPostsRight25 + q.endPostsLeft25 - addons.basePlate5x5_endPost25);

  // 0.5" setting blocks
  const sb05Length = settingBlock05Height;
  const sb05Pieces = totalSettingBlockPieces;
  const sb025Pieces = totalSettingBlock025Pieces;

  // 1.5" pieces (when setting block height = 1.5")
  const sb15Pieces_05 = sb05Length === 1.5 ? sb05Pieces : 0;
  const sb15Pieces_025 = settingBlock025Height === 1.5 ? sb025Pieces : 0;
  const settingBlock15Pieces = sb15Pieces_05 + sb15Pieces_025;

  // Footage needed for setting blocks
  const sbFootage_05 = sb05Length !== 1.5 ? (sb05Pieces * (sb05Length + 0.125)) / 12 : 0;
  const sbFootage_025 = settingBlock025Height !== 1.5 ? (sb025Pieces * (settingBlock025Height + 0.125)) / 12 : 0;
  const totalSBFootage = sbFootage_05 + sbFootage_025;

  const settingBlockLengths = Math.floor(totalSBFootage / 10);
  const settingBlockLeftover = totalSBFootage - settingBlockLengths * 10;

  let settingBlockFt: number;
  if (isCourier) {
    settingBlockFt = totalSBFootage;
  } else {
    settingBlockFt = settingBlockLeftover < 7 ? settingBlockLeftover : 0;
  }

  let settingBlockLengthsOrdered: number;
  if (isCourier) {
    settingBlockLengthsOrdered = 0;
  } else {
    settingBlockLengthsOrdered = settingBlockLeftover < 7 ? settingBlockLengths : settingBlockLengths + 1;
  }

  // Glass wedge quantity
  const glassWedgeQty = sb05Pieces + sb025Pieces;

  // Fasteners
  const deckFasteners = (q.midPosts + q.endPosts + q.outsideCornerPosts + q.insideCornerPosts + q.endPostsLeft25 + q.endPostsRight25) * 4;
  const wallFastenersPerTrack = Math.round(actualRailHeight / 13 + 1);
  const wallFasteners = q.wallTracks * wallFastenersPerTrack;

  // Validation
  if (bottomGap > 3.875) {
    warnings.push('Warning: Large bottom gap. Ensure no code violations.');
  }

  // ---- PRICING ----
  const postPriceEa = surfacePostPrice(postHeightAboveDeck) * (1 - discount);
  const wallTrackPriceEa = surfaceWallTrackPrice(actualRailHeight) * (1 - discount);
  const endPost25PriceEa = surfaceEndPostPrice(postHeightAboveDeck) * (1 - discount);

  // Gasket unit price: full stock length price × courier multiplier (if courier) × discount
  const baseGasketPrice = thickness === 13 ? PRICES_2026.parts.glassInsert_13mm_10ft : PRICES_2026.parts.glassInsert_12mm_12ft;
  const gasketUnitPrice = baseGasketPrice * (isCourier ? courierMultiplier : 1) * (1 - discount);

  const sbLengthPrice = PRICES_2026.parts.settingBlock_10ft * (1 - discount);
  const sbFtPrice = (PRICES_2026.parts.settingBlock_10ft / 10) * (1 - discount);
  const sb15Price = PRICES_2026.parts.settingBlock_1_5in * (1 - discount);
  const wedgePrice = (thickness === 12 ? PRICES_2026.parts.glassWedge_12mm_3in : PRICES_2026.parts.glassWedge_12mm_3in) * (1 - discount);
  const endCapPrice = PRICES_2026.parts.endCap * (1 - discount);
  const basePlateGasketPrice = PRICES_2026.surface.basePlateGasket * (1 - discount);
  const postCap25Price = PRICES_2026.surface.postCap_25 * (1 - discount);

  // 5x5 base plate breakdown — clamp each type to available post count
  // Note: mid posts and end posts share a single BOM line, so basePlate5x5_midPost covers both MP and EP
  const bp5_mid = Math.min(addons.basePlate5x5_midPost, q.midPosts + q.endPosts);
  const bp5_oc  = Math.min(addons.basePlate5x5_outsideCorner, q.outsideCornerPosts);
  const bp5_ic  = Math.min(addons.basePlate5x5_insideCorner, q.insideCornerPosts);
  const bp5_ep25 = Math.min(addons.basePlate5x5_endPost25, q.endPostsLeft25 + q.endPostsRight25);
  const total5x5Assigned = bp5_mid + bp5_oc + bp5_ic + bp5_ep25;

  const totalMidEndPosts = q.midPosts + q.endPosts;
  const totalCornerPosts = q.outsideCornerPosts + q.insideCornerPosts;
  const endCapsQty = q.endPosts - addons.removeTrackFromPost;
  const basePlateGasketQty = config.basePlateGaskets
    ? q.midPosts + q.endPosts + q.outsideCornerPosts + q.insideCornerPosts + q.endPostsLeft25 + q.endPostsRight25 - total5x5Assigned - addons.addWeldedSurfaceBase
    : 0;

  // Paint costs
  const postPaintEa = postPaintCost(postHeightAboveDeck);
  const trackPaintEa = trackPaintCost(wallTrackHeight);

  // Build line items
  const lineItems: MaterialLineItem[] = [];

  const addLine = (desc: string, qty: number, unitCost: number, paintCostEa?: number, note?: string, partCode?: string) => {
    if (qty === 0) return;
    lineItems.push({
      description: desc,
      partCode,
      qty,
      unitCost,
      total: qty * unitCost,
      paintCost: paintCostEa ? qty * paintCostEa : undefined,
      note,
    });
  };

  const plate5x5UnitCost = 19.2733069 * (1 - discount);

  // ── 1. ALUMINUM: Posts → Wall Tracks → End Caps → 2.5" Posts → Post Caps ──
  // Standard posts (excluding those getting 5x5 plates)
  const stdMidEnd = totalMidEndPosts - bp5_mid;
  const stdOC = q.outsideCornerPosts - bp5_oc;
  const stdIC = q.insideCornerPosts - bp5_ic;
  const stdEP25 = (q.endPostsLeft25 + q.endPostsRight25) - bp5_ep25;
  addLine('Infinity Mid Post', stdMidEnd, postPriceEa, postPaintEa);
  addLine('Infinity Outside Corner Post', stdOC, postPriceEa, postPaintEa);
  addLine('Infinity Inside Corner Post', stdIC, postPriceEa, postPaintEa);
  // Combined post + 5x5 plate lines
  if (bp5_mid > 0) addLine(`Infinity Mid/End Post (incl. 5"×5"×0.5" Base Plate)`, bp5_mid, postPriceEa + plate5x5UnitCost, postPaintEa);
  if (bp5_oc  > 0) addLine(`Infinity Outside Corner Post (incl. 5"×5"×0.5" Base Plate)`, bp5_oc, postPriceEa + plate5x5UnitCost, postPaintEa);
  if (bp5_ic  > 0) addLine(`Infinity Inside Corner Post (incl. 5"×5"×0.5" Base Plate)`, bp5_ic, postPriceEa + plate5x5UnitCost, postPaintEa);
  if (bp5_ep25 > 0) addLine(`2.5" End Post (incl. 5"×5"×0.5" Base Plate)`, bp5_ep25, endPost25PriceEa + plate5x5UnitCost, postPaintEa);
  addLine('Infinity Wall Tracks', q.wallTracks, wallTrackPriceEa, trackPaintEa);
  addLine('End Caps', endCapsQty, endCapPrice);
  addLine('2.5" End Left Posts', stdEP25 > 0 ? Math.min(q.endPostsLeft25, stdEP25) : 0, endPost25PriceEa, postPaintEa);
  addLine('2.5" End Right Posts', stdEP25 > 0 ? Math.max(0, stdEP25 - Math.min(q.endPostsLeft25, stdEP25)) : 0, endPost25PriceEa, postPaintEa);
  addLine('2.5" Post Caps', q.endPostsLeft25 + q.endPostsRight25, postCap25Price);
  // Aluminum add-ons
  if (addons.removeTrackFromPost > 0) {
    addLine('Remove Track From Post', addons.removeTrackFromPost, 75.2902047 * (1 - discount));
  }
  if (addons.cutDownTrack > 0) {
    addLine('Cut Down One Track', addons.cutDownTrack, 61.257983 * (1 - discount));
  }
  // Unassigned 5x5 plates (total entered minus assigned to post types)
  const unassigned5x5 = Math.max(0, addons.add5x5BasePlate - total5x5Assigned);
  if (unassigned5x5 > 0) {
    addLine('Add 5"×5"×0.5" Base Plate (unassigned)', unassigned5x5, plate5x5UnitCost);
  }
  if (addons.addWeldedSurfaceBase > 0) {
    addLine('Add Welded Surface Base', addons.addWeldedSurfaceBase, 15.980830300000001 * (1 - discount));
  }
  if (addons.addWeldedExtrudedSideMount > 0) {
    addLine('Add Welded Extruded Side Mount 1.9 Pipe', addons.addWeldedExtrudedSideMount, 49.5327347 * (1 - discount));
  }
  if (addons.includeBasePlateCovers) {
    // Deduct covers for posts that got 5x5 plates (those posts don't use standard covers)
    const midCoverQty = (q.midPosts + q.endPosts) - bp5_mid;
    const outsideCoverQty = q.outsideCornerPosts - bp5_oc;
    const insideCoverQty = q.insideCornerPosts - bp5_ic;
    if (midCoverQty > 0) addLine('Mid Base Plate Covers', midCoverQty, PRICES_2026.parts.basePlateCover_mid * (1 - discount));
    if (outsideCoverQty > 0) addLine('Outside Base Plate Covers', outsideCoverQty, PRICES_2026.parts.basePlateCover_outside * (1 - discount));
    if (insideCoverQty > 0) addLine('Inside Base Plate Covers', insideCoverQty, PRICES_2026.parts.basePlateCover_inside * (1 - discount));
  }
  if (addons.glassShelfKits > 0) {
    addLine('Glass Shelf Kits', addons.glassShelfKits, PRICES_2026.parts.glassShelfKit * (1 - discount));
  }
  // ── 2. PLASTICS / VINYL ──
  if (isCourier) {
    // Courier mode: price full stock lengths, note the cut instruction
    // Main post + track group
    if (gasketLengths > 0) {
      const postCutNote = `Cut to ${postOpt.cutSize}" — ${postOpt.cutsPerLength} piece${postOpt.cutsPerLength > 1 ? 's' : ''} per length`
        + (trackOpt.cutSize === postOpt.cutSize && totalTrackPieces > 0
          ? ` (posts & tracks combined)`
          : '');
      addLine(gasketDescription, gasketLengths, gasketUnitPrice, undefined, postCutNote);
    }
    // Track group if different cut size from post
    if (totalTrackPieces > 0 && trackOpt.cutSize !== postOpt.cutSize) {
      const trackCutNote = `Cut to ${trackOpt.cutSize}" — ${trackOpt.cutsPerLength} piece${trackOpt.cutsPerLength > 1 ? 's' : ''} per length (wall tracks)`;
      addLine(gasketDescription + ' (Wall Tracks)', stockLengths_track, gasketUnitPrice, undefined, trackCutNote);
    }
    // End post glass side uses same cut spec as mid post (mounting-style agnostic)
    // End post glass pieces are already counted in totalPostPieces → stockLengths_post
    // No separate line item needed for end post glass side
    // End post vinyl-only side
    if (stockLengths_endVinyl > 0) {
      const vinylCutNote = `Cut to ${endPostVinylOpt.cutSize}" — ${endPostVinylOpt.cutsPerLength} piece${endPostVinylOpt.cutsPerLength > 1 ? 's' : ''} per length`
        + (endPostVinylOpt.cutSize !== postOpt.cutSize ? ' (end post termination side — different length)' : '');
      addLine(gasketDescription + ' (End Post Termination Side)', stockLengths_endVinyl, gasketUnitPrice, undefined, vinylCutNote);
    }
  } else {
    // Non-courier: single line, full lengths
    addLine(gasketDescription, gasketLengths, gasketUnitPrice);
    // End post vinyl-only side (non-courier)
    const nonCourierEndVinylLengths = endPostVinylQty > 0 ? Math.ceil(endPostVinylQty / endPostVinylOpt.cutsPerLength) : 0;
    if (nonCourierEndVinylLengths > 0) {
      addLine(gasketDescription + ' (End Post Termination Side)', nonCourierEndVinylLengths, gasketUnitPrice);
    }
  }
  addLine('Setting Block (10 Ft Length)', settingBlockLengthsOrdered, sbLengthPrice);
  addLine('Setting Block (Per Ft)', isCourier ? totalSBFootage : (settingBlockLeftover < 7 ? settingBlockLeftover : 0), sbFtPrice);
  addLine('Setting Block (1.5" Pieces)', settingBlock15Pieces, sb15Price);
  addLine(thickness === 12 ? 'Glass Wedge 12mm (3 Inch Piece)' : 'Glass Wedge 13mm (3 Inch Piece)', glassWedgeQty, wedgePrice);
  addLine('Base Plate Gasket - Neoprene 1/8x4x4 (RPLBPG)', basePlateGasketQty, basePlateGasketPrice);
  // ── 3. SCREWS (net price) ──
  if (addons.deckFastenerOption !== 'none') {
    const totalPosts = q.midPosts + q.endPosts + q.outsideCornerPosts + q.insideCornerPosts + q.endPostsLeft25 + q.endPostsRight25;
    const screwsNeeded = totalPosts * 4;
    if (addons.deckFastenerOption === 'panHead14x3') {
      const boxQty = Math.ceil(screwsNeeded / 100);
      const panPrice = addons.includeBasePlateCovers
        ? PRICES_2026.fasteners.panHeadScrew_14x3_mill
        : PRICES_2026.fasteners.panHeadScrew_14x3_painted;
      const panLabel = addons.includeBasePlateCovers
        ? '#14×3" Pan Head Screws Mill Finish RSC14X300FHD (box/100) — not in Infinity Engineering'
        : '#14×3" Pan Head Screws Painted PSC14X300PHS (box/100) — not in Infinity Engineering';
      addLine(panLabel, boxQty, panPrice);
      // ── 4. NYLON WASHERS (net price) ──
      if (addons.includeDeckNylonWashers) {
        addLine('#14 Nylon Insulator RPLSCI14 (box/100) — not in Infinity Engineering', Math.ceil(screwsNeeded / 100), PRICES_2026.fasteners.nylonWasher_14);
      }
    } else if (addons.deckFastenerOption === 'hexHead516x5') {
      const boxQty = Math.ceil(screwsNeeded / 50);
      addLine('5/16"×5" Hex Head Screws Painted PSC516X500HHS (box/50) — not in Infinity Engineering', boxQty, PRICES_2026.fasteners.hexHeadScrew_516x5);
      // ── 4. NYLON WASHERS (net price) ──
      if (addons.includeDeckNylonWashers) {
        addLine('5/16" Nylon Insulator RPLSCI516 (box/100) — not in Infinity Engineering', Math.ceil(screwsNeeded / 100), PRICES_2026.fasteners.nylonWasher_516);
      }
    }
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);

  return {
    railHeightActual: actualRailHeight,
    postHeightAboveDeck,
    settingBlockHeight: settingBlock05Height,
    glassInsertLength,
    endPostInsertLength,
    wallTrackHeight,
    endPost25Height,
    glassInsertLengthTrack,
    maxCutLength,
    courierLength,
    settingBlockFt: isCourier ? totalSBFootage : (settingBlockLeftover < 7 ? settingBlockLeftover : 0),
    settingBlockLengths: settingBlockLengthsOrdered,
    settingBlockLeftover,
    settingBlock15Pieces,
    useWedgeInsteadOfBlock: false,
    gasketLengths,
    gasketDescription,
    glassWedgeQty,
    deckFasteners,
    wallFasteners,
    warnings,
    errors,
    lineItems,
    subtotal,
    jobCost: subtotal,
  };
}

// ============================================================
// MAIN CALCULATION ENGINE — FASCIA MOUNT
// ============================================================

export function calculateFascia(config: ConfigInputs): CalculationResult {
  const actualRailHeight = RAIL_HEIGHT_MAP[config.railHeight];
  const topReveal = config.topGlassReveal;
  const bottomGap = config.bottomGlassGap;
  const distToDeck = config.distTopBasePlateToDeck;
  const fasciaOffset = config.fasciaOffset;
  const discount = config.discountLevel;
  const q = config.quantities;
  const addons = config.addOns;
  const isCourier = config.shipViaCourier;
  const thickness = config.glassThickness;

  const warnings: string[] = [];
  const errors: string[] = [];

  // --- Computed dimensions ---
  const postHeightAboveDeck = Math.max(24, actualRailHeight - topReveal);
  const physicalPostLength = postHeightAboveDeck + distToDeck + BASE_PLATE_HEIGHT;
  const wallTrackHeight = actualRailHeight - 2;
  const endPost25Height = postHeightAboveDeck + 1 + distToDeck + BASE_PLATE_HEIGHT;

  // Glass insert lengths
  // Insert and wedge are mounting-style agnostic: same formula as surface mount.
  // The setting block (not the insert) absorbs the below-deck portion.
  // Post: post height above deck - bottom gap - 3" (glass wedge)
  const glassInsertLength = postHeightAboveDeck - bottomGap - 3;
  // End post glass side = same as mid post (mounting-style agnostic)
  const endPostInsertLength = glassInsertLength;
  // Wall track: wall track height - 3" (glass wedge)
  const glassInsertLengthTrack = wallTrackHeight - 3;

  // Setting block height = bottomGap + distToDeck
  const settingBlockHeight = bottomGap + distToDeck;

  // Check if setting block > 5 1/8" (5.125") → use wedge rule
  // Maximum fascia setting block is 5 1/8": 3 1/8" below deck + 2" above deck
  const MAX_FASCIA_SETTING_BLOCK = 5.125;
  const useWedgeInsteadOfBlock = settingBlockHeight > MAX_FASCIA_SETTING_BLOCK;
  let extraWedgeLength: number | undefined;
  if (useWedgeInsteadOfBlock) {
    extraWedgeLength = settingBlockHeight - 1.5;
    warnings.push(
      `Setting block height (${settingBlockHeight.toFixed(3)}") exceeds maximum 5 1/8". ` +
      `Extended fascia post height is not supported by the engineering. ` +
      `Use 1.5" setting block + ${extraWedgeLength.toFixed(3)}" extra wedge piece per post side.`
    );
  }

  if (physicalPostLength < MIN_FASCIA_PHYSICAL_LENGTH) {
    errors.push(`Fascia post physical length (${physicalPostLength.toFixed(2)}") is below minimum 32". Increase bottom gap or reduce glass reveal.`);
  }

  // ── COURIER / VINYL CUT OPTIMIZATION ──
  // Stock lengths: 12mm = 144" (12 ft), 13mm = 120" (10 ft)
  const stockLength = thickness === 12 ? 144 : 120;
  const stockLabel = thickness === 12 ? 'Gasket 12mm 12 Ft Lengths' : 'Gasket 13mm 10 Ft Lengths';
  const courierMultiplier = thickness === 12 ? 1.181 : 1.337;

  // Gasket quantities
  const totalPostPieces = q.midPosts * 2 + q.endPosts * 2 + q.outsideCornerPosts * 2 + q.insideCornerPosts * 2;
  const totalTrackPieces = q.wallTracks + q.endPostsLeft25 + q.endPostsRight25;
  const totalEndPostPieces = q.endPosts - addons.removeTrackFromPost;

  // Manufacturer lookup table cut specs (keyed on postHeightAboveDeck)
  const postOpt  = courierCutSpec(postHeightAboveDeck, thickness);
  const trackOpt = courierCutSpec(postHeightAboveDeck, thickness); // same tier as post
  const endOpt   = postOpt; // end post glass side = same as mid post

  // Fascia end post vinyl-only side:
  // trackOpening = postHeightAboveDeck + distToDeck (full channel above + below deck)
  // vinylLength = trackOpening - 0.25" (end cap)
  // If setting block is maxed (useWedgeInsteadOfBlock), termination side is still full trackOpening - 0.25"
  const fasciaTrackOpening = postHeightAboveDeck + distToDeck;
  const endPostVinylLength = fasciaTrackOpening - 0.25;
  const endPostVinylOpt = courierTerminationCutSpec(endPostVinylLength, thickness);
  const endPostVinylQty = q.endPosts;

  // Stock lengths needed per group
  const stockLengths_post  = totalPostPieces   > 0 ? Math.ceil(totalPostPieces   / postOpt.cutsPerLength)  : 0;
  const stockLengths_track = totalTrackPieces   > 0 ? Math.ceil(totalTrackPieces   / trackOpt.cutsPerLength) : 0;
  const stockLengths_endVinyl = endPostVinylQty > 0 ? Math.ceil(endPostVinylQty   / endPostVinylOpt.cutsPerLength) : 0;

  let gasketLengths: number;
  let gasketDescription: string;
  const maxCutLength = Math.max(glassInsertLength, glassInsertLengthTrack);
  const courierLength = isCourier ? postOpt.cutSize : postOpt.stockLength; // for return value compat

  if (!isCourier) {
    gasketLengths = Math.ceil(
      totalPostPieces   / postOpt.cutsPerLength +
      totalTrackPieces  / trackOpt.cutsPerLength
    );
    gasketDescription = stockLabel;
  } else {
    if (maxCutLength > postOpt.stockLength) {
      warnings.push('Vinyl insert lengths exceed stock length — courier shipping not possible at this configuration.');
    }
    gasketLengths = stockLengths_post + stockLengths_track;
    gasketDescription = stockLabel;
  }

  // Setting block footage
  const sbHeight_post = distToDeck - 0.5;
  const sbHeight_track = distToDeck - 0.5;
  const sbPieces_post = q.midPosts * 2 + q.endPosts + q.outsideCornerPosts * 2 + q.insideCornerPosts * 2;
  const sbPieces_track = q.wallTracks + q.endPostsLeft25 + q.endPostsRight25;

  const sbFootage_post = 12 / (sbHeight_post + 0.25) > 0 ? sbPieces_post / (12 / (sbHeight_post + 0.25)) : 0;
  const sbFootage_track = 12 / (sbHeight_track + 0.25) > 0 ? sbPieces_track / (12 / (sbHeight_track + 0.25)) : 0;
  const totalSBFootage = sbFootage_post + sbFootage_track;

  const sb15Pieces = sbHeight_post === 1.5 ? sbPieces_post : 0;

  const settingBlockLengths10ft = Math.floor(totalSBFootage / 10);
  const settingBlockLeftover = totalSBFootage - settingBlockLengths10ft * 10;

  let settingBlockLengthsOrdered: number;
  let settingBlockFt: number;
  if (isCourier) {
    settingBlockLengthsOrdered = 0;
    settingBlockFt = totalSBFootage;
  } else {
    settingBlockLengthsOrdered = settingBlockLeftover < 7 ? settingBlockLengths10ft : settingBlockLengths10ft + 1;
    settingBlockFt = settingBlockLeftover < 7 ? settingBlockLeftover : 0;
  }

  // Glass wedge
  const glassWedgeQty = 2 * q.midPosts + q.endPosts + 2 * q.outsideCornerPosts + 2 * q.insideCornerPosts + q.wallTracks + q.endPostsLeft25 + q.endPostsRight25;

  // Mid/inside plates and outside plates
  const midInsidePlatesQty = 2 * (q.midPosts + q.endPosts + q.insideCornerPosts);
  const outsidePlatesQty = 2 * q.outsideCornerPosts;

  // Tek screws for base plates
  const tekScrewBoxes = Math.ceil(((midInsidePlatesQty + outsidePlatesQty) * 2) / 100);

  // Fasteners
  const deckFasteners = (q.midPosts + q.endPosts + q.outsideCornerPosts + q.insideCornerPosts + q.endPostsLeft25 + q.endPostsRight25) * 4;
  const wallFastenersPerTrack = Math.round(wallTrackHeight / 13 + 1);
  const wallFasteners = q.wallTracks * wallFastenersPerTrack;

  // Validation
  if (distToDeck > 3.875) {
    warnings.push('Warning: Large bottom gap. Ensure no code violations.');
  }

  // ---- PRICING ----
  const postPriceEa = fasciaPostPrice(physicalPostLength) * (1 - discount);
  const wallTrackPriceEa = fasciaWallTrackPrice(actualRailHeight) * (1 - discount);
  const endPost25PriceEa = fasciaEndPostPrice(endPost25Height) * (1 - discount);

  const baseGasketPrice = thickness === 13 ? PRICES_2026.parts.glassInsert_13mm_10ft : PRICES_2026.parts.glassInsert_12mm_12ft;
  const gasketUnitPrice = baseGasketPrice * (isCourier ? courierMultiplier : 1) * (1 - discount);

  const sbLengthPrice = PRICES_2026.parts.settingBlock_10ft * (1 - discount);
  const sbFtPrice = (PRICES_2026.parts.settingBlock_10ft / 10) * (1 - discount);
  const sb15Price = PRICES_2026.parts.settingBlock_1_5in * (1 - discount);
  const wedgePrice = PRICES_2026.parts.glassWedge_12mm_3in * (1 - discount);
  const endCapPrice = PRICES_2026.parts.endCap * (1 - discount);
  const postCap25Price = PRICES_2026.fascia.postCap_25 * (1 - discount);

  // Base plate pricing based on offset
  const isStdOffset = fasciaOffset === 0.4375;
  const midInsidePlatePrice = (isStdOffset ? PRICES_2026.fascia.bplate_std_midInside : PRICES_2026.fascia.bplate_ext_midInside) * (1 - discount);
  const outsidePlatePrice = (isStdOffset ? PRICES_2026.fascia.bplate_std_outside : PRICES_2026.fascia.bplate_ext_outside) * (1 - discount);

  // Paint costs
  const postPaintEa = postPaintCost(postHeightAboveDeck);
  const trackPaintEa = trackPaintCost(wallTrackHeight);

  const lineItems: MaterialLineItem[] = [];

  const addLine = (desc: string, qty: number, unitCost: number, paintCostEa?: number, note?: string, partCode?: string) => {
    if (qty === 0) return;
    lineItems.push({
      description: desc,
      partCode,
      qty,
      unitCost,
      total: qty * unitCost,
      paintCost: paintCostEa ? qty * paintCostEa : undefined,
      note,
    });
  };

  // ── 1. ALUMINUM: Posts → Wall Tracks → End Caps → 2.5" Posts → Post Caps ──
  addLine('Infinity Mid Post', q.midPosts + q.endPosts, postPriceEa, postPaintEa);
  addLine('Infinity Outside Corner Post', q.outsideCornerPosts, postPriceEa, postPaintEa);
  addLine('Infinity Inside Corner Post', q.insideCornerPosts, postPriceEa, postPaintEa);
  addLine('Infinity Wall Tracks', q.wallTracks, wallTrackPriceEa, trackPaintEa);
  const offsetLabel = isStdOffset ? 'Standard 7/16"' : 'Extended 1.5"';
  addLine(`Infinity Mid/Inside Plates (${offsetLabel})`, midInsidePlatesQty, midInsidePlatePrice, undefined, undefined);
  addLine(`Infinity Outside Plates (${offsetLabel})`, outsidePlatesQty, outsidePlatePrice, undefined, undefined);
  addLine('End Caps', q.endPosts - addons.removeTrackFromPost, endCapPrice);
  addLine('2.5" End Left Posts', q.endPostsLeft25, endPost25PriceEa, postPaintEa);
  addLine('2.5" End Right Posts', q.endPostsRight25, endPost25PriceEa, postPaintEa);
  addLine('2.5" Post Caps', q.endPostsLeft25 + q.endPostsRight25, postCap25Price);
  // Aluminum add-ons
  if (addons.removeTrackFromPost > 0) {
    addLine('Remove Track From Post', addons.removeTrackFromPost, 75.2902047 * (1 - discount));
  }
  if (addons.cutDownTrack > 0) {
    addLine('Cut Down One Track', addons.cutDownTrack, 61.257983 * (1 - discount));
  }
  if (addons.addWeldedExtrudedSideMount > 0) {
    addLine('Add Welded Extruded Side Mount 1.9 Pipe', addons.addWeldedExtrudedSideMount, 49.5327347 * (1 - discount));
  }
  if (addons.includeBasePlateCovers) {
    const midQty = q.midPosts + q.endPosts;
    const outsideQty = q.outsideCornerPosts;
    const insideQty = q.insideCornerPosts;
    if (midQty > 0) addLine('Mid Base Plate Covers', midQty, PRICES_2026.parts.basePlateCover_mid * (1 - discount));
    if (outsideQty > 0) addLine('Outside Base Plate Covers', outsideQty, PRICES_2026.parts.basePlateCover_outside * (1 - discount));
    if (insideQty > 0) addLine('Inside Base Plate Covers', insideQty, PRICES_2026.parts.basePlateCover_inside * (1 - discount));
  }
  if (addons.includeShims) {
    const shimMidQty = (q.midPosts + q.endPosts + q.insideCornerPosts) * 2;
    const shimOutsideQty = q.outsideCornerPosts * 2;
    if (shimMidQty > 0) addLine('Fascia Base Plate Gasket 1/4" (MP/IC) RPLFINFSH25', shimMidQty, PRICES_2026.parts.fasciaShim_midInside * (1 - discount));
    if (shimOutsideQty > 0) addLine('Fascia Base Plate Gasket 1/4" (OC) RPLFINFOSH25', shimOutsideQty, PRICES_2026.parts.fasciaShim_outside * (1 - discount));
  }
  if (addons.glassShelfKits > 0) {
    addLine('Glass Shelf Kits', addons.glassShelfKits, PRICES_2026.parts.glassShelfKit * (1 - discount));
  }
  // ── 2. PLASTICS / VINYL ──
  if (isCourier) {
    if (gasketLengths > 0) {
      const postCutNote = `Cut to ${postOpt.cutSize}" — ${postOpt.cutsPerLength} piece${postOpt.cutsPerLength > 1 ? 's' : ''} per length`
        + (trackOpt.cutSize === postOpt.cutSize && totalTrackPieces > 0 ? ` (posts & tracks combined)` : '');
      addLine(gasketDescription, gasketLengths, gasketUnitPrice, undefined, postCutNote);
    }
    if (totalTrackPieces > 0 && trackOpt.cutSize !== postOpt.cutSize) {
      const trackCutNote = `Cut to ${trackOpt.cutSize}" — ${trackOpt.cutsPerLength} piece${trackOpt.cutsPerLength > 1 ? 's' : ''} per length (wall tracks)`;
      addLine(gasketDescription + ' (Wall Tracks)', stockLengths_track, gasketUnitPrice, undefined, trackCutNote);
    }
    // End post glass side uses same cut spec as mid post (mounting-style agnostic)
    // End post glass pieces are already counted in totalPostPieces → stockLengths_post
    // No separate line item needed for end post glass side
    if (stockLengths_endVinyl > 0) {
      const vinylCutNote = `Cut to ${endPostVinylOpt.cutSize}" — ${endPostVinylOpt.cutsPerLength} piece${endPostVinylOpt.cutsPerLength > 1 ? 's' : ''} per length`
        + (endPostVinylOpt.cutSize !== postOpt.cutSize ? ' (end post termination side — different length)' : '');
      addLine(gasketDescription + ' (End Post Termination Side)', stockLengths_endVinyl, gasketUnitPrice, undefined, vinylCutNote);
    }
  } else {
    addLine(gasketDescription, gasketLengths, gasketUnitPrice);
    const nonCourierEndVinylLengths = endPostVinylQty > 0 ? Math.ceil(endPostVinylQty / endPostVinylOpt.cutsPerLength) : 0;
    if (nonCourierEndVinylLengths > 0) {
      addLine(gasketDescription + ' (End Post Termination Side)', nonCourierEndVinylLengths, gasketUnitPrice);
    }
  }
  addLine('Setting Block (10 Ft Length)', settingBlockLengthsOrdered, sbLengthPrice);
  addLine('Setting Block (Per Ft)', settingBlockFt, sbFtPrice);
  addLine('Setting Block (1.5" Pieces)', sb15Pieces, sb15Price);
  addLine(thickness === 12 ? 'Glass Wedge 12mm (3 Inch Pieces)' : 'Glass Wedge 13mm (3 Inch Pieces)', glassWedgeQty, wedgePrice);
  // ── 3. SCREWS (net price) ──
  addLine('#10 × 3/4" S.S. Tek Screws (box/100)', tekScrewBoxes, PRICES_2026.fasteners.tekScrew_10x075);
  if (addons.deckFastenerOption === 'hexHead516x5') {
    const totalPosts = q.midPosts + q.endPosts + q.outsideCornerPosts + q.insideCornerPosts + q.endPostsLeft25 + q.endPostsRight25;
    const screwsNeeded = totalPosts * 4;
    const boxQty = Math.ceil(screwsNeeded / 50);
    addLine('5/16"×5" Hex Head Screws Painted PSC516X500HHS (box/50) — not in Infinity Engineering', boxQty, PRICES_2026.fasteners.hexHeadScrew_516x5);
    // ── 4. NYLON WASHERS (net price) ──
    if (addons.includeShoulderWashers) {
      addLine('5/16" Screw Nylon Insulator Box/100 RPLSCI516', 1, PRICES_2026.parts.shoulderWasherBox);
    }
  } else if (addons.includeShoulderWashers) {
    // shoulder washers without deck fasteners (standalone toggle)
    addLine('5/16" Screw Nylon Insulator Box/100 RPLSCI516', 1, PRICES_2026.parts.shoulderWasherBox);
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);

  return {
    railHeightActual: actualRailHeight,
    postHeightAboveDeck,
    physicalPostLength,
    settingBlockHeight,
    glassInsertLength,
    endPostInsertLength,
    wallTrackHeight,
    endPost25Height,
    glassInsertLengthTrack,
    maxCutLength,
    courierLength,
    settingBlockFt,
    settingBlockLengths: settingBlockLengthsOrdered,
    settingBlockLeftover,
    settingBlock15Pieces: sb15Pieces,
    useWedgeInsteadOfBlock,
    extraWedgeLength,
    gasketLengths,
    gasketDescription,
    glassWedgeQty,
    deckFasteners,
    wallFasteners,
    warnings,
    errors,
    lineItems,
    subtotal,
    jobCost: subtotal,
  };
}

// ============================================================
// UNIFIED ENTRY POINT
// ============================================================

export function calculate(config: ConfigInputs): CalculationResult {
  if (config.mountType === 'surface') {
    return calculateSurface(config);
  } else {
    return calculateFascia(config);
  }
}

// ============================================================
// DEFAULT CONFIG
// ============================================================

export function defaultConfig(): ConfigInputs {
  return {
    country: 'CA',
    mountType: 'surface',
    railHeight: 42,
    postConfig: 'tall',
    glassThickness: 13,
    topGlassReveal: DEFAULT_TOP_REVEAL,
    bottomGlassGap: DEFAULT_BOTTOM_GAP,
    discountLevel: 0,
    shipViaCourier: true,
    basePlateGaskets: false,
    customRevealUnlocked: false,
    fasciaOffset: 0.4375,
    distTopBasePlateToDeck: DEFAULT_DIST_TO_DECK,
    quantities: {
      midPosts: 0,
      endPosts: 0,
      outsideCornerPosts: 0,
      insideCornerPosts: 0,
      wallTracks: 0,
      endPostsLeft25: 0,
      endPostsRight25: 0,
    },
    addOns: {
      removeTrackFromPost: 0,
      cutDownTrack: 0,
      add5x5BasePlate: 0,
      basePlate5x5_midPost: 0,
      basePlate5x5_outsideCorner: 0,
      basePlate5x5_insideCorner: 0,
      basePlate5x5_endPost25: 0,
      addWeldedSurfaceBase: 0,
      addWeldedExtrudedSideMount: 0,
      glassShelfKits: 0,
      includeBasePlateCovers: false,
      includeShims: false,
      includeShoulderWashers: false,
      deckFastenerOption: 'none' as const,
      includeDeckNylonWashers: false,
    },
  };
}

export const COLOR_OPTIONS = [
  'BEIGE',
  'BLACK',
  'COASTAL GREY',
  'FLAT BLACK',
  'HARTFORD GREEN',
  'LIGHT IVORY',
  'OYSTER GREY',
  'PHANTOM BRONZE',
  'RIDEAU BROWN',
  'SANDALWOOD',
  'SILVER MATTE',
  'SPARROW GREY',
  'TEXTURED BLACK',
  'WHITE',
  'CUSTOM',
];
