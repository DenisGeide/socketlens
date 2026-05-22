#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
cd "$REPO_ROOT"

title() {
  printf "\n"
  printf "%s\n" "============================================================"
  printf "%s\n" " SocketLens - Desktop Mode"
  printf "%s\n" " Native Tauri app with desktop-only features"
  printf "%s\n" "============================================================"
  printf "\n"
}

fail() {
  printf "%s\n" "[error] $1"
  if [ "${2:-}" ]; then
    printf "%s\n" "        $2"
  fi
  exit 1
}

title

[ -f "package.json" ] || fail "Repository root was not found." "Keep this file inside the launchers folder."
command -v npm >/dev/null 2>&1 || fail "npm was not found." "Install Node.js 20.19+ or 22.12+ with npm 10+."

if [ ! -d "node_modules" ]; then
  printf "%s\n" "[setup] Dependencies are missing."
  printf "%s\n\n" "[setup] Running npm install before launch."
  npm install || fail "npm install failed." "Fix the npm error above, then run this launcher again."
  printf "\n%s\n\n" "[ok] Dependencies installed."
fi

command -v cargo >/dev/null 2>&1 || fail "Rust/Cargo was not found." "Desktop mode, native file dialogs, and Proxy Mode require Rust/Cargo plus Tauri prerequisites."

printf "%s\n" "[mode] Desktop/Tauri mode"
printf "%s\n" "[command] npm run dev:desktop"
printf "%s\n\n" "[native] Proxy Mode and Tauri filesystem dialogs are available here."

npm run dev:desktop
