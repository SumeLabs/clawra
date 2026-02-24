#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec npx ts-node --compiler-options '{"module":"commonjs"}' "${SCRIPT_DIR}/clawra-selfie.ts" "$@"
