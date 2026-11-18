# GTA 6 Spoiler Shield

A small, local-only browser extension (Firefox + Chrome, Manifest V3) that blurs or hides anything
about GTA 6 on any website, so you can dodge spoilers until you've played it.

<img width="410" height="379" alt="image" src="https://github.com/user-attachments/assets/48907c3e-3637-4271-8c9b-f829e64c8c27" />

- **Blurs the whole card**, thumbnail included, on YouTube, Reddit, X, Google and Twitch, and the
  nearest list item, article, heading or paragraph everywhere else.
- **Checks text and hidden text**: visible text, image `alt` text, link URLs (`/news/gta-6-review`),
  `aria-label`/`title`, and Reddit's `post-title`.
- **Page guard**: if the page title or URL is about GTA 6 (a YouTube video, a wiki page, an `r/GTA6`
  page), the whole page is covered and videos are paused until you choose **Show anyway**.
- **Click a blurred item to reveal it.** You can also switch to hide mode, which removes matches
  completely.
- **Keeps up with endless scroll and single-page-app navigation**, and un-blurs items that a site
  reuses for other content.
- **Badge counter** on the toolbar icon, a per-site pause switch in the popup, and an editable
  keyword list with regex support in the settings.
- No network requests, analytics or accounts. Settings are stored in `storage.sync`.

## Download

Grab the latest `.zip` (Chrome) or `.xpi` (Firefox) from
[**Releases**](https://github.com/Bushyon/gta6-spoiler-shield/releases/latest), or clone the repo and use `src/`.

## Install

### Chrome / Chromium / Edge / Brave
1. Unzip the release `.zip` (or clone the repo).
2. Go to `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and pick the unzipped folder (or `src/`).

It stays installed across restarts. After editing files, click the reload icon on the card.

### Firefox
Release Firefox only allows **signed** add-ons to stay installed permanently. You have three options:

1. **Temporary (simplest, until Firefox restarts):** go to `about:debugging#/runtime/this-firefox`,
   click **Load Temporary Add-on…**, and pick `src/manifest.json`.
2. **Permanent, unsigned:** this needs Firefox Developer Edition, Nightly, ESR or an unbranded build.
   Set `xpinstall.signatures.required` to `false` in `about:config`, run `./build.sh`, then drag
   `dist/*.xpi` into Firefox. Some distro builds also honour this pref.
3. **Permanent, self-signed:** this needs a free addons.mozilla.org account. Get API keys at
   <https://addons.mozilla.org/developers/addon/api/key/>, then run:
   ```sh
   npx web-ext sign --source-dir src --channel unlisted --api-key=... --api-secret=...
   ```
   An *unlisted* add-on is signed but never published on the store. Install the `.xpi` it produces.

**After installing in Firefox:** Firefox treats "access all sites" as opt-in for MV3 extensions. The
settings page opens on install with a **Grant access** button, and the popup shows the same button.
You can also grant it from `about:addons` → the extension → **Permissions**.

## Tweaking

Open the popup and choose **Keywords & settings**.

- Keywords are case-insensitive. A space also matches `-`, `_`, `.`, `+` or no space, so `GTA 6`
  catches `gta-6`, `GTA6` and `?q=gta+6`. Word boundaries are respected, so `GTA 6` doesn't hit
  `GTA 60fps`.
- To use a regex, wrap the line in slashes: `/\bvice\s*city\b/`.
- The defaults include place and character names. Remove broad ones like `Rockstar Games` or
  `Vice City` if they catch too much.

## Layout

```
src/
  manifest.json   MV3 manifest that works in both browsers
  common.js       defaults and keyword → regex matcher (shared)
  content.js      DOM scanning, blurring, page overlay, MutationObserver
  shield.css      blur and hide styles
  background.js   toolbar badge counter, opens settings on first install
  popup.*         toolbar popup
  options.*       settings page
build.sh          zips src/ into dist/ (.zip for Chrome, .xpi for Firefox)
```

## Contributing

Spotted a spoiler that got through? Open an issue with the site and, if you can, the element
that should have been caught. PRs that add keywords or site-specific containers are very welcome.

## License

MIT. This is a fan-made tool and is not affiliated with or endorsed by Rockstar Games or
Take-Two Interactive. "Grand Theft Auto" and "GTA" are trademarks of their respective owners.
