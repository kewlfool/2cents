# UI Refactor Plan

## Goal

Refactor the 2cents UI toward a dense, productivity-first workspace that maximizes usable content area, reduces scroll, and removes decorative or explanatory UI that does not directly help the user budget, import, review, and reconcile data.

This plan is driven by [UI guidlines.md](./UI%20guidlines.md).

## Recommended approach

Do not restyle each screen independently first.

The correct implementation order is:

1. Update layout and shared UI primitives.
2. Refactor the highest-traffic screens around the new primitives.
3. Tighten lower-frequency screens after the dense patterns are stable.

This reduces duplication, avoids one-off spacing fixes, and prevents the app from ending up with mixed visual systems.

## Current state

The app already has a sound information architecture and route structure, but the UI currently trends too far toward spacious dashboard patterns:

- The shell uses generous gaps, large branding blocks, and a floating mobile nav.
- `PageHeader` reserves too much vertical space and includes more descriptive copy than the new direction allows.
- Many screens rely on repeated bordered cards with padded headers and descriptions.
- Metrics, forms, and lists are readable, but not dense enough for power-user workflows.
- Several screens explain the product well, but spend too much space on copy instead of controls and data.

Primary files affected:

- `app/globals.css`
- `components/layout/app-shell.tsx`
- `components/layout/app-navigation.tsx`
- `components/layout/page-header.tsx`
- `components/ui/card.tsx`
- `components/ui/input.tsx`
- `components/ui/select.tsx`
- `components/ui/textarea.tsx`
- `components/ui/list.tsx`
- `features/dashboard/components/dashboard-preview.tsx`
- `features/review/components/monthly-review-screen.tsx`
- `features/transactions/components/transactions-screen.tsx`
- `features/import/components/imports-screen.tsx`
- `features/budget/components/budget-setup-screen.tsx`
- `features/rules/components/rules-screen.tsx`
- `features/settings/components/settings-screen.tsx`

## Product-wide UI rules

These rules should be treated as implementation constraints, not style suggestions.

- Prefer flat sections with dividers over stacked cards.
- Remove non-essential descriptive copy from every primary screen.
- Keep section headers short and functional.
- Use tighter spacing, smaller control heights, and denser list rows.
- Keep primary actions visible without large hero/header blocks.
- Favor split-pane and multi-column desktop layouts where they reduce navigation and scrolling.
- Keep related context on screen instead of hiding everything behind modals.
- Use sticky controls only where they reduce repeated scrolling.
- Make mobile compact, but do not force desktop layouts to collapse into card stacks unnecessarily.

## Refactor phases

## Phase 1: Foundation

Objective: create the dense system that every screen will reuse.

Work:

- Reduce shell padding and inter-column gaps in `components/layout/app-shell.tsx`.
- Convert the desktop nav into a slimmer workspace rail.
- Replace the floating mobile nav treatment with a simpler compact dock.
- Introduce a compact `PageHeader` variant with:
  - shorter title block
  - optional one-line metadata/badge area
  - minimal or no long description copy
- Rework `Card` usage strategy:
  - keep the primitive only where grouping is actually necessary
  - add lighter section wrappers or divider-based sections
  - reduce default radius, padding, and visual weight
- Tighten form controls:
  - smaller input/select/textarea heights
  - denser label spacing
  - more predictable inline action placement
- Tighten list rows and summary metric blocks for data-heavy screens.

Deliverable:

- A reusable compact visual system with consistent spacing, typography, and section structure.

Acceptance criteria:

- Desktop workspace chrome consumes visibly less vertical and horizontal space.
- Primary screen content starts higher on the page.
- Shared controls look consistent across screens.
- New dense primitives are available before feature-level rewrites begin.

### Phase 1 execution plan

1. Compress shared workspace chrome: app shell spacing, desktop rail, and mobile nav footprint.
   Status: completed on 2026-05-09.
2. Introduce compact page-header and section-header patterns for dense screens.
   Status: completed on 2026-05-09.
3. Tighten shared primitives: card weight, list density, and input/select/textarea sizing.
   Status: completed on 2026-05-09.
4. Normalize global spacing and typography rhythms in `app/globals.css`.
   Status: completed on 2026-05-09.
5. Run verification and record any follow-up cleanup before Phase 2 starts.
   Status: completed on 2026-05-09.

### Phase 1 step 1 notes

Files changed:

- `components/layout/app-shell.tsx`
- `components/layout/app-navigation.tsx`

What changed:

