# SocketLens Launchers

These scripts are optional convenience launchers. They call the real npm scripts from the repository root and do not replace `package.json`.

`start-web`, `start-echo-server`, and `start-desktop` automatically run `npm install` when `node_modules` is missing. Node.js/npm must already be installed. Desktop mode still requires Rust/Cargo and Tauri platform prerequisites.

## Windows

```bat
launchers\install-windows.bat
launchers\start-web.bat
launchers\start-echo-server.bat
launchers\start-desktop.bat
launchers\generate-shortcuts.bat
```

- `start-web.bat`: starts browser/Vite mode with `npm run dev`.
- `start-echo-server.bat`: starts the local echo server with `npm run dev:echo`.
- `start-desktop.bat`: starts native Tauri mode with `npm run dev:desktop`.
- `install-windows.bat`: installs npm dependencies explicitly before launch.
- `generate-shortcuts.bat`: creates desktop shortcuts with the SocketLens icon.

## macOS/Linux

```bash
sh ./launchers/install-unix.sh
sh ./launchers/start-web.sh
sh ./launchers/start-echo-server.sh
sh ./launchers/start-desktop.sh
```

Web mode and the echo server require Node.js/npm. Desktop mode also requires Rust/Cargo and Tauri platform prerequisites.

If you prefer explicit setup, run the install script first. If you skip it, the start launcher will install npm dependencies on first launch.
