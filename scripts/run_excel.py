"""
Runs scenarios through the real 2021 Excel calculator (via the formulas library)
and dumps the BOMs as JSON.

Usage:  python3 run_excel.py <scenarios.json> <out.json>

Each scenario in scenarios.json has shape:
{
    "id": "...",
    "name": "...",
    "config": { ... ConfigInputs-like ... }
}

Output:
{
    "results": [
        {"id": "...", "name": "...", "excel": { lineItems: [...], subtotal: N, dimensions: {...} } },
        ...
    ]
}
"""
import json
import sys
import os
import formulas
import warnings
warnings.filterwarnings("ignore")

XLSX = "/Users/sunny/Desktop/Claude/infinity-calculator/docs/handoff/source-data/CUSTOM_Infinity_Calculator2021_UNLOCKED.xlsx"

def cell(sheet, ref):
    return f"'[CUSTOM_Infinity_Calculator2021_UNLOCKED.xlsx]{sheet.upper()}'!{ref}"

def to_python(v):
    """Coerce a formulas-lib Ranges value to a Python scalar."""
    if v is None:
        return None
    try:
        x = v.value[0, 0]
    except Exception:
        return v
    try:
        if hasattr(x, "item"):
            x = x.item()
        # Handle numpy strings
        if isinstance(x, bytes):
            x = x.decode()
        return x
    except Exception:
        return x

def yes_no(b):
    return "Yes" if b else "No"

# Excel BOM rows for Surface Mount: rows 49-62 (E=desc, F=qty, H=unit, I=total)
SURFACE_BOM_ROWS = list(range(49, 63))
# Excel BOM rows for Fascia Mount: rows 71-86 (E=desc, F=qty, G=unit, H=total)
FASCIA_BOM_ROWS = list(range(71, 87))

def run_surface(xl_model, config):
    q = config["quantities"]
    a = config.get("addOns", {})
    inputs = {
        cell("Surface Mount", "D38"): config["railHeight"],
        cell("Surface Mount", "D39"): config["topGlassReveal"],
        cell("Surface Mount", "D40"): config["bottomGlassGap"],
        cell("Surface Mount", "D41"): config["glassThickness"],
        cell("Surface Mount", "D43"): q.get("midPosts", 0),
        cell("Surface Mount", "D44"): q.get("endPosts", 0),
        cell("Surface Mount", "D45"): q.get("outsideCornerPosts", 0),
        cell("Surface Mount", "D46"): q.get("insideCornerPosts", 0),
        cell("Surface Mount", "D47"): q.get("wallTracks", 0),
        cell("Surface Mount", "D48"): q.get("endPostsLeft25", 0),
        cell("Surface Mount", "D49"): q.get("endPostsRight25", 0),
        cell("Surface Mount", "D50"): yes_no(config.get("basePlateGaskets", False)),
        cell("Surface Mount", "D51"): config["discountLevel"],
        cell("Surface Mount", "D52"): yes_no(config["shipViaCourier"]),
        cell("Surface Mount", "B55"): a.get("removeTrackFromPost", 0),
        cell("Surface Mount", "B56"): a.get("cutDownTrack", 0),
        cell("Surface Mount", "B58"): a.get("add5x5BasePlate", 0),  # surface mount 5x5
        cell("Surface Mount", "B60"): a.get("basePlate5x5_endPost25", 0),
        cell("Surface Mount", "B61"): a.get("addWeldedSurfaceBase", 0),
        cell("Surface Mount", "B63"): a.get("addWeldedExtrudedSideMount", 0),
        cell("Surface Mount", "B65"): 0,  # drink holders (not used)
        cell("Surface Mount", "B66"): a.get("glassShelfKits", 0),
    }

    sol = xl_model.calculate(inputs=inputs)

    def read(ref):
        return to_python(sol.get(cell("Surface Mount", ref)))

    line_items = []
    for row in SURFACE_BOM_ROWS:
        desc = read(f"E{row}")
        qty = read(f"F{row}")
        unit = read(f"H{row}")
        total = read(f"I{row}")
        if qty is None or unit is None or total is None:
            continue
        try:
            if isinstance(qty, (int, float)) and qty == 0:
                continue
        except Exception:
            pass
        line_items.append({
            "description": str(desc) if desc else f"(row {row})",
            "qty": qty,
            "unitCost": unit,
            "total": total,
        })

    # Also include add-on cost lines (D-column) for rows where B-column qty > 0
    # Add-on rows in surface: 55, 56, 58, 60, 61, 63, 65, 66
    for ar in [55, 56, 58, 60, 61, 63, 65, 66]:
        a_qty = read(f"B{ar}")
        a_unit = read(f"C{ar}")
        a_total = read(f"D{ar}")
        a_desc = read(f"A{ar}")
        if a_qty is None or not isinstance(a_qty, (int, float)) or a_qty == 0:
            continue
        line_items.append({
            "description": (str(a_desc) if a_desc else f"(add-on row {ar})") + " (Add-On)",
            "qty": a_qty,
            "unitCost": a_unit,
            "total": a_total,
        })

    subtotal = read("F63")
    dimensions = {
        "postHeightAboveDeck": read("F39"),
        "glassInsertLengthPost": read("F40"),
        "endPostInsertLength": read("F41"),
        "wallTrackHeight": read("F44"),
        "settingBlockHeight05": read("F42"),
        "settingBlockHeight025": read("F43"),
        "glassInsertLengthTrack": read("F46"),
    }
    return {
        "lineItems": line_items,
        "subtotal": subtotal,
        "dimensions": dimensions,
    }