- Reduced outer workspace padding and inter-column gaps.
- Expanded the main content width while shrinking the desktop navigation rail.
- Compressed the desktop brand block and status badges.
- Reduced the mobile top bar height and simplified its copy.
- Reworked the mobile dock into a smaller, tighter navigation control.

Verification completed:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

### Phase 1 steps 2 and 3 notes

Files changed:

- `components/layout/page-header.tsx`
- `components/ui/button.tsx`
- `components/ui/card.tsx`
- `components/ui/input.tsx`
- `components/ui/list.tsx`
- `components/ui/select.tsx`
- `components/ui/textarea.tsx`
- `features/dashboard/components/dashboard-preview.tsx`
- `features/review/components/monthly-review-screen.tsx`

What changed:

- `PageHeader` now supports a denser default layout, optional description copy, and lighter spacing.
- `CardHeader` now exposes density and divider variants so section headers no longer need repeated manual border and padding overrides.
- `Card`, `List`, and `ListRow` were tightened with smaller radii, lighter shadow weight, and denser row spacing.
- `Input`, `Select`, `Textarea`, and `Button` were reduced to a more compact control height.
- Dashboard and monthly review now exercise the new compact header and section density patterns directly instead of relying only on raw utility overrides.

Verification completed:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

Follow-up note:

- A live browser sanity check was attempted after the shared refactor, but browser automation was not available reliably in this environment during this pass. The code-level checks are clean; visual QA should resume once browser tooling is cooperating.

### Phase 1 step 4 notes

Files changed:

- `app/globals.css`
- `components/layout/app-shell.tsx`
- `components/layout/app-navigation.tsx`
- `components/layout/page-header.tsx`
- `components/ui/button.tsx`
- `components/ui/card.tsx`
- `components/ui/input.tsx`
- `components/ui/list.tsx`
- `components/ui/select.tsx`
- `components/ui/textarea.tsx`

What changed:

- Established shared CSS variables for radii, page spacing, card spacing, row spacing, control heights, line heights, mobile dock offsets, and core shadow treatments.
- Tightened default document rhythm globally by reducing scroll padding, normalizing line-height behavior, and shrinking the skip-link footprint.
- Routed the shell, navigation, headers, cards, lists, buttons, and form controls through the new tokens so density is now controlled by a shared system instead of isolated hardcoded values.

Verification completed:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

Verification caveat:

- `npm run typecheck` and `npm run build` should not be run in parallel for this repo because both interact with `.next/types`. Type checking passed when rerun serially after the build.

## Phase 2: Dashboard and Monthly Review

Objective: convert the overview screens from dashboard-card layouts into operational workspaces.

### Dashboard

Target file:

- `features/dashboard/components/dashboard-preview.tsx`

Changes:

- Replace large metric cards with compact stat strips or a denser summary grid.
- Collapse “Needs attention”, “Recent imports”, and “Quick actions” into flatter sections.
- Reduce copy in headers and empty states to one line where possible.
- Keep the most actionable items above the fold.
- Make quick actions secondary to actual status data.

Acceptance criteria:

- User can scan savings, variance, uncategorized count, and active issues without scrolling.
- The page feels like a control surface, not a marketing dashboard.

### Monthly Review

Target file:

- `features/review/components/monthly-review-screen.tsx`

Changes:

- Convert the page to a split desktop layout:
  - top summary strip
  - main category review table/list
  - secondary right rail for overspend, unusual merchants, and uncategorized items
- Keep month selector and key totals sticky or persistently visible where useful.
- Reduce nested containers around every subsection.
- Prioritize the category review table as the central artifact on the page.

Acceptance criteria:

- Category review dominates the screen.
- Side insights remain visible without pushing the main review surface too far down.
- Planned vs actual comparisons are easier to scan row by row.

### Phase 2 execution notes

Status:

- Dashboard refactor completed on 2026-05-09.
- Monthly review structural refactor completed on 2026-05-09.
- Scan-first tightening pass on both screens completed on 2026-05-09.
- Phase 2 code-level verification completed on 2026-05-09.

Files changed:

- `features/dashboard/components/dashboard-preview.tsx`
- `features/review/components/monthly-review-screen.tsx`

What changed:

- Dashboard now behaves like a compact operations surface with a top control strip, tighter summary metrics, a flatter attention queue, and reduced supporting copy.
- Monthly review now uses a persistent top toolbar, a dominant category review table, and a secondary right rail for overspend, unusual merchants, and uncategorized activity.
- Both screens were tightened further after the structural pass by shortening labels, reducing section descriptions, and making row-level content faster to scan.

