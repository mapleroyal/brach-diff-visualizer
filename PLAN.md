# Canonical shadcn v4 Theming Migration (with `globals.css`)

## Summary

Reshape the renderer to the exact shadcn/Tailwind v4 theming idiom: semantic CSS variables in `globals.css`, `@theme inline` mappings, standard slate token set, global `System/Light/Dark` theme mode, and simplified chart color strategy (`chart-1..chart-5` + treemap red↔green gradient).

## Implementation

1. **Adopt canonical stylesheet convention**

- Rename `/Users/user1/Desktop/diff visualizer/src/renderer/src/index.css` to `/Users/user1/Desktop/diff visualizer/src/renderer/src/globals.css`.
- Update `/Users/user1/Desktop/diff visualizer/src/renderer/src/main.jsx` import to `./globals.css`.
- Update `/Users/user1/Desktop/diff visualizer/components.json`:
  - `tailwind.css` -> `src/renderer/src/globals.css`
  - `tailwind.cssVariables` -> `true`
  - `tailwind.baseColor` -> `slate`
  - `tailwind.config` -> empty for v4 convention.

2. **Migrate to Tailwind v4 setup**

- Upgrade dependencies to Tailwind v4 + `@tailwindcss/vite` + `tw-animate-css`.
- Remove v3-only wiring (`tailwind.config.js`, `postcss.config.mjs`, `tailwindcss-animate`).
- Add Tailwind plugin to renderer Vite config in `/Users/user1/Desktop/diff visualizer/electron.vite.config.js`.

3. **Implement theming exactly per shadcn doc pattern**

- In `/Users/user1/Desktop/diff visualizer/src/renderer/src/globals.css`:
  - `@import "tailwindcss";`
  - `@import "tw-animate-css";`
  - `@custom-variant dark (&:is(.dark *));`
  - Add full slate `:root` and `.dark` token blocks in OKLCH format.
  - Keep standard token family including `--chart-1..--chart-5` (and sidebar tokens for convention completeness).
  - Add `@theme inline` mappings for semantic colors/radius.
  - Keep base layer rules for app height, border, background, and text.
- Remove hardcoded `class="dark"` from `/Users/user1/Desktop/diff visualizer/src/renderer/index.html`.

4. **Add global theme preference (System/Light/Dark)**

- Add `next-themes` provider component (renderer-only, localStorage-backed).
- Wrap app root in provider from `/Users/user1/Desktop/diff visualizer/src/renderer/src/main.jsx`.
- Extend `/Users/user1/Desktop/diff visualizer/src/renderer/src/components/dashboard/AnalysisSettingsDialog.jsx` with theme mode select:
  - `System`, `Light`, `Dark`.
- Persist via localStorage key (global, not repo-scoped).

5. **Standardize chart color usage**

- Reduce palette usage to `chart-1..chart-5`.
- Replace ad-hoc `hsl(var(--...))` strings and arbitrary color classes in:
  - `/Users/user1/Desktop/diff visualizer/src/renderer/src/components/dashboard/ChartPanel.jsx`
  - `/Users/user1/Desktop/diff visualizer/src/renderer/src/components/dashboard/StatCards.jsx`
- Centralize chart color helpers in a single renderer lib module.
- Treemap uses a programmatic green→red spectrum derived from semantic tokens.

## Public Interface / Behavior Changes

- New user-facing theme mode control in settings (`System/Light/Dark`).
- Theme preference stored globally in localStorage (not per repo).
- No main-process IPC contract change required.

## Tests and Validation

1. Run `npm run lint`, `npm run test`, `npm run build`.
2. Add/update renderer tests to verify:

- Theme mode options render and change class state.
- `System` follows OS preference.
- Theme preference persists across reload.

3. Add regression checks:

- No remaining renderer `hsl(var(--...))` hardcoded theme expressions.
- No `chart-6+` references.
- Light/dark readability for cards/charts/treemap.

## Assumptions

- We follow the shadcn theming doc structure as the source of truth.
- `globals.css` path is renderer-local (`src/renderer/src/globals.css`) to match your Electron/Vite layout.
- Slate is the selected base color system.
