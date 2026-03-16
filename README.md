# 2cents

2cents is a local-first budgeting and reconciliation Progressive Web App. It helps a single person define a monthly budget baseline, import statement data safely, categorize spending with merchant rules, and compare planned savings to actual savings without sending financial data to external services.

## Status

Phases 0-11 are in place. The app is ready for GitHub Pages deployment and production testing.

Implemented:

- budget baseline setup with manual editing and CSV/XLSX import
- statement import with staging review, duplicate detection, rollback, and saved import history
- merchant rules with priority, testing, and correction-to-rule flow
- monthly review with planned vs actual variance and transaction drilldown
- transaction ledger with manual edits, filters, ignore/transfer flags, and bulk categorize
- local settings, JSON backup import/export, reset controls, and privacy messaging
- installable PWA behavior with manifest, icons, service worker, offline fallback, and GitHub Pages base-path support
- demo seed data, unit tests, development E2E tests, and preview-mode PWA tests

Out of scope in v1:

- bank login or Plaid-like integrations
- payments, bill pay, investing, taxes, or credit score features
- multi-user collaboration
- cloud sync by default
- analytics, ads, trackers, or AI calls

## Stack

- Next.js 16 with App Router and static export
- TypeScript with strict compiler options
- Tailwind CSS v4
- Dexie over IndexedDB for local persistence
- Zod for validation
- React Hook Form for form-heavy workflows
- Papa Parse and `read-excel-file` for imports
- Vitest for unit tests
- Playwright for browser tests
- ESLint and Prettier

## Architecture

High-level notes live in [docs/architecture.md](./docs/architecture.md).

Key decisions:

- money is stored as integer minor units
- monthly snapshots are derived data, not the source of truth
- IndexedDB is the default persistence boundary
- parsing, normalization, rule matching, and calculations are kept pure where practical
- `/app` stays route-focused while business logic lives under `features`, `db`, `lib`, and `types`

## Project structure

```text
app/                  Route entrypoints and shared layout
components/           Shared layout and UI primitives
db/                   Dexie schema, bootstrap, repositories, backups
docs/                 Architecture and release/testing notes
features/             Budget, imports, rules, review, settings, transactions
lib/                  Shared helpers
public/               Icons, manifest, and sample import files
tests/                Unit, E2E, and preview-mode PWA tests
types/                Domain models and Zod schemas
```

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment

No environment variables are required for normal development.

Optional:

- `PAGES_BASE_PATH`
  Use this when you want to simulate GitHub Pages under a repository subpath.
  Example: `PAGES_BASE_PATH=/2cents npm run build`

A minimal example file is provided in [.env.example](./.env.example).

## Scripts

```bash
npm run dev
npm run build
npm run build:pages
npm run start
npm run preview
npm run preview:pages
npm run lint
npm run typecheck
npm run test
npm run coverage
npm run e2e
npm run e2e:pwa
npm run release:check
npm run format
npm run format:check
```

## Example import files

Sample files ship with the app under [public/examples](./public/examples):

- [2cents-budget-baseline-template.csv](./public/examples/2cents-budget-baseline-template.csv)
- [2cents-statement-template.csv](./public/examples/2cents-statement-template.csv)
- [2cents-statement-bank-style-example.csv](./public/examples/2cents-statement-bank-style-example.csv)

The repository ships CSV templates because they are readable and diff cleanly. The app also supports `.xlsx`; open a template in Excel or Numbers and save it as XLSX if you want to test that path.

## GitHub Pages

This project is configured for GitHub Pages static hosting.

- Next.js builds with `output: "export"` and emits static files to `out/`
- deployment is handled by [.github/workflows/deploy-pages.yml](./.github/workflows/deploy-pages.yml)
- the workflow uses `actions/configure-pages` so repository subpaths resolve correctly

GitHub Pages constraints:

- no API routes or route handlers for core app behavior
- no Server Actions or server-only mutation flows
- no runtime dependence on cookies, headers, or middleware
- no server image optimization requirements

That fits 2cents because the product is intentionally local-first and client-side.

## Local testing

- `npm run test` runs the Vitest suite
- `npm run e2e` runs the Playwright development-server suite
- `npm run e2e:pwa` runs the Playwright preview-mode PWA suite against the GitHub Pages-style build
- `npm run build && npm run preview` previews the root static export locally
- `npm run build:pages && npm run preview:pages` previews the GitHub Pages-style build at `http://localhost:3000/2cents/`
- `npm run release:check` runs the full local release gate

If you clone the repo on another machine, run `npx playwright install` before using the browser suites.

## PWA behavior

- service worker registration is intentionally disabled in `npm run dev`
- the generated service worker caches the exported shell, offline page, and same-origin runtime assets needed to reopen the app offline
- existing IndexedDB data remains readable offline after the shell has been cached once
- imported source files selected from the file picker are not cached permanently
- iPhone and iPad users need Safari `Share > Add to Home Screen`

## Production testing

Use [docs/production-test-checklist.md](./docs/production-test-checklist.md) after GitHub Pages deploys.

Recommended path:

1. run `npm run release:check`
2. push to the repository default branch
3. wait for the Pages workflow to finish
4. test installability, imports, backup/restore, rollback, and offline reopen on the live site

## Privacy and storage

- financial data stays local by default in IndexedDB
- no external analytics, ads, trackers, or AI services are used
- JSON backup import/export is the only built-in portability mechanism in v1
- cloud sync is intentionally deferred

## Future improvements

- PDF statement import with staging parity
- split transactions
- optional encrypted backup or sync hooks once a complete design exists
- richer print/export variants for monthly review

## Notes

- real-bank statement variance should still be validated with your own exported files before broader use
- if your GitHub repository name is not `2cents`, override the preview base path locally with `PAGES_BASE_PATH=/your-repo-name npm run build`