def run_fascia(xl_model, config):
    """Run a Fascia Mount scenario through the 2021 Excel."""
    q = config["quantities"]
    a = config.get("addOns", {})
    fascia_offset = config.get("fasciaOffset", 0.4375)
    inputs = {
        cell("Fascia Mount", "D60"): config["railHeight"],
        cell("Fascia Mount", "D61"): config["topGlassReveal"],
        cell("Fascia Mount", "D62"): config["bottomGlassGap"],
        cell("Fascia Mount", "D63"): config.get("distTopBasePlateToDeck", 3),
        cell("Fascia Mount", "D64"): fascia_offset,
        cell("Fascia Mount", "D65"): config["glassThickness"],
        cell("Fascia Mount", "D67"): q.get("midPosts", 0),
        cell("Fascia Mount", "D68"): q.get("endPosts", 0),
        cell("Fascia Mount", "D69"): q.get("outsideCornerPosts", 0),
        cell("Fascia Mount", "D70"): q.get("insideCornerPosts", 0),
        cell("Fascia Mount", "D71"): q.get("wallTracks", 0),
        cell("Fascia Mount", "D72"): q.get("endPostsLeft25", 0),
        cell("Fascia Mount", "D73"): q.get("endPostsRight25", 0),
        cell("Fascia Mount", "D74"): config["discountLevel"],
        cell("Fascia Mount", "D75"): yes_no(config["shipViaCourier"]),
        cell("Fascia Mount", "B78"): a.get("removeTrackFromPost", 0),
        cell("Fascia Mount", "B79"): a.get("cutDownTrack", 0),
        cell("Fascia Mount", "B82"): a.get("addWeldedExtrudedSideMount", 0),
        cell("Fascia Mount", "B84"): 0,  # drink holders
        cell("Fascia Mount", "B85"): a.get("glassShelfKits", 0),
    }

    sol = xl_model.calculate(inputs=inputs)

    def read(ref):
        return to_python(sol.get(cell("Fascia Mount", ref)))

    line_items = []
    for row in FASCIA_BOM_ROWS:
        desc = read(f"E{row}")
        qty = read(f"F{row}")
        unit = read(f"G{row}")
        total = read(f"H{row}")
        if qty is None or unit is None or total is None:
            continue
        try:
            if isinstance(qty, (int, float)) and qty == 0:
                continue
        except Exception:
            pass
        line_items.append({
            "description": str(desc) if desc else f"(row {row})",
            "qty": qty,
            "unitCost": unit,
            "total": total,
        })

    # Add-on lines (B-column qty, C-column unit, D-column total) for rows 78-88
    for ar in [78, 79, 82, 84, 85, 88]:
        a_qty = read(f"B{ar}")
        a_unit = read(f"C{ar}")
        a_total = read(f"D{ar}")
        a_desc = read(f"A{ar}")
        if a_qty is None or not isinstance(a_qty, (int, float)) or a_qty == 0:
            continue
        line_items.append({
            "description": (str(a_desc) if a_desc else f"(add-on row {ar})") + " (Add-On)",
            "qty": a_qty,
            "unitCost": a_unit,
            "total": a_total,
        })

    subtotal = read("F87")
    # NOTE: Excel cell F61 in Fascia Mount sheet is the *full physical post length*
    # (above deck + distToDeck + base plate). React separates this into
    # `postHeightAboveDeck` and `physicalPostLength`. Excel doesn't expose
    # postHeightAboveDeck as a labelled cell — we'd have to derive it inline.
    # For now, skip the post-height comparison on fascia and just compare insert
    # lengths and wall track height, which use the same definitions in both engines.
    dimensions = {
        "physicalPostLength": read("F61"),
        "glassInsertLengthPost": read("F62"),
        "endPostInsertLength": read("F63"),
        "wallTrackHeight": read("F66"),
        "settingBlockLengthPost": read("F64"),
        "settingBlockLengthTrack": read("F65"),
        "glassInsertLengthTrack": read("F68"),
    }
    return {
        "lineItems": line_items,
        "subtotal": subtotal,
        "dimensions": dimensions,
    }

def main():
    if len(sys.argv) < 3:
        print("usage: run_excel.py <scenarios.json> <out.json>", file=sys.stderr)
        sys.exit(1)
    scenarios_path, out_path = sys.argv[1], sys.argv[2]

    with open(scenarios_path) as f:
        scenarios = json.load(f)

    print(f"Loading Excel model...", file=sys.stderr)
    xl_model = formulas.ExcelModel().loads(XLSX).finish()
    print(f"  Loaded {len(xl_model.cells)} cells", file=sys.stderr)

    results = []
    for i, s in enumerate(scenarios):
        print(f"  [{i+1}/{len(scenarios)}] {s['name'][:60]}", file=sys.stderr)
        try:
            mount = s["config"].get("mountType", "surface")
            if mount == "surface":
                excel_result = run_surface(xl_model, s["config"])
            elif mount == "fascia":
                excel_result = run_fascia(xl_model, s["config"])
            else:
                excel_result = {"error": f"unknown mount type: {mount}"}
        except Exception as e:
            excel_result = {"error": str(e)}
        results.append({
            "id": s.get("id", str(i)),
            "name": s["name"],
            "config": s["config"],
            "excel": excel_result,
        })

    with open(out_path, "w") as f:
        json.dump({"results": results}, f, indent=2, default=str)
    print(f"Wrote {len(results)} results to {out_path}", file=sys.stderr)

if __name__ == "__main__":
    main()
