# Scripts

This folder contains repository maintenance scripts used by root `package.json`.

Run the npm scripts from the repository root instead of calling these files directly.

| File | Used by | Purpose |
| --- | --- | --- |
| `clean.mjs` | `npm run clean` | Removes generated build output. |
| `encoding-audit.mjs` | `npm run encoding:check` | Checks tracked text files for encoding problems. |
| `lint.mjs` | `npm run lint` | Runs lightweight repository hygiene checks. |
| `release-prepare.mjs` | `npm run release:prepare` | Validates release metadata and required release files. |

Branded launch helpers live in `launchers/`:

- `launchers/install-windows.bat`
- `launchers/install-unix.sh`
- `launchers/start-web.bat` / `launchers/start-web.sh`
- `launchers/start-desktop.bat` / `launchers/start-desktop.sh`
- `launchers/start-echo-server.bat` / `launchers/start-echo-server.sh`
- `launchers/generate-shortcuts.bat`
