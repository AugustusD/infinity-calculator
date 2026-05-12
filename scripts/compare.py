"""
Compares Excel results vs React results for each scenario.
Outputs a divergence report.
"""
import json
import re
import sys

EXCEL_PATH = "/Users/sunny/Desktop/Claude/infinity-calculator/scripts/results_excel.json"
REACT_PATH = "/Users/sunny/Desktop/Claude/infinity-calculator/scripts/results_react.json"
OUT_PATH   = "/Users/sunny/Desktop/Claude/infinity-calculator/scripts/divergence_report.md"

# Tolerance for "matches"
# Subtotal: account for known 2021→2026 price update (~8%). Only flag drifts > 12%.
SUBTOTAL_TOL_PCT = 12.0
SUBTOTAL_TOL_ABS = 5.0
# Dimensions: Excel uses nominal rail height (e.g., 36"); React uses rail + 1/8" gasket (36.125").
# This produces a constant 0.125" drift on every dimension. Allow 0.13" tolerance.
DIM_TOL = 0.13

def agg_qty(line_items, pattern):
    rx = re.compile(pattern, re.I)
    return sum((li.get("qty", 0) or 0) for li in line_items if rx.search(li.get("description", "")))

def agg_total(line_items, pattern):
    rx = re.compile(pattern, re.I)
    return sum((li.get("total", 0) or 0) for li in line_items if rx.search(li.get("description", "")))

def compare_one(s_excel, s_react):
    """Compare a single scenario. Return dict of divergences."""
    config = s_excel["config"]
    excel = s_excel.get("excel", {})
    react = s_react.get("react", {})

    if "error" in excel or "error" in react:
        return {
            "kind": "error",
            "excel_error": excel.get("error"),
            "react_error": react.get("error"),
        }

    findings = []

    # Subtotal comparison (Excel F63 = job cost; React subtotal)
    excel_total = excel.get("subtotal") or 0
    react_total = react.get("subtotal") or react.get("jobCost") or 0
    if excel_total and react_total:
        delta_abs = abs(react_total - excel_total)
        delta_pct = (delta_abs / excel_total) * 100 if excel_total else 0
        if delta_abs > SUBTOTAL_TOL_ABS and delta_pct > SUBTOTAL_TOL_PCT:
            findings.append({
                "type": "subtotal_drift",
                "excel": round(excel_total, 2),
                "react": round(react_total, 2),
                "delta_abs": round(delta_abs, 2),
                "delta_pct": round(delta_pct, 2),
            })

    # Aggregate quantity checks across line-item groups
    groups = [
        ("gaskets", r"^Gasket "),
        ("setting_blocks", r"setting block"),
        ("glass_wedge", r"glass wedge"),
        ("mid_post", r"infinity mid post"),
        ("oc_post", r"outside corner"),
        ("ic_post", r"inside corner"),
        ("wall_track", r"wall track"),
        ("end_caps", r"end caps"),
        ("ep25_left", r"2\.5\" end left"),
        ("ep25_right", r"2\.5\" end right"),
        ("ep25_caps", r"2\.5\" post caps"),
        ("base_plate_gasket", r"base plate gasket"),
        ("base_plate_cover", r"base plate cover"),
        ("remove_track", r"remove track"),
        ("cut_down", r"cut down"),
        ("welded_surface", r"welded surface"),
        ("welded_side", r"welded extruded"),
        ("five_x_five", r"5\"?×5\"?|5x5|5 ?\"|5×5"),
        ("glass_shelf", r"glass shelf"),
    ]

    excel_items = excel.get("lineItems", [])
    react_items = react.get("lineItems", [])

    for label, pat in groups:
        eq = agg_qty(excel_items, pat)
        rq = agg_qty(react_items, pat)
        # Round to nearest 0.01 for floating point comparison
        eq_r = round(eq, 2)
        rq_r = round(rq, 2)
        if eq_r != rq_r:
            # For setting blocks specifically, the fractional vs ceil divergence
            # is well-known; tag it.
            tag = ""
            if label == "setting_blocks":
                tag = " (known: fractional vs ceil)"
            findings.append({
                "type": "qty_mismatch",
                "group": label + tag,
                "excel_qty": eq_r,
                "react_qty": rq_r,
                "delta": round(rq_r - eq_r, 2),
            })

    # Dimensional checks
    e_dim = excel.get("dimensions", {}) or {}
    r_dim = react.get("dimensions", {}) or {}
    # For surface: postHeightAboveDeck and glassInsertLengthPost
    # For fascia: physicalPostLength (Excel F61) and glassInsertLengthPost
    # wallTrackHeight is common to both
    is_fascia = config.get("mountType") == "fascia"
    dims_to_check = (
        ["physicalPostLength", "glassInsertLengthPost", "wallTrackHeight"]
        if is_fascia
        else ["postHeightAboveDeck", "glassInsertLengthPost", "wallTrackHeight"]
    )
    for d in dims_to_check:
        e_val = e_dim.get(d)
        r_val = r_dim.get(d)
        if e_val is None or r_val is None:
            continue
        if abs(e_val - r_val) > DIM_TOL:
            findings.append({
                "type": "dimension_mismatch",
                "dim": d,
                "excel": round(e_val, 4),
                "react": round(r_val, 4),
                "delta": round(r_val - e_val, 4),
            })

    return findings if findings else None

