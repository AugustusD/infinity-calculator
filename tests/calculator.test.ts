/**
 * Tests the React calculator against an independent reference implementation
 * of the same formulas (ported from the locked 2021 Excel calculator).
 *
 * Reference implementation lives at scripts/excel_reference_calc.py.
 * Expected outputs are pre-computed and stored in tests/__fixtures__/excel_reference_outputs.json.
 *
 * The React app and the Excel split BOM line items differently — e.g., the React app
 * separates "End Post Termination Side" gasket from the main gasket line, while the
 * Excel rolls everything into one. To handle this cleanly, tests assert against
 * AGGREGATES (sum of all gasket lines, sum of all setting block lines, etc.) rather
 * than line-by-line — splitting is a presentation choice, not a math choice.
 *
 * If a test fails: look at the diff and decide whether the React app, the reference,
 * or both are wrong. Investigate before "fixing" calculator.ts.
 */

import { describe, it, expect } from "vitest";
import { calculate, defaultConfig, type ConfigInputs, type CalculationResult } from "@/lib/calculator";
import fixtures from "./__fixtures__/excel_reference_outputs.json" with { type: "json" };

interface Scenario {
  name: string;
  config: Partial<ConfigInputs> & {
    quantities: ConfigInputs["quantities"];
    addOns?: Partial<ConfigInputs["addOns"]>;
  };
  expected: {
    dimensions: {
      postHeightAboveDeck: number;
      wallTrackHeight: number;
      glassInsertLengthPost: number;
      glassInsertLengthEndPost: number;
      glassInsertLengthTrack: number;
      cutSize: number;
    };
    quantities: {
      gasketLengths: number;
      glassWedge: number;
      endCaps: number;
      basePlateGasket?: number;
    };
    lineItems: Array<{ description: string; qty: number; unitCost: number; total: number }>;
    subtotal: number;
  };
}

function buildConfig(scenarioConfig: Scenario["config"]): ConfigInputs {
  const base = defaultConfig();
  return {
    ...base,
    ...scenarioConfig,
    quantities: { ...base.quantities, ...scenarioConfig.quantities },
    addOns: { ...base.addOns, ...(scenarioConfig.addOns ?? {}) },
  };
}

/** Sum quantities of all line items whose description matches the regex. */
function aggQty(result: CalculationResult, re: RegExp): number {
  return result.lineItems.filter((li) => re.test(li.description)).reduce((s, li) => s + li.qty, 0);
}

/** Sum totals of all line items whose description matches the regex. */
function aggTotal(result: CalculationResult, re: RegExp): number {
  return result.lineItems.filter((li) => re.test(li.description)).reduce((s, li) => s + li.total, 0);
}

