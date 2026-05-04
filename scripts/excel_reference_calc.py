"""
Reference calculator for the Infinity Glass Railing system.

This is an independent port of the formulas in CUSTOM_Infinity_Calculator2021.xltx
(the locked Excel calculator Mike maintained before the web app existed).

It uses 2026 prices from Dealer_Price_List-2026.xltx (matching the React app's
PRICES_2026 constant) but applies the Excel's formulas verbatim. This lets us
diff the React app's outputs against an independent implementation of the same
formulas, isolating any logic divergence from price-list version differences.

Surface Mount only — Fascia is a follow-up if formulas warrant it.

Run:    python3 excel_reference_calc.py
Outputs JSON-ish dict for each scenario, suitable for use as test fixtures.
"""

import math


# ============================================================================
# PRICES — copied from PRICES_2026 in client/src/lib/calculator.ts
# Keep in sync with the React app, NOT with the 2021 Excel.
# ============================================================================

PRICES = {
    # Surface mount posts (interpolated by post-height-above-deck)
    'post_24in': 203.354317979155,       # 24" tall post
    'post_34in': 216.62870955621003,     # 34" tall post
    'post_40in': 231.04722107330502,     # 40" tall post

    # Surface mount wall tracks (interpolated by wall-track-height)
    'wallTrack_34in': 60.352326837110006,
    'wallTrack_40in': 63.53,

    # 2.5" end posts
    'endPost_37in': 145.420244651675,
    'endPost_43in': 165.76737767625002,
    'postCap_25': 14.678538776195,

    # Parts (per piece or per length, varies)
    'gasket_13mm_10ft': 20.5227121785,        # uncut, 10 ft length
    'gasket_12mm_12ft': 24.62458143677,       # uncut, 12 ft length
    'gasket_13mm_10ft_cut': 27.430946519,     # courier-cut equivalent — derived: list × 1.337 (matches React)
    'gasket_12mm_12ft_cut': 29.0816, # courier-cut equivalent — derived: list × 1.181 (matches React)
    'settingBlock_10ft': 61.94,
    'settingBlock_perFt': 9.797444,
    'settingBlock_15in': 2.62627531691,
    'glassWedge_12mm_3in': 3.33,
    'endCap': 16.576737767625,

    'basePlateGasket': 3.74,
    'basePlateCover_mid': 22.102317023500003,
    'basePlateCover_outside': 23.402453319000003,
    'basePlateCover_inside': 23.402453319000003,
    'glassShelfKit': 229.24003162255997,
}


DEFAULT_TOP_REVEAL = 2.125
DEFAULT_BOTTOM_GAP = 2.0
RAIL_HEIGHT_MAP = {36: 36.125, 42: 42.125}
MIN_POST_HEIGHT_ABOVE_DECK = 24.0


# ============================================================================
# PRICE INTERPOLATION (mirrors Excel I3/J3/L3 = MAX(I3,J3))
# ============================================================================

def surface_post_price(post_height_above_deck: float) -> float:
    """
    Excel: H3 = D38 - D39 (postHeight = railHeight - topReveal)
    Then: I3 = (H3-34)*B12 + B4   where B12 = (B5-B4)/6
          J3 = (H3-34)*B9  + B4   where B9  = (B4-B3)/10
          L3 = MAX(I3, J3)

    Translated to 2026 prices:
        I3 slope = (post_40 - post_34) / 6   ($/in for heights 34"-40")
        J3 slope = (post_34 - post_24) / 10  ($/in for heights 24"-34")
    """
    p24 = PRICES['post_24in']
    p34 = PRICES['post_34in']
    p40 = PRICES['post_40in']
    h = post_height_above_deck

    slope_high = (p40 - p34) / 6.0   # B11/6
    slope_low  = (p34 - p24) / 10.0  # B8/10

    calc_a = (h - 34) * slope_high + p34
    calc_b = (h - 34) * slope_low  + p34

    return max(calc_a, calc_b)


