# 2cents Architecture

2cents is a local-first budgeting and reconciliation PWA built as a static Next.js App Router export. The product intentionally avoids server-side mutations, cloud sync, financial APIs, and analytics so the privacy boundary stays simple: financial data remains in the browser unless the user explicitly exports it.

## Core decisions

- Money is stored as integer minor units.
- `MonthlySnapshot` is derived from budget plans, transactions, and settings.
- IndexedDB is the source of truth in the browser, wrapped behind Dexie repositories and feature services.
- Parsing, normalization, rule matching, and calculations are implemented as pure functions where possible.
- The `/app` layer stays thin and route-oriented; business behavior lives under `features`, `db`, `lib`, and `types`.

## Folder layout

```text
app/                  Route entrypoints, layout metadata, offline page
components/           Shared layout components and UI primitives
db/                   Dexie schema, bootstrap, repositories, backup helpers
features/             Budget, imports, rules, review, settings, transactions
lib/                  Shared cross-feature utilities
public/               Static icons, manifest, sample import files
tests/                Unit, development E2E, and preview-mode PWA tests
types/                Shared domain models and Zod schemas
```

## Runtime flow

1. `app/layout.tsx` mounts the shell and PWA provider.
2. `AppBootstrapProvider` ensures Dexie is ready and demo data is seeded once in development.
3. Feature hooks load local data through repositories.
4. Screens render optimistic local-first interactions.
5. Feature services write through repositories and trigger derived snapshot rebuilds when needed.

## Data model

Primary entities:

- `BudgetCategory`
- `BudgetPlan`
- `Transaction`
- `StatementImport`
- `MerchantRule`
- `MonthlySnapshot`
- `AppSettings`

Validation is centralized with Zod in the shared type layer so imports, backups, and service boundaries use the same schema rules.

## Import pipeline

Budget baseline import:

1. Parse CSV or XLSX locally.
2. Auto-map known headers, then allow manual remapping.
3. Stage rows with row-level warnings and errors.
4. Save normalized categories into the active baseline.
5. Archive removed categories instead of deleting them.

Statement import:

1. Parse CSV or XLSX locally.
2. Normalize dates, merchants, and amounts.
3. Build duplicate fingerprints.
4. Match merchant rules by priority.
5. Stage every row before commit.
6. Save transactions and import history only after explicit confirmation.

## Offline and PWA model

- Production builds register a service worker.
- The static app shell, offline fallback, and same-origin runtime assets are cached.
- Raw uploaded statement files are not cached permanently.
- Existing IndexedDB data remains available offline after the shell has been cached once.
- GitHub Pages support is handled through base-path-aware build scripts and manifest/service-worker generation.

## Testing strategy

- Vitest covers pure calculations, parsing, normalization, rules, duplicate detection, storage bootstrap, and PWA/base-path helpers.
- Playwright development-server tests cover the main user flows against the interactive app.
- A separate preview-mode Playwright suite validates manifest/service-worker behavior and offline reopen support against the GitHub Pages-style static build.
