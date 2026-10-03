#!/usr/bin/env bash
cd -- "$(dirname -- "${BASH_SOURCE[0]}")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo 'Please install Node.js 24 LTS from https://nodejs.org first.'
  echo 'Then close this window and run start-local.command again.'
  read -r -p 'Press Enter to close.'
  exit 1
fi
node scripts/local-dev.mjs
local_result=$?
if [ "$local_result" -ne 0 ]; then
  read -r -p 'Press Enter to close.'
fi
exit "$local_result"