def surface_wall_track_price(rail_height: float) -> float:
    """
    Excel: H5 = D38 - 2 (track height = rail height - 2")
    Then: I5 = (H5-34)*E12 + E4 where E12 = (E5-E4)/6
          J5 = (H5-40)*(F9+E12) + E5 where F9 = paint per inch markup
          L5 = MAX(I5, J5)
    Translated: use 2026 anchors at 34" and 40" wall track heights.
    """
    wt34 = PRICES['wallTrack_34in']
    wt40 = PRICES['wallTrack_40in']
    track_h = rail_height - 2

    slope = (wt40 - wt34) / 6.0
    calc_a = (track_h - 34) * slope + wt34

    return calc_a


def end_post_25_price(rail_height: float) -> float:
    """2.5" end post price by rail height. 36" rail → endPost_37in; 42" rail → endPost_43in."""
    if abs(rail_height - 36.125) < 0.01:
        return PRICES['endPost_37in']
    return PRICES['endPost_43in']


# ============================================================================
# COURIER CUT TIERS (mirrors Excel G26, G27, F26)
# ============================================================================

def courier_cut_size(post_glass_panel_length: float, glass_thickness: int) -> int:
    """
    Excel:
      F26 = MAX(F15:F19)  -- biggest insert length needed
      G26 (12mm stock):  IF(courier, IF(F26>48, 72, 48), 144)
      G27 (13mm stock):  IF(courier, IF(F26>60, 72, IF(F26>40, 60, 40)), 120)

    For our purposes (courier always on, since uncut handled separately):
      13mm: 40", 60", or 72" cuts depending on biggest insert needed
      12mm: 48" or 72" cuts
    """
    if glass_thickness == 13:
        if post_glass_panel_length > 60:
            return 72
        if post_glass_panel_length > 40:
            return 60
        return 40
    else:  # 12mm (or fallback)
        if post_glass_panel_length > 48:
            return 72
        return 48


# ============================================================================
# MAIN: SURFACE MOUNT BOM
# ============================================================================

