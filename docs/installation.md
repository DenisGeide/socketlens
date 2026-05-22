# Installation

Purpose: install SocketLens from a fresh clone and understand which prerequisites are needed for browser mode, desktop mode, and Proxy Mode.

## Prerequisites

Browser/web mode requires:

- Node.js `20.19.0+` on the 20.x line, or `22.12.0+`
- npm `10+`
- a modern browser

Desktop/Tauri mode also requires:

- Rust/Cargo
- Tauri OS prerequisites for your platform

Check installed tools:

```bash
node -v
npm -v
rustc --version
cargo --version
```

Rust/Cargo can be missing if you only use browser mode, Demo Mode, Direct Mode, or the echo server.

## Install Dependencies

From the repository root:

```bash
npm install
```

Expected result:

- npm installs all workspaces using `package-lock.json`;
- `node_modules` appears locally;
- no build output needs to be committed.

For CI-like installation:

```bash
npm ci
```

## Start Browser Mode

```bash
npm run dev
```

Expected result:

```text
http://127.0.0.1:1420/
```

Browser mode supports Demo Mode, Direct Mode, the timeline, filters, settings, sessions, and most frontend workflows.

## Start Desktop Mode

```bash
npm run dev:desktop
```

Expected result:

- a native SocketLens desktop window opens;
- native Tauri commands become available;
- Proxy Mode can start the Rust backend.

If desktop mode fails, install Rust/Cargo and Tauri platform prerequisites, then try again.

## Start The Echo Server

```bash
npm run dev:echo
```

Expected result:

```text
ws://127.0.0.1:17787
```

Use this endpoint for Direct Mode testing.

## One-click Launchers

Windows:

```bat
launchers\install-windows.bat
launchers\start-web.bat
launchers\start-echo-server.bat
launchers\start-desktop.bat
```

macOS/Linux:

```bash
sh ./launchers/install-unix.sh
sh ./launchers/start-web.sh
sh ./launchers/start-echo-server.sh
sh ./launchers/start-desktop.sh
```

The start scripts check for `node_modules` and run `npm install` on first launch when dependencies are missing. Node.js/npm must still be installed first.

## Common Install Problems

| Problem | Cause | Fix |
|---|---|---|
| `npm` is not recognized | Node.js/npm is not installed or not on PATH | Install Node.js and reopen the terminal |
| Port `1420` is already in use | Another Vite process is running | Stop the old terminal/process, then run `npm run dev` again |
| Desktop mode fails before opening | Rust/Tauri prerequisites are missing | Install Rust/Cargo and Tauri OS prerequisites |
| Proxy Mode says backend unavailable | Running browser mode | Start `npm run dev:desktop` |

## Related

- [Quickstart](quickstart.md)
- [Getting Started](getting-started.md)
- [Troubleshooting](troubleshooting.md)
- [Development](development.md)

## Next Steps

Run the first demo: [Quickstart](quickstart.md).