Verification completed:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

Verification caveats:

- `npm run typecheck` should be run serially with `npm run build` because both interact with `.next/types`.
- A render-level screenshot QA pass was attempted, but Playwright browser launch is blocked in this environment by a macOS permission failure. Phase 2 is code-verified, but still wants a later browser-based visual pass once tooling is available.

## Phase 3: Transactions and Imports

Objective: optimize the highest-interaction screens for speed, density, and minimal clicks.

### Transactions

Target file:

- `features/transactions/components/transactions-screen.tsx`

Changes:

- Rebuild the screen into a desktop split-pane workflow:
  - filters and batch actions in a compact sticky top bar
  - transaction list/table as the primary pane
  - editor/details pane docked beside or below depending on width
- Reduce row height and metadata wrapping.
- Keep category, source, amount, and selection state scannable at a glance.
- Replace large summary cards with a tighter summary strip.
- Prefer inline editing patterns over jumping between isolated blocks.

Acceptance criteria:

- More rows are visible at once on desktop.
- Batch categorize and edit flows require less scrolling.
- The editor does not dominate the screen when the list is the primary task.

### Imports

Target file:

- `features/import/components/imports-screen.tsx`

Changes:

- Split the page into stages that remain visible together on desktop:
  - file/mapping controls
  - import preview table
  - import history rail or lower section
- Keep staged row counts, blocking issues, and ready counts in a compact status strip.
- Make mapping controls denser and less card-driven.
- Keep row corrections and rule-save actions close to the affected row.

Acceptance criteria:

- User can map fields, inspect staged rows, and commit without scrolling through multiple padded sections.
- Import history is accessible without competing with the live staging surface.

### Phase 3 execution notes

Status:

- Transactions structural refactor completed on 2026-05-09.
- Transactions density pass completed on 2026-05-09.
- Imports staged-workspace refactor completed on 2026-05-09.
- Phase 3 cross-screen tuning pass completed on 2026-05-10.
- Phase 3 code-level verification completed on 2026-05-10.
- Browser-based visual QA is still pending because local Playwright browser launch remains blocked in this environment.

Files changed:

- `features/transactions/components/transactions-screen.tsx`
- `features/import/components/imports-screen.tsx`
- `scripts/build-static.mjs`
- `scripts/typecheck.mjs`

What changed:

- Transactions now run as a compact split-pane workspace with a sticky control bar, denser ledger, tighter bulk actions, and a docked editor/snapshot rail.
- Imports now keep upload controls, mapping, staged preview, commit actions, and operational context visible in one desktop workspace instead of stacking padded sections vertically.
- Import history and safety constraints were compressed into a subordinate sticky side rail so the live staging surface stays dominant.
- The final polish pass reduced remaining explanatory copy, tightened empty-state wording, and aligned transaction/import section language so both screens read as the same dense workspace system.
- Typecheck and build wrapper cleanup was hardened so generated `.next/dev/types` artifacts are cleared before verification and `tsconfig.json` can be restored after Next mutates it during local checks.

Verification completed:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

Verification caveat:

- Browser-based visual QA is still blocked in this environment by the existing Playwright/macOS permission failure, so Phase 3 is complete at the code level but still wants a later render-level pass once browser tooling is available.

## Phase 4: Budget Setup, Rules, and Settings

Objective: bring lower-frequency screens into the same dense system.

### Budget Setup

Target file:

- `features/budget/components/budget-setup-screen.tsx`

Changes:

- Prioritize the editable baseline table/form over explanatory sections.
- Keep savings impact visible while editing.
- Flatten import baseline affordances so they do not feel like a separate product surface.

### Rules

Target file:

- `features/rules/components/rules-screen.tsx`

Changes:

- Present rules as a compact management table with inline status and scope.
- Keep create/edit actions near the table instead of separated by large containers.

### Settings

Target file:

- `features/settings/components/settings-screen.tsx`

Changes:

- Compress backup, install, privacy, and reset sections.
- Move from long explanatory blocks to short operational labels.
- Keep destructive actions visually distinct without adding excessive warning chrome.

Acceptance criteria for this phase:

- Every screen uses the same spacing and section language.
- Low-frequency pages still feel efficient and tool-like, not verbose.

### Phase 4 execution notes

Status:

- Budget setup workspace refactor completed on 2026-05-12.
- Budget setup density pass completed on 2026-05-12.
- Rules management workspace refactor completed on 2026-05-12.
- Settings workspace refactor completed on 2026-05-12.
- Phase 4 code-level verification completed on 2026-05-12.

Files changed:

- `features/budget/components/budget-setup-screen.tsx`
- `features/rules/components/rules-screen.tsx`
- `features/settings/components/settings-screen.tsx`

What changed:

- Budget setup now uses a denser baseline workspace with compact plan controls, a dominant category-planning surface, and a sticky side rail for savings context and baseline state.
- The budget category editor was tightened into a more table-like planning surface with per-section subtotals, smaller row treatments, and less repeated helper weight.
- Rules now operate as a management workspace with priority-ordered saved rules as the primary surface and a sticky side rail for create/edit, preview application, and testing.
- Settings now compress preferences, backup/import, install state, privacy/storage, and reset into smaller operational sections with shorter copy and a preserved destructive boundary.

Verification completed:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

Verification caveat:

- Browser-based visual QA is still blocked in this environment by the existing Playwright/macOS permission failure, so Phase 4 is complete at the code level but still wants a later render-level pass once browser tooling is available.

## Phase 5: Polish and cleanup

Objective: remove leftover inconsistencies after the main rewrites land.

Work:

- Remove obsolete oversized spacing and duplicated local metric components.
- Normalize section headers and empty states.
- Normalize badge density and row action patterns.
- Review responsive behavior to avoid mobile stacking explosions.
- Remove any remaining “card inside card” patterns.

### Phase 5 execution notes

Status:

- Cross-screen consistency cleanup completed on 2026-05-15.
- Final responsive and verification cleanup completed on 2026-05-15.
- Phase 5 code-level verification completed on 2026-05-15.

Files changed:

- `components/ui/empty-state.tsx`
- `features/dashboard/components/dashboard-preview.tsx`
- `features/review/components/monthly-review-screen.tsx`
- `features/transactions/components/transactions-screen.tsx`
- `features/import/components/imports-screen.tsx`
- `features/budget/components/budget-setup-screen.tsx`
- `features/rules/components/rules-screen.tsx`
- `docs/ui-refactor-plan.md`

What changed:

- Added a shared compact empty-state primitive and replaced repeated one-off empty blocks across the major workspace screens.
- Tightened empty-state copy so the screens read more consistently and with less explanatory weight.
- Reduced responsive risk on smaller screens by disabling sticky top toolbars below `lg` in the transaction and monthly review workspaces.
- Closed the refactor with a full lint, typecheck, test, and build pass.

Verification completed:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

Verification caveat:

- Browser-based visual QA is still blocked in this environment by the existing Playwright/macOS permission failure, so the refactor is complete at the code level but still wants a later render-level pass once browser tooling is available.

## Implementation details

## New primitives to add or revise

- Compact page header
- Section wrapper with divider-based header
- Dense metric strip
- Dense toolbar/filter bar
- Table-like list row pattern
- Docked side panel pattern
- Compact empty state pattern

These should be added in shared components before feature rewrites duplicate their structure.

## Copy reduction rules

- Page descriptions should be removed or reduced to a single functional sentence.
- Empty states should be one sentence unless instructions are required to use the feature.
- Button labels should use direct verbs.
- Avoid repeating “local”, “privacy”, and “offline” copy on every screen unless the state is directly relevant to the action.

## Risks

- A pure visual cleanup without shared primitive changes will create inconsistent density.
- Making forms smaller without revisiting layout could hurt readability.
- Overusing sticky regions can reduce usable height on smaller laptops.
- Compressing mobile too aggressively can create tap-target regressions.

## Verification plan

Run after each phase:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Run when browser automation is stable locally:

```bash
npm run e2e
npm run e2e:pwa
```

Manual QA focus:

- Desktop at common laptop widths
- Mobile navigation density
- Transaction editing flow
- Statement import flow
- Monthly review scanning speed
- Settings backup/reset clarity

## Recommended execution order

1. Foundation primitives and shell
2. Dashboard
3. Monthly review
4. Transactions
5. Imports
6. Budget setup
7. Rules
8. Settings
9. Polish and consistency pass

## Definition of done

The refactor is complete when:

- The app feels like a compact financial workspace rather than a spacious dashboard.
- Critical actions and data are visible higher in the viewport across all major screens.
- Repeated card-heavy and copy-heavy patterns are removed.
- Desktop density improves without making mobile chaotic.
- Shared primitives, not one-off screen tweaks, define the UI system.