def calculate_surface(config: dict) -> dict:
    """
    Port of the Surface Mount sheet's calculations.

    config keys:
      country, mountType, railHeight (36 or 42), topGlassReveal, bottomGlassGap,
      glassThickness (12 or 13), discountLevel,
      shipViaCourier (bool), basePlateGaskets (bool),
      quantities: {midPosts, endPosts, outsideCornerPosts, insideCornerPosts,
                   wallTracks, endPostsLeft25, endPostsRight25}
      addOns: {removeTrackFromPost, add5x5BasePlate, addWeldedSurfaceBase,
               addWeldedExtrudedSideMount, ...}
    """
    rh = RAIL_HEIGHT_MAP[config['railHeight']]
    top_reveal = config['topGlassReveal']
    bottom_gap = config['bottomGlassGap']
    glass_t = config['glassThickness']
    discount = config['discountLevel']
    courier = config['shipViaCourier']
    bpg = config['basePlateGaskets']
    q = config['quantities']
    addons = config.get('addOns', {})

    # Apply same flooring as React: postHeightAboveDeck never goes below 24"
    post_height = max(MIN_POST_HEIGHT_ABOVE_DECK, rh - top_reveal)

    # --- Computed dimensions (Excel column F) ---
    # F15: Post Glass Panel = railHeight - topReveal - bottomGap - 3
    glass_insert_post = post_height - bottom_gap - 3
    # F16: End Post Insert = postHeight - 0.75
    glass_insert_end_post = post_height - 0.75
    # F18/F19: Wall Track Panel = (rail height - 2) - bottomGap - 3
    # Wall track always uses DEFAULT_TOP_REVEAL (per React comment)
    wall_track_height = rh - DEFAULT_TOP_REVEAL
    glass_insert_track = wall_track_height - bottom_gap - 3

    # F20: Setting Block Infinity = bottomGap - 0.5
    sb_05 = bottom_gap - 0.5
    # F21: Setting Block 1/4" Base = bottomGap - 0.25
    sb_025 = bottom_gap - 0.25

    # --- Quantity rollups (Excel column G) ---
    # G15: Post insert qty = mid*2 + end + oc*2 + ic*2
    # The number of insert pieces per post type comes from physical sides receiving glass.
    qty_post_inserts = q['midPosts'] * 2 + q['endPosts'] + q['outsideCornerPosts'] * 2 + q['insideCornerPosts'] * 2
    # G16: End post insert qty = endPosts - removeTrackFromPost
    qty_end_post_inserts = q['endPosts'] - addons.get('removeTrackFromPost', 0)
    # G19: Wall track insert qty = walltracks + endPostsLeft25 + endPostsRight25
    qty_track_inserts = q['wallTracks'] + q['endPostsLeft25'] + q['endPostsRight25']

    # --- Vinyl/gasket counts (Excel K15-K19, L15-L19) ---
    cut_size = courier_cut_size(glass_insert_post, glass_t) if courier else (120 if glass_t == 13 else 144)
    biggest_insert = max(glass_insert_post, glass_insert_end_post, glass_insert_track)

    # H15/I15: cuts per length = ROUNDDOWN(stock / (insert + 0.125), 0)
    # K15: lengths needed = qty / cuts_per_length
    cuts_post   = math.floor(cut_size / (glass_insert_post + 0.125))
    cuts_end    = math.floor(cut_size / (glass_insert_end_post + 0.125))
    cuts_track  = math.floor(cut_size / (glass_insert_track + 0.125))

    lengths_post  = qty_post_inserts / cuts_post if cuts_post else 0
    lengths_end   = qty_end_post_inserts / cuts_end if cuts_end else 0
    lengths_track = qty_track_inserts / cuts_track if cuts_track else 0

    # K19/L19: total lengths needed = ROUNDUP(sum, 0) -- BUT in courier mode it's
    # ROUNDUP(sum / floor(stock_full_length/cut_size), 0)
    full_stock = 120 if glass_t == 13 else 144
    if courier:
        cuts_per_full = math.floor(full_stock / cut_size)
        total_lengths = math.ceil((lengths_post + lengths_end + lengths_track) / cuts_per_full)
    else:
        total_lengths = math.ceil(lengths_post + lengths_end + lengths_track)

    # --- Setting block counts (G20, G21, M20, M21, M22) ---
    # G20: setting block infinity qty = mid*2 + end + oc*2 + ic*2 + walltracks + add5x5_endPost25
    five_x_five_end_post_25 = addons.get('basePlate5x5_endPost25', 0)
    g20 = q['midPosts']*2 + q['endPosts'] + q['outsideCornerPosts']*2 + q['insideCornerPosts']*2 + q['wallTracks'] + five_x_five_end_post_25
    # G21: 1/4" setting block qty = ep25_left + ep25_right - five_x_five_end_post_25
    g21 = q['endPostsLeft25'] + q['endPostsRight25'] - five_x_five_end_post_25
    # G22: total wedge = G20 + G21
    g22 = g20 + g21

    # K20: total feet of setting block (only counted when sb_05 != 1.5")
    if abs(sb_05 - 1.5) < 0.001:
        sb_feet_05 = 0
    else:
        sb_feet_05 = (g20 * (sb_05 + 0.125)) / 12
    if abs(sb_025 - 1.5) < 0.001:
        sb_feet_025 = 0
    else:
        sb_feet_025 = (g21 * (sb_025 + 0.125)) / 12

    total_sb_feet = math.ceil(sb_feet_05 + sb_feet_025)
    # M21: full 10ft setting blocks = floor(M20/10), but only when not courier
    if courier:
        sb_10ft_blocks = 0
    else:
        sb_10ft_blocks = math.floor(total_sb_feet / 10)
    sb_remaining_ft = total_sb_feet - sb_10ft_blocks * 10

    # F50/F51: SB 10ft qty and SB per-ft qty (depends on courier)
    if courier:
        sb_10ft_qty = 0
        sb_perft_qty = total_sb_feet
    else:
        sb_10ft_qty = sb_10ft_blocks if sb_remaining_ft < 7 else sb_10ft_blocks + 1
        sb_perft_qty = sb_remaining_ft if sb_remaining_ft < 7 else 0
    # F52: SB 1.5" pieces = F24 + G24 (only counted when sb dim == 1.5")
    sb_15_qty = (g20 if abs(sb_05 - 1.5) < 0.001 else 0) + (g21 if abs(sb_025 - 1.5) < 0.001 else 0)

    # --- Pricing ---
    post_unit = surface_post_price(post_height) * (1 - discount)
    track_unit = surface_wall_track_price(rh) * (1 - discount)
    end_post_25_unit = end_post_25_price(rh) * (1 - discount)

    # Gasket unit: courier vs uncut, 12mm vs 13mm
    if courier:
        gasket_unit = (PRICES['gasket_13mm_10ft_cut'] if glass_t == 13 else PRICES['gasket_12mm_12ft_cut']) * (1 - discount)
    else:
        gasket_unit = (PRICES['gasket_13mm_10ft'] if glass_t == 13 else PRICES['gasket_12mm_12ft']) * (1 - discount)

    end_cap_unit = PRICES['endCap'] * (1 - discount)
    post_cap_25_unit = PRICES['postCap_25'] * (1 - discount)
    sb_10ft_unit = PRICES['settingBlock_10ft'] * (1 - discount)
    sb_perft_unit = PRICES['settingBlock_perFt'] * (1 - discount)
    sb_15_unit = PRICES['settingBlock_15in'] * (1 - discount)
    wedge_unit = PRICES['glassWedge_12mm_3in'] * (1 - discount)

    # F54: 4x4 base plate gaskets qty = (sum posts) - 5x5 - welded surface base
    bpg_qty = 0
    if bpg:
        total_posts = (q['midPosts'] + q['endPosts'] + q['outsideCornerPosts']
                       + q['insideCornerPosts'] + q['endPostsLeft25'] + q['endPostsRight25'])
        bpg_qty = total_posts - addons.get('add5x5BasePlate', 0) - addons.get('addWeldedSurfaceBase', 0)
        bpg_qty = max(0, bpg_qty)

    # --- Build BOM ---
    line_items = []
    def add(desc, qty, unit_cost):
        if qty == 0:
            return
        line_items.append({
            'description': desc,
            'qty': qty,
            'unitCost': round(unit_cost, 4),
            'total': round(qty * unit_cost, 4),
        })

    # Gasket
    cut_label = ''
    if courier:
        if glass_t == 13:
            cut_label = f' Cut to {cut_size}"'
        else:
            cut_label = f' Cut to {cut_size}"'
    gasket_desc = f'Gasket {glass_t}mm {"10" if glass_t == 13 else "12"} Ft Lengths{cut_label}'
    add(gasket_desc, total_lengths, gasket_unit)

    # Setting blocks
    add('Setting Block (10 Ft Length)', sb_10ft_qty, sb_10ft_unit)
    add('Setting Block (Per Ft)', sb_perft_qty, sb_perft_unit)
    add('Setting Block (1.5" Pieces)', sb_15_qty, sb_15_unit)

    # Wedges
    add('Glass Wedge 12mm (3 Inch Piece)', g22, wedge_unit)

    # Posts (Excel F55: Mid Post = endPosts + midPosts, single combined line)
    add('Infinity Mid Post', q['midPosts'] + q['endPosts'], post_unit)
    add('Infinity Outside Corner Post', q['outsideCornerPosts'], post_unit)
    add('Infinity Inside Corner Post', q['insideCornerPosts'], post_unit)
    add('Infinity Wall Tracks', q['wallTracks'], track_unit)

    # End caps
    end_cap_qty = q['endPosts'] - addons.get('removeTrackFromPost', 0)
    add('End Caps', end_cap_qty, end_cap_unit)

    # 2.5" End Posts
    add('2.5" End Left Posts', q['endPostsLeft25'], end_post_25_unit)
    add('2.5" End Right Posts', q['endPostsRight25'], end_post_25_unit)
    add('2.5" Post Caps', q['endPostsLeft25'] + q['endPostsRight25'], post_cap_25_unit)

    # Base plate gaskets (optional)
    if bpg:
        add('Base Plate Gasket - Neoprene 1/8x4x4 (RPLBPG)', bpg_qty, PRICES['basePlateGasket'] * (1 - discount))

    subtotal = sum(li['total'] for li in line_items)

    return {
        'dimensions': {
            'postHeightAboveDeck': round(post_height, 4),
            'wallTrackHeight': round(wall_track_height, 4),
            'glassInsertLengthPost': round(glass_insert_post, 4),
            'glassInsertLengthEndPost': round(glass_insert_end_post, 4),
            'glassInsertLengthTrack': round(glass_insert_track, 4),
            'settingBlockHeight05': round(sb_05, 4),
            'settingBlockHeight025': round(sb_025, 4),
            'cutSize': cut_size,
        },
        'quantities': {
            'gasketLengths': total_lengths,
            'settingBlock10ft': sb_10ft_qty,
            'settingBlockPerFt': sb_perft_qty,
            'settingBlock15in': sb_15_qty,
            'glassWedge': g22,
            'endCaps': end_cap_qty,
            'basePlateGasket': bpg_qty,
        },
        'lineItems': line_items,
        'subtotal': round(subtotal, 2),
    }


