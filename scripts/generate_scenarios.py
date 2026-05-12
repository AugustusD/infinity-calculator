"""Generates a wide matrix of Surface Mount test scenarios."""
import json
import itertools

DEFAULT_QUANTITIES = {
    "midPosts": 0, "endPosts": 0, "outsideCornerPosts": 0, "insideCornerPosts": 0,
    "wallTracks": 0, "endPostsLeft25": 0, "endPostsRight25": 0,
}

def base(**overrides):
    cfg = {
        "country": "CA", "mountType": "surface", "railHeight": 42,
        "topGlassReveal": 2.125, "bottomGlassGap": 2.0, "glassThickness": 13,
        "discountLevel": 0.435, "shipViaCourier": True, "basePlateGaskets": False,
        "quantities": dict(DEFAULT_QUANTITIES),
        "addOns": {},
    }
    cfg.update(overrides)
    return cfg

def with_q(cfg, **q):
    cfg["quantities"] = {**cfg["quantities"], **q}
    return cfg

def with_a(cfg, **a):
    cfg["addOns"] = {**cfg.get("addOns", {}), **a}
    return cfg

scenarios = []
sid = 0

def add(name, cfg):
    global sid
    scenarios.append({"id": f"s{sid:03d}", "name": name, "config": cfg})
    sid += 1

# ===========================================================================
# MATRIX 1: Basic posts × Country × Rail × Glass × Discount
# ===========================================================================
post_mixes = [
    ("3mid", {"midPosts": 3}),
    ("5mid+2end", {"midPosts": 5, "endPosts": 2}),
    ("10mid+4end+2OC+1IC", {"midPosts": 10, "endPosts": 4, "outsideCornerPosts": 2, "insideCornerPosts": 1}),
    ("1mid", {"midPosts": 1}),
    ("4walls", {"wallTracks": 4}),
    ("3mid+2WT", {"midPosts": 3, "wallTracks": 2}),
    ("ep25-2L+2R", {"endPostsLeft25": 2, "endPostsRight25": 2}),
]
countries = ["CA", "US"]
rails = [36, 42]
glasses = [12, 13]
discounts = [0, 0.25, 0.435, 0.50]

for (qname, q), c, r, g, d in itertools.product(post_mixes, countries, rails, glasses, discounts):
    name = f"M1: {c}/{r}\"/{g}mm / {qname} / d={int(d*100)}%"
    cfg = with_q(base(country=c, railHeight=r, glassThickness=g, discountLevel=d), **q)
    add(name, cfg)

# ===========================================================================
# MATRIX 2: Bottom gap sweep (forces different setting block paths)
# ===========================================================================
gaps = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0]
for g in gaps:
    add(f"M2: CA 42\" 13mm gap={g}\" / 5mid+2end / 43.5%",
        with_q(base(bottomGlassGap=g), midPosts=5, endPosts=2))

# ===========================================================================
# MATRIX 3: Reveal sweep (Canada only — US is capped)
# ===========================================================================
ca_reveals = [0, 0.5, 1.0, 2.125, 3.0, 5.0, 8.0, 12.0, 18.125]  # 18.125 = short post at 42"
for rv in ca_reveals:
    add(f"M3: CA 42\" 13mm reveal={rv}\" / 4mid",
        with_q(base(topGlassReveal=rv), midPosts=4))

# Short post in 36" rail (reveal = 36.125 - 24 = 12.125)
add("M3a: CA 36\" 12mm SHORT POST / 4mid", with_q(base(railHeight=36, glassThickness=12, topGlassReveal=12.125), midPosts=4))

# US reveal at cap (2.0)
add("M3b: US 42\" 13mm reveal=2.0 (cap) / 5mid", with_q(base(country="US", topGlassReveal=2.0), midPosts=5))

# ===========================================================================
# MATRIX 4: Courier ON vs OFF (changes how setting block / gasket bills)
# ===========================================================================
for courier in [True, False]:
    for gap in [2.0, 4.0]:
        add(f"M4: CA 42\" 13mm gap={gap} courier={courier} / 5mid+2end+1OC",
            with_q(base(shipViaCourier=courier, bottomGlassGap=gap),
                   midPosts=5, endPosts=2, outsideCornerPosts=1))

