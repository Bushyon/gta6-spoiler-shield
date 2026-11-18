#!/usr/bin/env bash
# Builds browser-specific packages from src/:
#   dist/chrome/   + dist/gta6-spoiler-shield-<v>-chrome.zip   (src/manifest.json as-is)
#   dist/firefox/  + dist/gta6-spoiler-shield-<v>-firefox.xpi  (Firefox background + gecko keys)
# Chrome warns about Firefox-only manifest keys and vice versa, so each gets its own manifest.
set -euo pipefail
cd "$(dirname "$0")"
version=$(python3 -c 'import json;print(json.load(open("src/manifest.json"))["version"])')
rm -rf dist && mkdir -p dist/chrome dist/firefox
cp -r src/. dist/chrome/
cp -r src/. dist/firefox/
python3 - dist/firefox/manifest.json <<'PY'
import json, sys
p = sys.argv[1]
m = json.load(open(p))
m["background"] = {"scripts": ["background.js"]}
m["browser_specific_settings"] = {
    "gecko": {
        "id": "gta6-spoiler-shield@local",
        "strict_min_version": "128.0",
        "data_collection_permissions": {"required": ["none"]},
    }
}
json.dump(m, open(p, "w"), indent=2, ensure_ascii=False)
PY
(cd dist/chrome && zip -qr -X "../gta6-spoiler-shield-$version-chrome.zip" . -x '.*')
(cd dist/firefox && zip -qr -X "../gta6-spoiler-shield-$version-firefox.xpi" . -x '.*')
ls -1 dist
