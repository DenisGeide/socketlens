#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
cd "$REPO_ROOT"

fail() {
  printf "%s\n" "[error] $1"
  if [ "${2:-}" ]; then
    printf "%s\n" "        $2"
  fi
  exit 1
}

printf "\n"
printf "%s\n" "============================================================"
printf "%s\n" " SocketLens - Install Dependencies"
printf "%s\n" " npm workspace setup for web, desktop, and examples"
printf "%s\n" "============================================================"
printf "\n"

[ -f "package.json" ] || fail "Repository root was not found." "Keep this file inside the launchers folder."

command -v node >/dev/null 2>&1 || fail "Node.js was not found." "Install Node.js 20.19+ or 22.12+ first."
command -v npm >/dev/null 2>&1 || fail "npm was not found." "Install npm 10+ with Node.js first."

if ! command -v cargo >/dev/null 2>&1; then
  printf "%s\n" "[warning] Rust/Cargo was not found."
  printf "%s\n" "          Web mode and the echo server will work. Desktop mode and Proxy Mode need Rust/Cargo plus Tauri prerequisites."
else
  printf "%s\n" "[ok] Rust/Cargo found for desktop mode."
fi

printf "\n%s\n\n" "[command] npm install"
npm install

printf "\n%s\n\n" "[ok] SocketLens dependencies installed."
printf "%s\n" "Next:"
printf "%s\n" "  sh ./launchers/start-web.sh          - browser development mode"
printf "%s\n" "  sh ./launchers/start-echo-server.sh  - local WebSocket echo server"
printf "%s\n" "  sh ./launchers/start-desktop.sh      - native Tauri desktop mode"