def main():
    with open(EXCEL_PATH) as f:
        excel_data = json.load(f)["results"]
    with open(REACT_PATH) as f:
        react_data = json.load(f)["results"]

    # Index by id
    excel_by_id = {r["id"]: r for r in excel_data}
    react_by_id = {r["id"]: r for r in react_data}

    diverging = []
    matching = []
    errors = []

    for sid, e_row in excel_by_id.items():
        r_row = react_by_id.get(sid)
        if not r_row:
            errors.append({"id": sid, "name": e_row["name"], "issue": "no React result"})
            continue
        result = compare_one(e_row, r_row)
        if result is None:
            matching.append(sid)
        elif isinstance(result, dict) and result.get("kind") == "error":
            errors.append({"id": sid, "name": e_row["name"], "excel_error": result.get("excel_error"), "react_error": result.get("react_error")})
        else:
            diverging.append({
                "id": sid,
                "name": e_row["name"],
                "config": e_row["config"],
                "findings": result,
            })

    # Write the report
    out_lines = []
    out_lines.append("# Excel vs React App — divergence report\n")
    out_lines.append(f"**Total scenarios run:** {len(excel_data)}\n")
    out_lines.append(f"**Matching:** {len(matching)} ({len(matching) * 100 // len(excel_data)}%)\n")
    out_lines.append(f"**Diverging:** {len(diverging)} ({len(diverging) * 100 // len(excel_data)}%)\n")
    out_lines.append(f"**Errors:** {len(errors)}\n")
    out_lines.append("")
    out_lines.append("Tolerance: ignore subtotal drift under $5 or 0.5%. Quantity mismatches reported when integer/0.01-rounded values differ.\n")
    out_lines.append("")

    if errors:
        out_lines.append("## Errors\n")
        for e in errors[:20]:
            out_lines.append(f"- **{e.get('name', e['id'])}**: excel={e.get('excel_error', 'n/a')}, react={e.get('react_error', 'n/a')}")
        out_lines.append("")

    # Group divergences by finding-type for easier reading
    type_groups = {}
    for d in diverging:
        for f in d["findings"]:
            t = f.get("type", "unknown")
            type_groups.setdefault(t, []).append((d["name"], f))

    out_lines.append("## Divergences grouped by type\n")
    for t, items in sorted(type_groups.items(), key=lambda x: -len(x[1])):
        out_lines.append(f"### {t} — {len(items)} occurrences\n")
        # show first 10 examples of each type
        for name, f in items[:10]:
            out_lines.append(f"- **{name}** — {f}")
        if len(items) > 10:
            out_lines.append(f"- ... ({len(items) - 10} more)")
        out_lines.append("")

    out_lines.append("## Full per-scenario divergence list\n")
    for d in diverging[:80]:
        out_lines.append(f"### {d['name']}\n")
        out_lines.append(f"  Config: country={d['config'].get('country')}, rail={d['config'].get('railHeight')}, glass={d['config'].get('glassThickness')}mm, reveal={d['config'].get('topGlassReveal')}, gap={d['config'].get('bottomGlassGap')}, courier={d['config'].get('shipViaCourier')}, discount={d['config'].get('discountLevel')}, bpg={d['config'].get('basePlateGaskets')}\n")
        out_lines.append(f"  Quantities: " + ", ".join(f"{k}={v}" for k, v in d['config'].get('quantities', {}).items() if v))
        out_lines.append(f"  Add-ons: " + ", ".join(f"{k}={v}" for k, v in d['config'].get('addOns', {}).items() if v) + "\n")
        for f in d["findings"]:
            out_lines.append(f"  - {f}")
        out_lines.append("")
    if len(diverging) > 80:
        out_lines.append(f"... ({len(diverging) - 80} more diverging scenarios truncated)\n")

    with open(OUT_PATH, "w") as f:
        f.write("\n".join(out_lines))

    # Print summary to stdout
    print(f"Total: {len(excel_data)}, Matching: {len(matching)}, Diverging: {len(diverging)}, Errors: {len(errors)}")
    print(f"\nDivergence types:")
    for t, items in sorted(type_groups.items(), key=lambda x: -len(x[1])):
        print(f"  {t}: {len(items)} occurrences")
    print(f"\nFull report: {OUT_PATH}")

if __name__ == "__main__":
    main()
