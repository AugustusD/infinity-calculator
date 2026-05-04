"""Dump scenario expected outputs as JSON fixtures for vitest tests."""
import json
import sys
sys.path.insert(0, '/Users/sunny/Desktop/Claude/infinity-calculator/scripts')
from excel_reference_calc import SCENARIOS, calculate_surface

out = []
for s in SCENARIOS:
    result = calculate_surface(s['config'])
    out.append({
        'name': s['name'],
        'config': s['config'],
        'expected': result,
    })

path = '/Users/sunny/Desktop/Claude/infinity-calculator/tests/__fixtures__/excel_reference_outputs.json'
import os
os.makedirs(os.path.dirname(path), exist_ok=True)
with open(path, 'w') as f:
    json.dump(out, f, indent=2)
print(f"Wrote {len(out)} fixtures to {path}")
