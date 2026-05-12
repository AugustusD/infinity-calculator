/**
 * Runs scenarios through the React app's calculate() function and dumps the BOMs as JSON.
 *
 * Usage:  pnpm tsx scripts/run_react.ts <scenarios.json> <out.json>
 */

import * as fs from "node:fs";
import { calculate, defaultConfig, type ConfigInputs } from "../client/src/lib/calculator";

interface Scenario {
  id?: string;
  name: string;
  config: Partial<ConfigInputs> & {
    quantities: ConfigInputs["quantities"];
    addOns?: Partial<ConfigInputs["addOns"]>;
  };
}

function buildConfig(s: Scenario["config"]): ConfigInputs {
  const base = defaultConfig();
  return {
    ...base,
    ...s,
    quantities: { ...base.quantities, ...s.quantities },
    addOns: { ...base.addOns, ...(s.addOns ?? {}) },
  };
}

function main() {
  const [scenariosPath, outPath] = process.argv.slice(2);
  if (!scenariosPath || !outPath) {
    console.error("usage: run_react.ts <scenarios.json> <out.json>");
    process.exit(1);
  }

  const scenarios: Scenario[] = JSON.parse(fs.readFileSync(scenariosPath, "utf-8"));
  const results: any[] = [];

  for (let i = 0; i < scenarios.length; i++) {
    const s = scenarios[i];
    process.stderr.write(`  [${i + 1}/${scenarios.length}] ${s.name.slice(0, 60)}\n`);
    try {
      const cfg = buildConfig(s.config);
      const result = calculate(cfg);
      results.push({
        id: s.id ?? String(i),
        name: s.name,
        config: s.config,
        react: {
          lineItems: result.lineItems.map((li) => ({
            description: li.description,
            qty: li.qty,
            unitCost: li.unitCost,
            total: li.total,
          })),
          subtotal: result.subtotal,
          jobCost: result.jobCost,
          dimensions: {
            postHeightAboveDeck: result.postHeightAboveDeck,
            glassInsertLengthPost: result.glassInsertLength,
            endPostInsertLength: result.endPostInsertLength,
            wallTrackHeight: result.wallTrackHeight,
            glassInsertLengthTrack: result.glassInsertLengthTrack,
            settingBlockHeight: result.settingBlockHeight,
          },
          warnings: result.warnings ?? [],
          errors: result.errors ?? [],
        },
      });
    } catch (e: any) {
      results.push({
        id: s.id ?? String(i),
        name: s.name,
        config: s.config,
        react: { error: e.message ?? String(e) },
      });
    }
  }

  fs.writeFileSync(outPath, JSON.stringify({ results }, null, 2));
  console.error(`Wrote ${results.length} results to ${outPath}`);
}

main();
