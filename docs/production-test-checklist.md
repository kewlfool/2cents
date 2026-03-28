# Production Test Checklist

Use this checklist after GitHub Pages deploys the latest build from the `gh-pages` branch.

## Deploy

1. Push the current branch to the repository default branch.
2. Wait for `.github/workflows/deploy-pages.yml` to finish successfully.
3. Confirm the workflow updated the `gh-pages` branch.
4. Open the Pages URL and confirm the app loads under the repository subpath.

## Installability

1. Open the deployed site in desktop Chrome.
2. Confirm the manifest is detected and the app can be installed.
3. Install the app and relaunch it in standalone mode.
4. On iPhone Safari, confirm `Share > Add to Home Screen` is available.

## Core product flows

1. Create or edit a manual budget baseline.
2. Import a statement CSV in the generic template format.
3. Import a statement CSV in the bank-style format if that matches the real institution export.
4. Correct at least one category and save an exact merchant rule.
5. Open monthly review and confirm planned vs actual values update.
6. Add, edit, ignore, and delete a manual transaction.
7. Roll back a statement import and confirm the affected transactions disappear.

## Backup and privacy

1. Export a JSON backup.
2. Reset local data without reseeding demo data.
3. Import the saved backup and confirm the local dataset returns.
4. Verify no network requests send statement contents to third-party services.

## Offline behavior

1. Load the deployed app once while online.
2. Reopen the installed app or browser tab after disconnecting the network.
3. Confirm previously visited routes still open.
4. Confirm existing local data remains visible.
5. Reconnect and confirm the app can refresh normally.

## Release sign-off

Mark the build ready when:

- GitHub Pages deploy succeeds
- Install prompt or home-screen flow works on target devices
- Statement import works with at least one real export
- Backup export/import works
- Offline reopen works after first load
