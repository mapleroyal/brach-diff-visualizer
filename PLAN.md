# Unified Rewrite Plan: Orchestration, Panel System, and Analysis Engine

## Summary

This plan rewrites the three highest-leverage areas in one end-to-end implementation pass:

1. Renderer orchestration is decomposed into focused hooks/services so `/Users/user1/Desktop/diff visualizer/src/renderer/src/App.jsx` becomes declarative UI composition.
2. Panel/chart rendering becomes schema-driven so panel metadata and rendering logic are centrally defined instead of manually synchronized.
3. Analysis refresh/signature flow is replaced with a single cached analysis polling service in main process, eliminating duplicated diff parsing paths.

The implementation preserves current product behavior while reducing coupling, duplicated logic, and repeated Git work.

## Confirmed Decisions

1. Rollout strategy: single end-to-end implementation pass (no phased compatibility shims required).
2. Renderer boundary: use a typed service layer in renderer, with `window.api` isolated in one adapter.
3. Cache strategy: in-memory LRU cache in main process (no disk persistence).

## Implementation Plan

### 1. Introduce shared contracts and a renderer service boundary

1. Add `/Users/user1/Desktop/diff visualizer/src/shared/ipcContracts.js` with Zod schemas for:
   - Analysis request payload.
   - Analysis poll response payload.
   - Repo settings payload.
2. Add `/Users/user1/Desktop/diff visualizer/src/renderer/src/services/desktopClient.js`:
   - Single `invoke` wrapper that unwraps `{ ok, data, error }` and throws typed errors.
   - Client methods: `pickRepo`, `listBranches`, `loadSettingsForRepo`, `saveSettingsForRepo`, `pollAnalysis`, `exportJson`.
3. Refactor renderer code to call `desktopClient` only; remove direct `window.api` usage from components/hooks.

### 2. Replace duplicated analysis endpoints with one cached polling service

1. Add `/Users/user1/Desktop/diff visualizer/src/main/git/analysisService.js` with class `AnalysisService`.
2. Move analysis workflow into reusable stages inside service:
   - Validate request.
   - Resolve refs and compare target.
   - Read diff outputs once (`--numstat`, `--name-status`).
   - Parse rows once per signature.
   - Build filtered file list + summary + datasets.
3. Implement two LRU caches:
   - Snapshot cache (parsed diff context keyed by request core + signature), max 24 entries.
   - Result cache (snapshot + ignore-pattern signature), max 48 entries.
4. Expose `poll(request, previousSignature)` returning:
   - `{ signature, changed: false }` when unchanged.
   - `{ signature, changed: true, result }` when new or changed.
5. Keep ignore matching semantics identical to current behavior.
6. Keep comparison mode semantics identical to current behavior.

### 3. Update Electron IPC and preload surface

1. In `/Users/user1/Desktop/diff visualizer/electron/main.js`:
   - Remove handlers for `analysis:run` and `analysis:getSignature`.
   - Add `analysis:poll` handler backed by `AnalysisService.poll`.
2. In `/Users/user1/Desktop/diff visualizer/electron/preload.js`:
   - Remove `runAnalysis` and `getAnalysisSignature`.
   - Add `pollAnalysis(request, previousSignature)`.
3. Keep existing channels for repo pick, branch list, settings load/save, and export JSON.

### 4. Rewrite renderer orchestration into focused hooks

1. Add `/Users/user1/Desktop/diff visualizer/src/renderer/src/hooks/useRepoWorkspace.js`:
   - Owns repo path, branches, branch selections, mode, compare source, ignore patterns, panel order, orientation, hydration state.
   - Handles repo load/refresh and branch resolution.
2. Add `/Users/user1/Desktop/diff visualizer/src/renderer/src/hooks/usePersistedRepoSettings.js`:
   - Persists hydrated settings with 200ms debounce.
3. Add `/Users/user1/Desktop/diff visualizer/src/renderer/src/hooks/useAnalysisPoller.js`:
   - Polls `desktopClient.pollAnalysis` every 1000ms.
   - Tracks `signature`, `analysis`, `isLoading`, and error state.
   - Removes current `refreshCounter` and `analysisSignatureRef` complexity.
