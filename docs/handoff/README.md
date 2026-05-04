# Handoff materials

Curated handoff package from Mike (Innovative Aluminum Systems) — the unique-value subset of the original ~2 MB zip. Source code, scratch scripts, screenshots, and CDN-hosted assets were dropped because they're already represented in the live repo.

## What's here

- **[DEVELOPER_HANDOFF.md](DEVELOPER_HANDOFF.md)** — onboarding doc covering tech stack, architecture, deployment, and known gaps. Best entry point for someone new to the project.
- **[SKILL.md](SKILL.md)** — design rules and "why" behind the calculator's domain logic.
- **[DOMAIN_NOTES.md](DOMAIN_NOTES.md)** — synthesized reference for the non-obvious pieces: paint cost derivation, vinyl cut tier rationale, price update workflow.
- **[installation_notes.txt](installation_notes.txt)** — grep-friendly plain-text notes from installer guides.
- **[div-balance.md](div-balance.md)** — JSX gotcha when editing large blocks in `Home.tsx`.
- **[price-list-extraction.md](price-list-extraction.md)** — process for updating prices when a new dealer price list comes out.

## `source-data/`

Canonical artifacts the calculator's logic was reverse-engineered from:

- **`CUSTOM_Infinity_Calculator2021.xltx`** — Mike's locked Excel calculator. Used as ground truth when validating the React calc engine. Open scenarios in this and run the same inputs through the web app; numbers should match.
- **`Dealer_Price_List-2026.xltx`** — Source of the `PRICES_2026` constants in `client/src/lib/calculator.ts`. Manual transcription — see `price-list-extraction.md` for the update workflow.

## `installation-guides/`

PDFs from IAS — physical product specs and field-installation references. Useful for sanity-checking dimensional math and for understanding where setting blocks, gaskets, and fasteners actually live in an installation.

- `InfinityInstallationGuideSurface.pdf`
- `InfinityInstallationGuideFascia.pdf`
- `Infinity_post_types.pdf` — geometry of mid / end / corner / 2.5"-EP posts
- `Template_Measuring-Fascia-Infinity_Only.pdf` — field measurement template
