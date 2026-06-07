 # UX/UI Rules

These rules are project-agnostic constraints for building focused, maintainable, and production-quality interfaces. Use them as a default standard for tools, dashboards, editors, workflow apps, and operational products.

## Core Model

- Build the app around the user's primary work object or task.
- The main work surface should be visually dominant.
- The first screen should be usable, not a marketing page, unless the project is explicitly a marketing site.
- Keep setup, editing, processing, and review in one continuous workflow when possible.
- Put controls close to the thing they affect.
- Reveal complexity progressively instead of showing every option at startup.

## Layout

- Use a full-height workspace shell for apps and tools.
- Give the primary work area the largest share of the viewport.
- Keep secondary panels compact and contextual.
- Avoid card-inside-card layouts.
- Use consistent spacing, border radius, and alignment across the whole product.
- Use stable dimensions for toolbars, docks, buttons, counters, cards, and repeated items so UI does not shift during interaction.

## Workflow

- Start with the next obvious action: upload, create, open, select, or connect.
- Show only controls that are useful in the current state.
- Reveal editing tools only after there is something to edit.
- Reveal processing or submit actions only when required inputs are ready.
- Keep the user in context when moving between setup, editing, processing, and review.
- Make steps reversible when practical.
- Design empty, loading, busy, error, success, disabled, and completed states.

## Docks And Toolbars

- Use icon-first docks for high-frequency work-surface actions.
- Put direct object-editing tools on the left side of the work surface.
- Put processing, run, submit, or forward-progress actions on the right side of the work surface.
- On narrow screens, move docks to the top and allow actions to wrap horizontally.
- Keep docks visually light. Avoid wide text-heavy toolbars over the work surface.
- Keep dock actions anchored to the workspace, not to the page scroll position.

## Icon Buttons

- Use square icon buttons with stable dimensions.
- Every icon-only button must have an `aria-label` and tooltip/title.
- Active, disabled, loading, and destructive states must be visually distinct.
- Use accent fill for the primary action.
- Use quiet surface fill and border for secondary tools.
- Use text buttons when the action is final, destructive, rare, or ambiguous as an icon.
- Do not replace top-level tool icons with text buttons unless the workflow clearly benefits from labels.

## Controls

- Use familiar controls:
  - Selects for option sets.
  - Tabs or segmented controls for peer views.
  - Toggles or checkboxes for binary settings.
  - Sliders for visual or continuous adjustments.
  - Steppers for small numeric adjustments.
  - Inputs for precise values.
  - Menus for less common actions.
- Show immediate readouts beside adjustable values.
- Prefer compact grouped rows over tall forms.
- Avoid helper text under routine controls. Improve labels and flow first.
- Validate external or user-provided input and show recoverable errors.

## Settings

- Use compact side sheets or panels for contextual settings.
- Settings surfaces should contain only decision-making inputs and immediate context.
- Do not make settings panels feel like separate apps.
- Keep primary actions visible near the bottom of task-focused sheets.
- Avoid explanatory copy under every setting.
- Do not show advanced options by default unless the product is specifically for expert configuration.

## Review Surfaces

- Treat review output as proof-first, not a diagnostics dump.
- Put the verdict, result, or summary first.
- Show the evidence next: source, preview, comparison, metrics, or selected context.
- Keep supporting lists visually subordinate to the main proof area.
- Show warnings, notes, and recommended actions only when present.
- Keep review in the current workflow instead of opening separate windows for routine inspection.
- Avoid routine desktop scrolling for the primary review path.

## Density

- Favor dense but readable operational layouts.
- Use compact rows, inline facts, and shared sections over stacked full-width blocks.
- Give a section its own block only when it is actionable, visually important, or needed for scanning.
- Keep headings short and functional.
- Use small uppercase labels for metadata and section labels.
- Do not use oversized hero typography inside tools, panels, cards, sidebars, dashboards, or reports.

## Visual Style

- Use a calm, readable theme with subtle surfaces, borders, and shadows.
- Backgrounds should frame the work, not compete with it.
- Use a small semantic color system:
  - Primary text.
  - Muted text.
  - Accent/action.
  - Success.
  - Warning.
  - Danger.
- Use color to clarify state, not as decoration.
- Prefer border contrast and spacing over heavy dividers.
- Keep border radius consistent:
  - Small controls: 10-14px.
  - Panels and sheets: 18-24px.
  - Main work surfaces: 22-28px.
- Avoid decorative blobs, generic gradients, ornamental cards, and visual effects that reduce scan speed.

## Motion

- Use subtle motion only for interaction feedback.
- Button hover may lift slightly or change surface state.
- State changes should feel immediate and stable.
- Do not animate layout in ways that move controls away from the user's pointer.
- Avoid decorative motion that competes with task completion.

## Status And Feedback

- Use compact global status banners for transient messages.
- Put progress indicators near the action or area that started the work.
- Show progress as stages, percentage, or a clear busy state when useful.
- Errors should explain what failed and what the user can do next.
- Busy states must disable actions that would create conflicts.
- Do not hide critical failures in passive copy or logs.

## Navigation

- Keep main task navigation shallow.
- Use side navigation for admin, operations, or multi-section workspaces.
- Use tabs or segmented controls for peer views inside the same task.
- Do not reset active work on route changes unless the user clearly leaves the workflow.
- Use tables for dense operational data.
- Use cards only for repeated items, summaries, modals, or genuinely framed tools.

## Empty States

- Empty states should be immediately actionable.
- Make the whole work surface usable for first actions when appropriate.
- Avoid long feature explanations.
- Show the first action, not a tour.
- Preserve the same layout structure between empty and populated states to reduce visual jumps.

## Accessibility

- Every interactive element must have an accessible name.
- Every icon-only button needs an `aria-label` and tooltip/title.
- Preserve keyboard access for all core actions.
- Do not bind shortcuts while focus is inside an input, select, textarea, button, link, or editable element.
- Support Escape to close temporary panels where appropriate.
- Use visible focus styles for custom interactive surfaces.
- Do not rely on color alone for active, disabled, success, warning, danger, or error states.

## Responsive Behavior

- Keep the same workflow on mobile; only reposition controls.
- Collapse multi-column grids before content becomes cramped.
- Keep action docks and context trays from covering the active object.
- Use stable padding around work surfaces for controls.
- Text must fit inside buttons, chips, cards, tables, and panels at mobile widths.
- Avoid viewport-width font scaling. Use responsive layout, not unpredictable type scaling.

## Anti-Patterns

- No marketing landing page for a tool workflow.
- No permanent full form before the user has an object or task to work on.
- No unlabeled icon buttons.
- No card-inside-card settings panels.
- No diagnostic dumps as the default review surface.
- No decorative UI that slows scanning.
- No hidden critical action states.
- No wide text-heavy toolbars over the work surface.
- No separate preview windows for routine review.
- No layout shifts caused by hover, loading, labels, counters, or dynamic values.

## Implementation Checklist

- The first screen is the real product experience.
- The primary work object or task is visually dominant.
- Controls appear only when useful for the current state.
- Direct editing tools are close to the work object.
- Processing or forward actions are easy to find.
- Icon buttons have stable size, accessible labels, and tooltips.
- Settings are compact and decision-focused.
- Review surfaces are proof-first and compact.
- Responsive behavior preserves the workflow.
- Every important state is designed and testable.
