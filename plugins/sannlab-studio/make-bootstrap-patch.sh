#!/bin/bash
# make-bootstrap-patch.sh — bangun ulang
#   f-droid-patches/bootstrap-patches/sannlab-tools-package.patch
# dari sumber kanonis di sannlab-tools/src/.
#
# Patch ini menambahkan paket `sannlab-tools` ke termux-packages saat
# generator berjalan dengan --plugin sannlab-studio. Jalankan skrip ini
# setiap kali file di sannlab-tools/src/ berubah, lalu commit patch-nya.
set -euo pipefail
cd "$(dirname "$0")"
PLUGIN_DIR="$(pwd)"
PATCH_OUT="$PLUGIN_DIR/f-droid-patches/bootstrap-patches/sannlab-tools-package.patch"
mkdir -p "$(dirname "$PATCH_OUT")"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/packages/sannlab-tools/files/presets"
cp sannlab-tools/build.sh "$TMP/packages/sannlab-tools/build.sh"
cp sannlab-tools/src/sannlab    "$TMP/packages/sannlab-tools/files/sannlab"
cp sannlab-tools/src/sannlab.js "$TMP/packages/sannlab-tools/files/sannlab.js"
cp sannlab-tools/src/sannlab.sh "$TMP/packages/sannlab-tools/files/sannlab.sh"
cp sannlab-tools/src/presets/*.properties "$TMP/packages/sannlab-tools/files/presets/"

cd "$TMP"
git init -q .
git add -A
git diff --cached > "$PATCH_OUT"
echo "Patch ditulis: $PATCH_OUT ($(wc -l < "$PATCH_OUT") baris)"