# ===========================================================================
# MATRIX 5: Base Plate Gaskets ON/OFF
# ===========================================================================
for bpg in [True, False]:
    add(f"M5: CA 42\" 13mm bpg={bpg} / 5mid+2end+2OC",
        with_q(base(basePlateGaskets=bpg), midPosts=5, endPosts=2, outsideCornerPosts=2))

# ===========================================================================
# MATRIX 6: Add-ons — Remove Track, Cut Down Track
# ===========================================================================
add("M6a: 4mid+4end + remove 2 tracks", with_a(with_q(base(), midPosts=4, endPosts=4), removeTrackFromPost=2))
add("M6b: 4mid+4end + cut down 3 tracks", with_a(with_q(base(), midPosts=4, endPosts=4), cutDownTrack=3))
add("M6c: 4mid+4end + remove 2 + cut down 2", with_a(with_q(base(), midPosts=4, endPosts=4), removeTrackFromPost=2, cutDownTrack=2))

# ===========================================================================
# MATRIX 7: 5x5 base plates
# ===========================================================================
add("M7a: 5mid+2end + add5x5=3", with_a(with_q(base(), midPosts=5, endPosts=2), add5x5BasePlate=3))
add("M7b: 5mid+2end + add5x5=2 + assign all to mid",
    with_a(with_q(base(), midPosts=5, endPosts=2),
           add5x5BasePlate=2, basePlate5x5_midPost=2))
add("M7c: 10mid+2end+2OC+1IC + add5x5=8 + assigned mix",
    with_a(with_q(base(), midPosts=10, endPosts=2, outsideCornerPosts=2, insideCornerPosts=1),
           add5x5BasePlate=8, basePlate5x5_midPost=4, basePlate5x5_outsideCorner=2, basePlate5x5_insideCorner=1))

# ===========================================================================
# MATRIX 8: Welded variants
# ===========================================================================
add("M8a: 5mid+2end + welded surface base=2", with_a(with_q(base(), midPosts=5, endPosts=2), addWeldedSurfaceBase=2))
add("M8b: 5mid+2end + welded extruded SM=2", with_a(with_q(base(), midPosts=5, endPosts=2), addWeldedExtrudedSideMount=2))

# ===========================================================================
# MATRIX 9: Glass shelf kits
# ===========================================================================
add("M9: 5mid + 3 glass shelf kits", with_a(with_q(base(), midPosts=5), glassShelfKits=3))

# ===========================================================================
# MATRIX 10: Big realistic jobs
# ===========================================================================
add("M10a: BIG JOB — 30 mid + 6 end + 4 OC + 2 IC + 4 wall tracks",
    with_q(base(), midPosts=30, endPosts=6, outsideCornerPosts=4, insideCornerPosts=2, wallTracks=4))
add("M10b: BIG JOB w/ accessories — 25mid + 5end + 3OC + add5x5=5 + bpg=Yes",
    with_a(with_q(base(basePlateGaskets=True), midPosts=25, endPosts=5, outsideCornerPosts=3),
           add5x5BasePlate=5, basePlate5x5_midPost=5))
add("M10c: MIXED JOB — all post types + add-ons",
    with_a(with_q(base(basePlateGaskets=True),
                  midPosts=8, endPosts=2, outsideCornerPosts=2, insideCornerPosts=2,
                  wallTracks=2, endPostsLeft25=1, endPostsRight25=1),
           add5x5BasePlate=3, basePlate5x5_midPost=2, basePlate5x5_outsideCorner=1,
           addWeldedSurfaceBase=1, removeTrackFromPost=1, glassShelfKits=2))


# ===========================================================================
# FASCIA MOUNT SCENARIOS
# ===========================================================================
def fascia_base(**overrides):
    cfg = {
        "country": "CA", "mountType": "fascia", "railHeight": 42,
        "topGlassReveal": 2.125, "bottomGlassGap": 2.0, "glassThickness": 13,
        "discountLevel": 0.435, "shipViaCourier": True, "basePlateGaskets": False,
        "fasciaOffset": 0.4375, "distTopBasePlateToDeck": 3,
        "quantities": dict(DEFAULT_QUANTITIES),
        "addOns": {},
    }
    cfg.update(overrides)
    return cfg

