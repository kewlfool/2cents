# 2cents

2cents is a local-first budgeting and reconciliation Progressive Web App. It helps a single person define a monthly budget baseline, import statement data safely, categorize spending with merchant rules, and compare planned savings to actual savings without sending financial data to external services.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Dexie + IndexedDB
- Zod
- React Hook Form
- Papa Parse
- read-excel-file
- Vitest
- Playwright

## Local development

```bash
npm install
npm run dev
```

Useful commands:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run e2e`
- `npm run build`
- `npm run build:pages`
- `npm run preview:pages`
- `npm run release:check`

## GitHub Pages deployment

This repository now deploys to GitHub Pages through a branch-based flow:

1. Push to `main`.
2. GitHub Actions runs `.github/workflows/deploy-pages.yml`.
3. The workflow builds the static export with `npm run build:pages`.
4. The workflow publishes `out/` to the `gh-pages` branch.
5. GitHub Pages serves the site from that branch.

Configure GitHub Pages once in repository settings:

1. Open `Settings -> Pages`.
2. Set `Source` to `Deploy from a branch`.
3. Set `Branch` to `gh-pages`.
4. Set the folder to `/(root)`.
5. Save.

The app is base-path aware, so the Pages build is served from `/2cents/`.

## Production test

Before pushing a release build, run:

```bash
npm run release:check
```

After deployment:

1. Open the live Pages URL.
2. Test budget setup, statement import, monthly review, and transaction editing.
3. Test backup export/import.
4. Install the PWA and reopen it offline after first load.

The branch-publish workflow intentionally does not block deployment on Playwright in CI right now. End-to-end and PWA preview tests are still available locally and should be run before release.