4. Refactor `/Users/user1/Desktop/diff visualizer/src/renderer/src/App.jsx`:
   - Compose hooks and pass state/actions to presentational components.
   - Keep dialog visibility and top-level notice/error display.
   - Preserve UI behavior and control semantics.

### 5. Convert chart/panel rendering to schema-driven composition

1. Extend `/Users/user1/Desktop/diff visualizer/src/shared/panels.js` so each panel includes a plain-data visualization schema:
   - `chartType`.
   - `datasetKey`.
   - `emptyStateLabel`.
   - Rendering options needed by generic renderer.
2. Add `/Users/user1/Desktop/diff visualizer/src/renderer/src/components/dashboard/chartRenderers.jsx` with generic renderer implementations by `chartType`.
3. Refactor `/Users/user1/Desktop/diff visualizer/src/renderer/src/components/dashboard/ChartPanel.jsx` to:
   - Resolve panel definition from shared schema.
   - Resolve dataset by `datasetKey`.
   - Dispatch to generic chart renderer by `chartType`.
4. Keep `VisualizationToggleRail` and `SnapCanvas` consuming the same shared panel definitions to avoid split sources of truth.

### 6. Testing and verification

1. Add `/Users/user1/Desktop/diff visualizer/tests/main/analysisService.test.js`:
   - First poll returns changed + result.
   - Same signature poll returns unchanged without rebuilding result.
   - Different ignore patterns reuse snapshot and produce correct filtered results.
   - LRU eviction behavior.
   - Error paths for invalid working-tree branch conditions.
2. Update `/Users/user1/Desktop/diff visualizer/tests/renderer/fixtures.js` and `/Users/user1/Desktop/diff visualizer/tests/renderer/testUtils.jsx` for new `pollAnalysis` API.
3. Update `/Users/user1/Desktop/diff visualizer/tests/renderer/App.interactions.test.jsx` to validate poll-driven refresh behavior.
4. Add `/Users/user1/Desktop/diff visualizer/tests/renderer/panelSchema.test.js`:
   - Every panel id resolves to valid schema.
   - Every `chartType` maps to an implemented renderer.
   - Dataset key presence/empty-state behavior.
5. Run full verification:
   - `npm run lint`
   - `npm test`
   - `npm run build`

## Important API/Interface Changes

1. Preload API change in `/Users/user1/Desktop/diff visualizer/electron/preload.js`:
   - Removed: `runAnalysis(request)`, `getAnalysisSignature(request)`.
   - Added: `pollAnalysis(request, previousSignature)`.
2. IPC channel change in `/Users/user1/Desktop/diff visualizer/electron/main.js`:
   - Removed: `analysis:run`, `analysis:getSignature`.
   - Added: `analysis:poll`.
3. Poll response contract:
   - `signature: string`
   - `changed: boolean`
   - `result?: AnalysisResult` (present only when `changed` is true).
4. Renderer architecture:
   - Components stop calling `window.api` directly and depend on `desktopClient` interface.

## Test Cases and Scenarios

1. Repository selection loads branches/settings and resolves default branch pair exactly as today.
2. Polling updates analysis on initial load and when signature changes.
3. Polling does not rerender analysis payload on unchanged signatures.
4. Compare mode/source behavior remains identical for merge-base, tip-to-tip, and working-tree checks.
5. Ignore pattern behavior remains identical, including dotfiles and nested patterns.
6. Panel toggling/orientation behavior remains identical with schema-driven charts.
7. Export JSON still exports current in-memory analysis payload with unchanged structure.

## Assumptions and Defaults

1. Single-pass implementation is acceptable; no intermediate compatibility layer is required.
2. Backward compatibility for removed internal IPC methods is out of scope.
3. Auto-refresh interval remains 1000ms.
4. In-memory LRU limits default to 24 snapshots and 48 derived results.
5. No disk cache is implemented.
6. Existing visual design and user-facing feature set are preserved; this is an architecture simplification rewrite, not a product redesign.