# ============================================================================
# TEST SCENARIOS — pick representative configs covering the matrix
# ============================================================================

DEFAULT_QUANTITIES = {
    'midPosts': 0, 'endPosts': 0, 'outsideCornerPosts': 0, 'insideCornerPosts': 0,
    'wallTracks': 0, 'endPostsLeft25': 0, 'endPostsRight25': 0,
}

SCENARIOS = [
    {
        'name': 'US surface, 42" rail, 12mm glass, 5 mid + 2 end posts, no discount, courier',
        'config': {
            'country': 'US', 'mountType': 'surface', 'railHeight': 42,
            'topGlassReveal': 2.125, 'bottomGlassGap': 2.0, 'glassThickness': 12,
            'discountLevel': 0, 'shipViaCourier': True, 'basePlateGaskets': False,
            'quantities': {**DEFAULT_QUANTITIES, 'midPosts': 5, 'endPosts': 2},
            'addOns': {},
        },
    },
    {
        'name': 'US surface, 36" rail, 13mm glass, 3 mid + 1 end + 1 OC, 43.5% discount',
        'config': {
            'country': 'US', 'mountType': 'surface', 'railHeight': 36,
            'topGlassReveal': 2.125, 'bottomGlassGap': 2.0, 'glassThickness': 13,
            'discountLevel': 0.435, 'shipViaCourier': True, 'basePlateGaskets': True,
            'quantities': {**DEFAULT_QUANTITIES, 'midPosts': 3, 'endPosts': 1, 'outsideCornerPosts': 1},
            'addOns': {},
        },
    },
    {
        'name': 'CA surface, 42" rail, tall post, 13mm glass, 8 mid + 2 end + 2 wall tracks',
        'config': {
            'country': 'CA', 'mountType': 'surface', 'railHeight': 42,
            'topGlassReveal': 2.125, 'bottomGlassGap': 2.0, 'glassThickness': 13,
            'discountLevel': 0.435, 'shipViaCourier': True, 'basePlateGaskets': False,
            'quantities': {**DEFAULT_QUANTITIES, 'midPosts': 8, 'endPosts': 2, 'wallTracks': 2},
            'addOns': {},
        },
    },
    {
        'name': 'CA surface, 42" rail, SHORT POST, 12mm glass, 4 mid + 1 end',
        'config': {
            'country': 'CA', 'mountType': 'surface', 'railHeight': 42,
            'topGlassReveal': 18.125,  # short post
            'bottomGlassGap': 2.0, 'glassThickness': 12,
            'discountLevel': 0.435, 'shipViaCourier': True, 'basePlateGaskets': False,
            'quantities': {**DEFAULT_QUANTITIES, 'midPosts': 4, 'endPosts': 1},
            'addOns': {},
        },
    },
    {
        'name': 'US surface, 42" rail, custom 0.5" reveal (clamped to 2"), 6 mid + 2 OC',
        'config': {
            'country': 'US', 'mountType': 'surface', 'railHeight': 42,
            'topGlassReveal': 2.0,  # US cap
            'bottomGlassGap': 2.0, 'glassThickness': 12,
            'discountLevel': 0.435, 'shipViaCourier': True, 'basePlateGaskets': False,
            'quantities': {**DEFAULT_QUANTITIES, 'midPosts': 6, 'outsideCornerPosts': 2},
            'addOns': {},
        },
    },
]


if __name__ == '__main__':
    import json
    for s in SCENARIOS:
        print(f"\n{'='*70}\n{s['name']}\n{'='*70}")
        result = calculate_surface(s['config'])
        print(json.dumps(result, indent=2))
