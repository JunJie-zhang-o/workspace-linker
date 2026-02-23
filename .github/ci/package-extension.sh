#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${1:-artifacts}"
VSIX_NAME="${2:-workspace-linker.vsix}"
VSIX_PATH="${OUT_DIR}/${VSIX_NAME}"

mkdir -p "${OUT_DIR}"

# Package extension into a VSIX artifact.
npx --yes @vscode/vsce package --no-yarn --out "${VSIX_PATH}"

echo "${VSIX_PATH}"
