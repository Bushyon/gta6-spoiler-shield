<div align="center">

<img src="src/icons/128.png" width="96" alt="GTA 6 Spoiler Shield icon">

# GTA 6 Spoiler Shield

**Dodge GTA 6 spoilers across the web.** A small, local-only browser extension for Firefox and Chrome
that blurs or hides anything about GTA 6 until you've played it.

[**🧪 Test page**](https://bushyon.github.io/gta6-spoiler-shield/) &nbsp;·&nbsp;
[**⬇️ Download**](https://github.com/Bushyon/gta6-spoiler-shield/releases/latest) &nbsp;·&nbsp;
[**🛠️ Install**](#install) &nbsp;·&nbsp;
[**⚙️ Settings**](#tweaking)

<br>

<img src="https://github.com/user-attachments/assets/0c55977c-0c74-4646-9ae8-4becc4e10324" width="900" alt="YouTube search results with every GTA 6 video blurred">
<br><sub>YouTube with the shield on: every GTA 6 video is blurred, everything else stays visible.</sub>

</div>

## Features

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

## Screenshots

<div align="center">

<img src="https://github.com/user-attachments/assets/fb873045-4afd-4b89-9bfb-0e45a8665bf9" width="640" alt="Full-page cover shown on a page about GTA 6">
<br><sub>Page guard: pages that are about GTA 6 get covered until you choose to see them.</sub>

<br><br>

<table>
  <tr>
    <td align="center" valign="top">
      <img src="https://github.com/user-attachments/assets/48907c3e-3637-4271-8c9b-f829e64c8c27" width="320" alt="Toolbar popup">
      <br><sub>Toolbar popup: on/off switch, per-site pause, blocked count</sub>
    </td>
    <td align="center" valign="top">
      <img src="https://github.com/user-attachments/assets/aa1f4fe4-4491-451c-a9d7-0438302745e8" width="320" alt="Settings page">
      <br><sub>Settings: editable keywords, blur or hide, paused sites</sub>
    </td>
  </tr>
</table>

</div>

## Try it

**Test page:** <https://bushyon.github.io/gta6-spoiler-shield/>. It's full of *fake* GTA 6 headlines,
so nothing gets spoiled. The page checks itself and tells you whether the shield caught everything.

**Bonus:** with the extension installed, come back to this repo. The shield blocks its own GitHub
page, because the page mentions GTA 6 constantly. That's a feature. Click **Let me in, I trust you**
to read it.

## Download

Grab the latest `-chrome.zip` or `-firefox.xpi` from
[**Releases**](https://github.com/Bushyon/gta6-spoiler-shield/releases/latest). Or clone the repo:
`src/` loads directly in Chrome, and `./build.sh` builds the Firefox package into `dist/`.

## Install

### Chrome / Chromium / Edge / Brave
1. Unzip the release `-chrome.zip` (or clone the repo).
2. Go to `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and pick the unzipped folder (or `src/`).

It stays installed across restarts. After editing files, click the reload icon on the card.

### Firefox
Release Firefox only allows **signed** add-ons to stay installed permanently. You have three options:

1. **Temporary (simplest, until Firefox restarts):** go to `about:debugging#/runtime/this-firefox`,
   click **Load Temporary Add-on…**, and pick the release `-firefox.xpi` (or `dist/firefox/manifest.json`
   after running `./build.sh`). Don't load `src/` in Firefox: it has Chrome's manifest.
2. **Permanent, unsigned:** this needs Firefox Developer Edition, Nightly, ESR or an unbranded build.
   Set `xpinstall.signatures.required` to `false` in `about:config`, then drag the
   `-firefox.xpi` into Firefox. Some distro builds also honour this pref.
3. **Permanent, self-signed:** this needs a free addons.mozilla.org account. Get API keys at
   <https://addons.mozilla.org/developers/addon/api/key/>, then run:
   ```sh
   ./build.sh && npx web-ext sign --source-dir dist/firefox --channel unlisted --api-key=... --api-secret=...
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
  manifest.json   MV3 manifest (Chrome; build.sh derives the Firefox one)
  common.js       defaults and keyword → regex matcher (shared)
  content.js      DOM scanning, blurring, page overlay, MutationObserver
  shield.css      blur and hide styles
  background.js   toolbar badge counter, opens settings on first install
  popup.*         toolbar popup
  options.*       settings page
docs/index.html   test page (GitHub Pages)
build.sh          builds dist/chrome + -chrome.zip and dist/firefox + -firefox.xpi
```

## Contributing

Spotted a spoiler that got through? Open an issue with the site and, if you can, the element
that should have been caught. PRs that add keywords or site-specific containers are very welcome.

## License

MIT. This is a fan-made tool and is not affiliated with or endorsed by Rockstar Games or
Take-Two Interactive. "Grand Theft Auto" and "GTA" are trademarks of their respective owners.
