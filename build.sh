#!/usr/bin/env bash
# Packs src/ into dist/gta6-spoiler-shield.zip (Chrome) and .xpi (Firefox).
set -euo pipefail
cd "$(dirname "$0")"
version=$(python3 -c 'import json;print(json.load(open("src/manifest.json"))["version"])')
mkdir -p dist
rm -f dist/*.zip dist/*.xpi
(cd src && zip -qr -X "../dist/gta6-spoiler-shield-$version.zip" . -x '.*')
cp "dist/gta6-spoiler-shield-$version.zip" "dist/gta6-spoiler-shield-$version.xpi"
ls -1 dist
