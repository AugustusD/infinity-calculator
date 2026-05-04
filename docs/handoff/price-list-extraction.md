# Price List Extraction Reference

Use this script to extract pricing from a new IAS `.xltx` price list file.

## Full Extraction Script

```python
import openpyxl

wb = openpyxl.load_workbook('/home/ubuntu/upload/Dealer_Price_List-2026.xltx', data_only=True)
print("Sheets:", wb.sheetnames)

# Inspect a specific sheet
ws = wb['Infinity']
for row in ws.iter_rows(min_row=1, max_row=5, values_only=True):
    print(row)

# Dump all rows from a sheet to find part codes and prices
ws = wb['Infinity']
for row in ws.iter_rows(values_only=True):
    if row[0] is not None:
        print(row)
```

## Known Sheet Names (2026 Price List)

| Sheet | Contents |
|---|---|
| `Infinity` | Surface and fascia posts, wall tracks, end caps, base plates, accessories |
| `Parts` | Vinyl gasket, setting blocks, glass wedges, glass inserts |
| `Fasteners` | Deck screws, nylon washers — all NET PRICE |

## Key Part Codes (2026)

### Surface Posts

| Part Code | Description | Price |
|---|---|---|
| RPLINF24SS | 24" Surface Post | (see price list) |
| RPLINF34SS | 34" Surface Post | (see price list) |
| RPLINF40SS | 40" Surface Post | (see price list) |

### Fascia Posts

| Part Code | Description | Price |
|---|---|---|
| RPLINF32FS | 32" Fascia Post | (see price list) |
| RPLINF42FS | 42" Fascia Post | (see price list) |
| RPLINF48FS | 48" Fascia Post | (see price list) |

### Fasteners (NET PRICE — no dealer discount)

| Part Code | Description | Price | Box Qty |
|---|---|---|---|
| PSC14X300PHS | #14x3 Pan Head (no covers) | $56.85 | 100 |
| RSC14X300FHD | #14x3 Pan Head (with covers) | $30.30 | 100 |
| PSC516X500HHS | 5/16x5 Hex Head | $85.12 | 50 |
| RPLSCI14 | Nylon Washer (14 series) | $20.00 | 100 |
| RPLSCI516 | Nylon Washer (516 series) | $21.54 | 100 |

## Updating PRICES_2026

After extracting new prices, update the constants in both calculator files:

```
client/src/utils/infinityCalculator.ts    → PRICES_2026.surface, .parts, .fasteners
client/src/utils/infinityFasciaCalculator.ts → PRICES_2026.fascia, .parts, .fasteners
```

Always run TypeScript check after updating:
```bash
cd /home/ubuntu/infinity-calculator && npx tsc --noEmit
```
