# Branch Diff Visualizer

Branch Diff Visualizer is a desktop Electron app for comparing two Git branches and exploring the diff through visual metrics.

<img width="1612" height="1152" alt="Screenshot 2026-02-20 at 14 01 49" src="https://github.com/user-attachments/assets/0c77f63a-2566-4157-91f9-5ad796f24de4" />
<img width="1612" height="1152" alt="Screenshot 2026-02-20 at 14 01 54" src="https://github.com/user-attachments/assets/6a4062a1-8f40-4542-9621-b5857dcdef5f" />

## Features

- Compare branches in two modes:
  - `merge-base`: compare the merge base to the compare branch
  - `tip-to-tip`: compare branch tips directly
- Choose compare source:
  - `working tree (saved changes)`: include saved local edits on the checked out compare branch
  - `branch tip (committed)`: use committed state only
- Auto-refresh analysis when repository changes are detected
- Visualize diff impact with charts and panels (status, churn, directories, extensions, histograms)
- Configure ignore patterns to filter out noise
- Save settings per repository (branch selection, mode, panel layout, orientation, ignore patterns)
- Configure global app settings (theme + reopen last repository on launch)
- Export analysis results to JSON

## Tech Stack

- Electron + electron-vite
- React
- Recharts
- simple-git

## Requirements

- Node.js 20+
- npm
- Git CLI available on your machine (`git` in PATH)

## Local Development

```bash
npm install
npm run dev
```

In the app:

1. Click the folder button and choose a local Git repository.
2. Select base and compare branches.
3. Choose comparison mode (`Merge Base` or `Tip to Tip`).
4. Tune ignore patterns as needed.
5. Optionally export analysis via `Export JSON`.

## Comparison Notes

- `working-tree` compare source requires the currently checked out branch to match the selected compare branch.
- `working-tree` includes saved local edits, while `branch-tip` only reflects committed history.
- Ignore patterns are applied after diff collection and are persisted per repository.

## Scripts

- `npm run dev`: run the app in development mode
- `npm run build`: build app code into `out/`
- `npm run dist`: create distributables for configured platforms
- `npm run dist:mac`: create macOS distributables (`.dmg`, `.zip`)
- `npm run dist:mac:app`: create an unpacked macOS `.app` bundle
- `npm run preview`: preview a built app
- `npm run test`: run tests
- `npm run test:watch`: run tests in watch mode
- `npm run lint`: run lint checks
- `npm run format`: run Prettier

## Build a macOS `.app`

```bash
npm run dist:mac:app
```

The app bundle is generated under `dist/`, typically:

- Apple Silicon: `dist/mac-arm64/Branch Diff Visualizer.app`
- Intel: `dist/mac/Branch Diff Visualizer.app` (or `dist/mac-x64/`)

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

MIT, see [`LICENSE`](LICENSE).
