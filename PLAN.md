## Housekeeping + Compatibility Purge Audit Plan

### Summary

This cleanup will aggressively remove backwards-compatibility code paths and dead surface area while preserving behavior for the current app model.  
Primary targets discovered in audit:

1. Legacy renderer IPC fallback still exists and calls non-existent old channels (`analysis:getSignature`, `analysis:run`) in `/Users/user1/Desktop/diff visualizer/src/renderer/src/services/desktopClient.js:102`.
2. Settings persistence performs shape-coercion/migration-style sanitization (old-data compatibility) in `/Users/user1/Desktop/diff visualizer/src/main/persistence/settingsStore.js:27`.
3. Redundant fallback logic remains downstream (`settings.canvasOrientation || DEFAULT...`) in `/Users/user1/Desktop/diff visualizer/src/renderer/src/hooks/useRepoWorkspace.js:103`.
4. Several exports are unused and inflate API surface.
5. Low-value annotation artifacts exist (`/* @__PURE__ */`) in `/Users/user1/Desktop/diff visualizer/src/main/git/aggregators.js:95`.

### Implementation Plan

1. Remove legacy IPC compatibility path

- Edit `/Users/user1/Desktop/diff visualizer/src/renderer/src/services/desktopClient.js`.
- Delete `isMissingPollHandlerError` and `pollWithLegacyApi`.
- Simplify `pollAnalysis` to a single `analysis:poll` invoke path; do not attempt old handlers/methods.
- Keep `DesktopClientError` and `invoke` internal; stop exporting them.

2. Remove settings-shape migration/sanitization behavior

- Edit `/Users/user1/Desktop/diff visualizer/src/main/persistence/settingsStore.js`.
- Delete `sanitizePanelOrder`, `sanitizeIgnorePatterns`, `sanitizeMode`, `sanitizeCompareSource`, and `ensureSettings`.
- Keep only:
  - explicit default settings factory for first-time repo initialization.
  - strict schema validation (`repoSettingsSchema.parse`) for load/save.
- `loadForRepo` behavior:
  - if repo has no stored entry: write defaults and return defaults.
  - if entry exists: parse strictly and return parsed value (no coercion/fallback).
- `saveForRepo` behavior:
  - parse strictly and persist as-is.

3. Tighten shared settings schema invariants (single source of truth)

- Edit `/Users/user1/Desktop/diff visualizer/src/shared/ipcContracts.js`.
- Update `repoSettingsSchema.panelOrder` to enforce max active panel count (`MAX_ACTIVE_PANELS`) and uniqueness.
- Remove unused export `analysisSummarySchema`.
- This centralizes panel invariants and removes need for compatibility trimming elsewhere.

4. Remove now-redundant renderer fallbacks

- Edit `/Users/user1/Desktop/diff visualizer/src/renderer/src/hooks/useRepoWorkspace.js`.
- Remove `settings.panelOrder.slice(0, MAX_ACTIVE_PANELS)` and assign schema-validated `settings.panelOrder` directly.
- Remove `settings.canvasOrientation || DEFAULT_CANVAS_ORIENTATION`; assign validated value directly.
- Stop exporting helper functions `resolveBranchSelection` and `resolveDefaultBaseBranch` unless tests are added to use them.

5. Trim unused exports and dead API surface

- Edit:
  - `/Users/user1/Desktop/diff visualizer/src/main/git/analysisService.js` (remove export of `DEFAULT_RESULT_CACHE_LIMIT`, `DEFAULT_SNAPSHOT_CACHE_LIMIT`)
  - `/Users/user1/Desktop/diff visualizer/src/main/git/gitAnalyzer.js` (remove export of `createDiffArgs`, `matchesIgnorePattern`)
  - `/Users/user1/Desktop/diff visualizer/src/renderer/src/components/dashboard/ChartPanel.jsx` (remove `EmptyState` export)
  - `/Users/user1/Desktop/diff visualizer/src/renderer/src/components/ui/button.jsx` (remove `buttonVariants` export)
  - `/Users/user1/Desktop/diff visualizer/src/renderer/src/hooks/useAnalysisPoller.js` (remove exported `AUTO_REFRESH_INTERVAL_MS`)
  - `/Users/user1/Desktop/diff visualizer/src/renderer/src/hooks/usePersistedRepoSettings.js` (remove exported `SETTINGS_PERSIST_DEBOUNCE_MS`)
  - `/Users/user1/Desktop/diff visualizer/src/renderer/src/lib/chartColors.js` (remove `resolveThemeColor` export)
- Keep behavior unchanged; this is surface-area cleanup only.

6. Remove low-value annotation artifacts

- Edit `/Users/user1/Desktop/diff visualizer/src/main/git/aggregators.js`.
- Remove `/* @__PURE__ */` comments on `Map` construction.
- Run formatter on touched files only.

### Public API / Interface / Type Changes

1. `desktopClient` module exports shrink:

- Removed: `DesktopClientError`, `invoke`.
- Kept: `desktopClient`, `getDesktopClientErrorMessage`.

2. `repoSettingsSchema` becomes stricter:

- `panelOrder` constrained by max count and uniqueness.
- Invalid persisted settings are no longer coerced/migrated.

3. Internal helper exports removed:

- Several modules now export only what is consumed by app runtime/tests.

### Test Cases and Scenarios

1. Existing suite regression

- Run `npm run lint`.
- Run `npm run test`.
- Expect all existing tests to pass without behavior changes for valid current data.

2. New targeted tests

- Add `/Users/user1/Desktop/diff visualizer/tests/renderer/desktopClient.test.js`:
  - `pollAnalysis` uses only `analysis:poll` bridge method.
  - missing `pollAnalysis` bridge method throws a single modern error path (no legacy fallback attempts).
- Add `/Users/user1/Desktop/diff visualizer/tests/shared/repoSettingsSchema.test.js`:
  - accepts valid `panelOrder` of size 0-2 with unique IDs.
  - rejects duplicates.
  - rejects more than 2 panels.
  - rejects invalid `canvasOrientation`.

3. Back-compat removal verification checks

- Grep-based assertions in review/CI:
  - no references remain to `analysis:getSignature`, `analysis:run`, `getAnalysisSignature`, `runAnalysis`.
  - no `sanitize*`/`ensureSettings` compatibility functions remain in settings store.

### Assumptions and Defaults

1. Chosen cleanup mode: aggressive removal of old-app compatibility paths.
2. Old/corrupt persisted settings are not migrated; they are treated as invalid input.
3. Current valid app behavior must remain unchanged for active workflows (repo pick, branch selection, polling, panel toggles, export).
4. No backwards compatibility is maintained for previous IPC contracts or previous persisted settings shapes.