# Fascia post mixes + country + rail + glass + discount
fascia_post_mixes = [
    ("3mid", {"midPosts": 3}),
    ("5mid+2end", {"midPosts": 5, "endPosts": 2}),
    ("3mid+1end+1OC", {"midPosts": 3, "endPosts": 1, "outsideCornerPosts": 1}),  # USER'S CONFIG
    ("10mid+4end+2OC+1IC", {"midPosts": 10, "endPosts": 4, "outsideCornerPosts": 2, "insideCornerPosts": 1}),
    ("ep25-2L+2R", {"endPostsLeft25": 2, "endPostsRight25": 2}),
]
for (qname, q), c, r, g, d in itertools.product(fascia_post_mixes, ["CA", "US"], [36, 42], [12, 13], [0, 0.435]):
    name = f"F1: {c}/{r}\"/{g}mm / fascia / {qname} / d={int(d*100)}%"
    cfg = with_q(fascia_base(country=c, railHeight=r, glassThickness=g, discountLevel=d), **q)
    add(name, cfg)

# Fascia offset sweep
for offset in [0.4375, 1.5]:
    add(f"F2: fascia offset={offset}\" / CA 42 13mm / 5mid+2end+1OC",
        with_q(fascia_base(fasciaOffset=offset), midPosts=5, endPosts=2, outsideCornerPosts=1))

# Distance-to-deck sweep
for d2d in [1, 2, 3, 4, 5, 6]:
    add(f"F3: distToDeck={d2d}\" / CA 42 13mm fascia / 5mid+2end",
        with_q(fascia_base(distTopBasePlateToDeck=d2d), midPosts=5, endPosts=2))

# Bottom gap sweep (fascia — same as surface)
for g in [1.0, 1.5, 2.0, 2.5, 3.0, 4.0]:
    add(f"F4: fascia gap={g}\" / CA 42 13mm / 5mid+2end",
        with_q(fascia_base(bottomGlassGap=g), midPosts=5, endPosts=2))

# Courier on/off
for courier in [True, False]:
    add(f"F5: fascia courier={courier} / CA 42 13mm / 5mid+2end+1OC",
        with_q(fascia_base(shipViaCourier=courier), midPosts=5, endPosts=2, outsideCornerPosts=1))

# Big fascia jobs
add("F6a: BIG fascia — 20 mid + 4 end + 2 OC + 1 IC",
    with_q(fascia_base(), midPosts=20, endPosts=4, outsideCornerPosts=2, insideCornerPosts=1))
add("F6b: All post types fascia",
    with_q(fascia_base(), midPosts=5, endPosts=2, outsideCornerPosts=2, insideCornerPosts=2,
           wallTracks=2, endPostsLeft25=1, endPostsRight25=1))

# Fascia with add-ons
add("F7a: fascia + remove track 2 + cut down 1",
    with_a(with_q(fascia_base(), midPosts=4, endPosts=4), removeTrackFromPost=2, cutDownTrack=1))
add("F7b: fascia + welded extruded SM=2",
    with_a(with_q(fascia_base(), midPosts=5, endPosts=2), addWeldedExtrudedSideMount=2))
add("F7c: fascia + glass shelf kits=2",
    with_a(with_q(fascia_base(), midPosts=5), glassShelfKits=2))

# Custom large bottom gap on fascia (triggers wedge warning if > 5.125")
add("F8a: fascia big bottom gap=3 + distToDeck=3 (sb=6\") — wedge territory",
    with_q(fascia_base(bottomGlassGap=3, distTopBasePlateToDeck=3), midPosts=3))

print(f"Generated {len(scenarios)} scenarios")
with open("/Users/sunny/Desktop/Claude/infinity-calculator/scripts/scenarios.json", "w") as f:
    json.dump(scenarios, f, indent=2)
print(f"Wrote scripts/scenarios.json")