describe("Calculator vs. 2021 Excel reference (Surface Mount)", () => {
  for (const scenario of fixtures as Scenario[]) {
    describe(scenario.name, () => {
      const cfg = buildConfig(scenario.config);
      const result = calculate(cfg);

      it("computed dimensions match", () => {
        expect(result.postHeightAboveDeck).toBeCloseTo(scenario.expected.dimensions.postHeightAboveDeck, 2);
        expect(result.wallTrackHeight).toBeCloseTo(scenario.expected.dimensions.wallTrackHeight, 2);
        expect(result.glassInsertLength).toBeCloseTo(scenario.expected.dimensions.glassInsertLengthPost, 2);
        expect(result.endPostInsertLength).toBeCloseTo(scenario.expected.dimensions.glassInsertLengthEndPost, 2);
        expect(result.glassInsertLengthTrack).toBeCloseTo(scenario.expected.dimensions.glassInsertLengthTrack, 2);
      });

      it("aggregate glass-insert gasket quantity matches", () => {
        // Match only glass-insert gasket lines (description starts with "Gasket ").
        // Excludes "Base Plate Gasket" (a different product).
        const actualQty = aggQty(result, /^Gasket /);
        const expectedQty = scenario.expected.quantities.gasketLengths;

        // Known divergence: the React app's per-group cut optimization (commit
        // 133648f) groups gasket cuts by post tier rather than using a single cut
        // size for the whole BOM the way the 2021 Excel did. This is an intentional
        // redesign per Mike — in most scenarios it saves the dealer material, but in
        // scenarios with mixed post tiers (short post + end post; or many post types
        // at different heights) it can over-purchase by 1–3 stock lengths.
        // Allow up to 3 stock lengths of over-purchase across these cases.
        // See docs/handoff/TEST_REPORT.md for the full explanation.
        const isShortPost = (scenario.config.topGlassReveal ?? 0) > 10;
        const isMixedPostTiers =
          scenario.config.quantities.midPosts > 0 &&
          (scenario.config.quantities.outsideCornerPosts > 0 ||
            scenario.config.quantities.insideCornerPosts > 0 ||
            scenario.config.quantities.wallTracks > 0 ||
            scenario.config.quantities.endPostsLeft25 > 0 ||
            scenario.config.quantities.endPostsRight25 > 0);
        const hasRemoveTrack = (scenario.config.addOns?.removeTrackFromPost ?? 0) > 0;

        if (isShortPost || isMixedPostTiers || hasRemoveTrack) {
          expect(actualQty).toBeLessThanOrEqual(expectedQty + 3);
          expect(actualQty).toBeGreaterThanOrEqual(expectedQty);
        } else {
          expect(actualQty).toBe(expectedQty);
        }
      });

      it("base plate gasket quantity matches (when basePlateGaskets enabled)", () => {
        const actualQty = aggQty(result, /Base Plate Gasket/);
        const expectedQty = scenario.expected.quantities.basePlateGasket ?? 0;
        expect(actualQty).toBe(expectedQty);
      });

      it("aggregate setting block quantity matches", () => {
        // Sum all setting block lines (10ft, per-ft, 1.5" pieces, etc.)
        const actualQty = aggQty(result, /setting block/i);
        const expectedQty = scenario.expected.lineItems
          .filter((li) => /setting block/i.test(li.description))
          .reduce((s, li) => s + li.qty, 0);
        expect(actualQty).toBe(expectedQty);
      });

      it("glass wedge quantity matches", () => {
        const actualQty = aggQty(result, /glass wedge/i);
        expect(actualQty).toBe(scenario.expected.quantities.glassWedge);
      });

      it("post + end post quantities match", () => {
        // React combines mid + end into one line; the reference does the same.
        const midEnd = aggQty(result, /infinity mid post/i);
        const expectedMidEnd = scenario.expected.lineItems
          .filter((li) => /infinity mid post/i.test(li.description))
          .reduce((s, li) => s + li.qty, 0);
        expect(midEnd).toBe(expectedMidEnd);

        const oc = aggQty(result, /outside corner/i);
        const expectedOc = scenario.expected.lineItems
          .filter((li) => /outside corner/i.test(li.description))
          .reduce((s, li) => s + li.qty, 0);
        expect(oc).toBe(expectedOc);

        const ic = aggQty(result, /inside corner/i);
        const expectedIc = scenario.expected.lineItems
          .filter((li) => /inside corner/i.test(li.description))
          .reduce((s, li) => s + li.qty, 0);
        expect(ic).toBe(expectedIc);
      });

      it("end caps quantity matches", () => {
        const actualQty = aggQty(result, /end caps/i);
        expect(actualQty).toBe(scenario.expected.quantities.endCaps);
      });

      it("subtotal within 5% of reference", () => {
        // Tolerance: 5% accounts for line-splitting rounding differences.
        // A larger drift indicates a real formula or pricing divergence.
        const delta = Math.abs(result.subtotal - scenario.expected.subtotal) / Math.max(0.01, scenario.expected.subtotal);
        expect(delta, `subtotal drift: app=${result.subtotal.toFixed(2)}, ref=${scenario.expected.subtotal.toFixed(2)}, delta=${(delta * 100).toFixed(2)}%`).toBeLessThan(0.05);
      });
    });
  }
});
