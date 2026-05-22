#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
cd "$REPO_ROOT"

title() {
  printf "\n"
  printf "%s\n" "============================================================"
  printf "%s\n" " SocketLens - Web Mode"
  printf "%s\n" " Browser/Vite development workspace"
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

printf "%s\n" "[mode] Web mode"
printf "%s\n" "[command] npm run dev"
printf "%s\n" "[url] http://127.0.0.1:1420/"
printf "\n%s\n\n" "SocketLens will run in your browser. Rust is not required for this mode."

npm run dev
