# Changelog

All notable changes to the Infinity Calculator. Newest entries on top.

---

## 2026-05-04 — Reset-to-standard button on glass reveal and bottom gap

**Source:** Action item from Mike's walkthrough on 2026-05-04. Original transcript wording:

> *Consider adding "reset to standard" button for glass reveal and bottom glass gap settings.*

**The change**

`UnlockableField` ([Home.tsx](client/src/pages/Home.tsx)) now accepts an optional `defaultValue` prop. When provided, a small ↺ (RotateCcw) icon button is rendered next to the lock icon — but **only when the current value differs from the default** (using a small epsilon to avoid floating-point comparison issues). Clicking it snaps the value back to the default via the field's existing `onChange` handler, so any clamping or validation in that handler still applies.

The reset button is styled with the same gold/cream palette as the unlocked-state lock icon, so it visually reads as a related affordance.

**Wired up at the two callsites Mike named:**

- **Top Glass Reveal** — `defaultValue={constraints.topRevealDefault}` (2.125")
- **Bottom Glass Gap** — `defaultValue={constraints.bottomGapDefault}` (2.0")

Both defaults come from `computeRevealConstraints` in `calculator.ts`, so they stay in sync if the canonical defaults ever move.

**How to verify in the browser**

1. Default state: only the lock icon is visible next to each field. No ↺.
2. Click the lock to unlock the Top Glass Reveal field, then change the value (type or use the spinner). Expected: a small ↺ appears between the field and the lock.
3. Click ↺. Expected: value snaps back to 2.125", and the ↺ button disappears (because value === default again).
4. Repeat on Bottom Glass Gap to confirm the same behavior with default 2".
5. Lock state is **not** changed by reset — if the user wants to relock, they click the lock icon (which already has its own reset-and-lock behavior).

**Files touched**

- `client/src/pages/Home.tsx` — added `RotateCcw` import; `UnlockableField` accepts `defaultValue` and renders conditional reset button; both callsites pass `defaultValue` from constraints.

**Note on existing relock behavior**

The `UnlockableField` lock icon already resets to default when re-locking ([Home.tsx:394-398](client/src/pages/Home.tsx#L394-L398)). The new ↺ button is an explicit, more discoverable affordance per Mike's request. The two affordances coexist without conflict.

---

## 2026-05-04 — Replaced native number-input spinners with focus-stable +/- buttons

**Source:** Action item from Mike's walkthrough on 2026-05-04. Original transcript wording:

> *Eliminate jumping/scrolling behavior when users click increment/decrement buttons on number inputs. Users should be able to align mouse and click repeatedly without interface shifting.*

**The bug**

`NumInput` previously relied on the browser's native `<input type="number">` spinner arrows (the small ▲▼ inside the input). Clicking a native spinner does two things that combine badly here:

1. **Shifts focus to the input.** Browsers may scroll the input into view when it gains focus.
2. **Fires `onChange`,** which updates `config`, re-runs `calculate()`, and re-lays-out the BOM panel on the right.

When the BOM panel grows or shrinks, every input on the page shifts vertically. The spinner button the user just clicked is no longer under their cursor. Repeated clicks land on the wrong target — Mike's "jumping/scrolling" complaint.

**The fix**

In [`client/src/pages/Home.tsx`](client/src/pages/Home.tsx), `NumInput`:

- The component now renders the input plus two custom ▲/▼ buttons inside a **single bordered wrapper** (input has no individual border; the wrapper provides the visible rectangle, and a vertical divider separates the button column from the input). This makes it read as one unified component — earlier iterations rendered the buttons as a separate visual element to the right of the input, which read as "detached" at certain widths.
- Buttons use `onMouseDown={(e) => { e.preventDefault(); ... }}`. `preventDefault()` on `mousedown` is the standard pattern to **stop a click from shifting focus** — without it, the button would steal focus and could trigger scroll-into-view. With it, focus stays wherever it was, no scroll, no jump.
- Buttons have `tabIndex={-1}` so they aren't reachable via Tab navigation (the input itself is, and Up/Down arrows on a focused number input still work).
- Buttons disable themselves automatically when `value >= max` or `value <= min`, giving a clear visual cue when the cap is hit (e.g., the ▲ button greys out when the value reaches `totalPostsForBasePlates` from the previous fix).
- The input itself gets a new `no-native-spin` class so the browser's built-in spinners are hidden — preventing two sets of arrows showing.
- The wrapper uses `focus-within:ring-2` so the gold focus ring appears around the **whole** input/button unit when the input is focused, instead of just around the input portion.

In [`client/src/index.css`](client/src/index.css):

- Added a CSS rule that hides `::-webkit-inner-spin-button` / `::-webkit-outer-spin-button` and applies `appearance: textfield` on inputs with `.no-native-spin`. Added alongside the existing rule (didn't remove it) so non-`NumInput` number inputs (none today, but future-safe) are unaffected.

**How to verify in the browser**

1. Open the calculator. Try clicking the ▲ button on any post-quantity field rapidly (e.g., Mid Posts).
2. Expected: the value increments, the BOM updates on the right, but **the input itself stays under your cursor** so successive clicks land on the same button without re-aligning.
3. Try the same in a long form section while scrolled near the bottom of the page — no scroll-jump should occur.
4. Tab through the form: focus should land on each `NumInput` once (not on the +/- buttons themselves).
5. With Mid Posts = `totalPostsForBasePlates`, the ▲ button on capped fields like "Add 5"×5"×0.5" Base Plate" should be visibly greyed out and non-clickable.

**Files touched**

- `client/src/pages/Home.tsx` — `NumInput` component rewritten (~50 lines).
- `client/src/index.css` — added `.no-native-spin` rule.

**Not changed**

- All call sites of `NumInput` — same prop signature (`value`, `onChange`, `min`, `max`, `step`, `disabled`, `className`), so no consumer needs to change.

---

## 2026-05-04 — Base-plate customization quantities capped at total post count

**Source:** Action item from Mike's walkthrough on 2026-05-04. Original transcript wording:

> *System allows users to add more custom base plates than total posts in order, which makes no logical sense. Action required: Add validation to prevent base plate customization quantity from exceeding total post count.*

**The bug**

Three add-on quantity fields could exceed the number of posts in the order, producing nonsensical line items (e.g., 999 unassigned 5×5 base plates):

- **Add 5"×5"×0.5" Base Plate** (surface) — top-level field had `min={0}` but no `max`. Per-post-type sub-spinners were correctly capped, but the parent total wasn't, so any excess just appeared as "unassigned" plates on the BOM.
- **Add Welded Surface Base** (surface) — no upper cap.
- **Add Welded Extruded Side Mount 1.9 Pipe** (both surface and fascia) — no upper cap.

Each of these is a "1-per-post" customization, so its quantity logically can't exceed the count of posts that take a base plate or mount fixture.

**The fix**

In [`client/src/pages/Home.tsx`](client/src/pages/Home.tsx):

- Computed a new `totalPostsForBasePlates` value: sum of `midPosts`, `endPosts`, `outsideCornerPosts`, `insideCornerPosts`, `endPostsLeft25`, `endPostsRight25`. Wall tracks are excluded — they don't take base plates.
- Added `max={totalPostsForBasePlates}` and `Math.min(v, totalPostsForBasePlates)` clamping to the three input fields above.
- For the fascia branch, replaced an inline `.map()` over two add-ons with explicit `<FieldRow>` blocks, so the cap can be applied to the welded one without per-item conditional logic.

The clamping is at the UI boundary (where the user types) — the same pattern the per-type 5×5 sub-spinners already use ([Home.tsx:~1217-1226](client/src/pages/Home.tsx)).

**How to verify in the browser**

1. Set country to **US** or **Canada**, mount to **Surface**.
2. Set Mid Posts = 5, all other post quantities = 0. Total posts = 5.
3. Try typing `999` into "Add 5"×5"×0.5" Base Plate" — value should snap to `5`.
4. Same test on "Add Welded Surface Base" — should cap at 5.
5. Same test on "Add Welded Extruded Side Mount 1.9 Pipe" — should cap at 5.
6. Switch mount to **Fascia** and repeat step 5 in the fascia panel.
7. Increase Mid Posts to 8 — the previously-capped fields should now allow values up to 8.

**Files touched**

- `client/src/pages/Home.tsx` — added `totalPostsForBasePlates` computation, clamped three input fields, de-looped the fascia add-ons block.

**Not changed**

- The calculator engine (`calculator.ts`) — sub-spinner clamps already exist there, and this fix lives at the input boundary so it doesn't need to be duplicated downstream.
- `removeTrackFromPost` quantity (fascia and surface) — Mike didn't call this out, and it might have a different intended ceiling; left alone pending clarification.

---

## 2026-05-04 — US glass reveal capped at 2" regardless of mount type

**Source:** Action item from Mike's walkthrough on 2026-05-04. Original transcript wording:

> *Currently US customers can manipulate glass reveal settings to create effectively short posts (e.g., setting 18-inch reveal), which violates sales restrictions. Action required: Implement validation to limit US customers to maximum 2-inch glass reveal from rail height to post top.*

**The bug**

`computeRevealConstraints` already enforced a 2" cap on glass reveal for US dealers — **but only on the surface-mount path**. The fascia-mount path computed `topRevealMax` purely from physical post-length geometry (post must be ≥ 32" physical), which on a 42" rail allows reveals up to ~18". That's exactly the short-post range. A US dealer doing a fascia mount could type `18` into the glass reveal field and get a short-post quote, bypassing the regulatory restriction.

**The fix**

In [`client/src/lib/calculator.ts`](client/src/lib/calculator.ts), `computeRevealConstraints`:

- Removed the country-specific branching inside the surface-mount block.
- After geometry-based `topRevealMax` is computed (for either surface or fascia), apply a single uniform US cap: `topRevealMax = Math.min(topRevealMax, 2.0)`.

This makes the 2" cap apply to **both surface and fascia** mount types when `country === 'US'`. The Canada path is unaffected (still permits short-post reveals).

The UI consumes `constraints.topRevealMax` for the input's `max` attribute and `handleRevealChange` clamps any typed value to that range, so this single source-of-truth change closes the input bypass.

**How to verify in the browser**

1. Set country to **US**, mount type to **Fascia**, rail height to **42"**.
2. Click the lock icon next to "Top Glass Reveal" to unlock the field.
3. Try to type `18`. Expected: value snaps to `2.000"` (or whatever the cap allows). Range hint should read `0.000" - 2.000"`.
4. Repeat with surface mount — should still cap at 2" (no regression).
5. Switch country to **Canada** with fascia mount — reveal should accept higher values up to the geometric maximum (no false cap on Canada).

**Files touched**

- `client/src/lib/calculator.ts` — `computeRevealConstraints` body (~10 lines changed).

**Not changed**

- `calculate()` / `calculateSurface()` / `calculateFascia()` — these read `config.topGlassReveal` directly, but since the UI clamps before writing to config, no change is needed there.
- `handleCountryChange` in `Home.tsx` — already resets reveal to 2.125" on country change; behavior unchanged.
