#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
cd "$REPO_ROOT"

title() {
  printf "\n"
  printf "%s\n" "============================================================"
  printf "%s\n" " SocketLens - Echo Server"
  printf "%s\n" " Local WebSocket endpoint for testing"
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

printf "%s\n" "[mode] Local echo server"
printf "%s\n" "[command] npm run dev:echo"
printf "%s\n" "[url] ws://127.0.0.1:17787"
printf "\n%s\n\n" "Use this URL in SocketLens Direct Mode or as a Proxy Mode target."

npm run dev:echo
