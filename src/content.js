// GTA 6 Spoiler Shield — content script.
// Finds text/attributes matching the keyword list and blurs (or hides) the
// closest sensible "card" around them. Also shows a full-page overlay when
// the page itself (title/URL) is about GTA 6.
(async () => {
  const S = globalThis.SpoilerShield;
  const MARK = "data-gta-shield"; // "blur" | "hide" | "revealed"
  const ATTRS = ["title", "alt", "aria-label", "post-title", "href"];
  const ATTR_SELECTOR = ATTRS.map((a) => `[${a}]`).join(",");
  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "SELECT", "TEMPLATE", "SVG"]);
  const MAX_CARD_TEXT = 1500;
  const INLINE_TAGS = new Set(["B", "I", "U", "S", "EM", "STRONG", "SPAN", "A", "MARK", "SMALL", "SUB", "SUP", "CODE", "ABBR", "TIME", "FONT", "BDI", "BDO", "Q", "CITE", "DFN", "KBD", "VAR", "WBR", "INS", "DEL"]);

  // Per-site "card" containers: the whole card gets blurred, thumbnail included.
  const SITE_CONTAINERS = [
    [/(^|\.)youtube\.com$/, [
      "ytd-rich-item-renderer", "ytd-video-renderer", "ytd-compact-video-renderer",
      "ytd-grid-video-renderer", "ytd-reel-item-renderer", "ytd-playlist-renderer",
      "ytd-radio-renderer", "ytd-channel-renderer", "ytd-comment-thread-renderer",
      "ytd-comment-view-model", "ytd-post-renderer", "ytd-backstage-post-thread-renderer",
      "ytd-notification-renderer", "ytd-playlist-panel-video-renderer",
      "yt-lockup-view-model", "ytm-shorts-lockup-view-model", "ytm-shorts-lockup-view-model-v2",
      "ytd-compact-radio-renderer", "ytd-movie-renderer",
    ]],
    [/(^|\.)reddit\.com$/, [
      "shreddit-post", "shreddit-comment", "shreddit-ad-post", ".thing",
      "[data-testid='search-post-unit']", "[data-testid='post-container']",
    ]],
    [/(^|\.)(x|twitter)\.com$/, [
      "article[data-testid='tweet']", "[data-testid='trend']", "[data-testid='UserCell']",
    ]],
    [/(^|\.)google\.[a-z.]+$/, [
      ".MjjYud", "div.g", "g-inner-card", "g-section-with-header",
      ".related-question-pair", "[role='listitem']",
    ]],
    [/(^|\.)twitch\.tv$/, ["article", "[data-a-target='preview-card']"]],
  ];
  const GENERIC_CARDS = "article,[role='article'],li,tr,figure";
  const GENERIC_SMALL = "h1,h2,h3,h4,h5,h6,p,blockquote,dd,dt,figcaption,a,td,summary,label,button";

  const host = location.hostname.toLowerCase();
  // Never block the extension's own project page (issues, releases, README).
  const SELF_PAGES = [/^https:\/\/github\.com\/Bushyon\/gta6-spoiler-shield(?:[\/?#]|$)/i];
  const isSelfPage = () => SELF_PAGES.some((re) => re.test(location.href));
  const siteSelector = SITE_CONTAINERS
    .filter(([re]) => re.test(host))
    .flatMap(([, sels]) => sels)
    .join(",");

  let settings = null;
  let matcher = null;
  let active = false;
  const marked = new Set();
  const revealedText = new WeakMap();
  let observer = null;

  // ---------- matching ----------
  const test = (s) => !!s && matcher.test(s);

  function attrsMatch(el) {
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (!v) continue;
      if (a === "href") {
        let decoded = v;
        try { decoded = decodeURIComponent(v); } catch {}
        if (test(decoded)) return true;
      } else if (test(v)) return true;
    }
    return false;
  }

  function containerMatches(el) {
    if (test(el.textContent)) return true;
    if (el.matches(ATTR_SELECTOR) && attrsMatch(el)) return true;
    for (const c of el.querySelectorAll(ATTR_SELECTOR)) if (attrsMatch(c)) return true;
    return false;
  }

  function isSkippable(el) {
    if (!el || SKIP_TAGS.has(el.tagName?.toUpperCase())) return true;
    // Never blur what the user is typing.
    if (el.isContentEditable || el.closest("[contenteditable]:not([contenteditable='false'])")) return true;
    if (el.closest("gta-shield-overlay, head")) return true;
    return false;
  }

  function findContainer(el) {
    if (siteSelector) {
      const c = el.closest(siteSelector);
      if (c) return c;
    }
    const card = el.closest(GENERIC_CARDS);
    if (card && card.textContent.length <= MAX_CARD_TEXT) return card;
    const small = el.closest(GENERIC_SMALL);
    if (small && small !== document.body) return small;
    if (el === document.body || el === document.documentElement) return null;
    return el;
  }

  // ---------- marking ----------
  function mark(el) {
    if (!el || el === document.body || el === document.documentElement) return;
    if (el.hasAttribute(MARK)) return;
    if (el.parentElement?.closest(`[${MARK}="blur"],[${MARK}="hide"]`)) return; // already covered
    el.setAttribute(MARK, settings.mode);
    marked.add(el);
    scheduleReport();
  }

  function unmark(el) {
    el.removeAttribute(MARK);
    marked.delete(el);
    scheduleReport();
  }

  function unmarkAll() {
    for (const el of marked) el.removeAttribute(MARK);
    marked.clear();
    scheduleReport();
  }

  // Elements get recycled by SPAs (YouTube especially): drop marks that no longer apply.
  function recheckMarked() {
    for (const el of marked) {
      if (!el.isConnected) { marked.delete(el); continue; }
      const state = el.getAttribute(MARK);
      if (state === "revealed") {
        if (revealedText.get(el) !== el.textContent) unmark(el);
        continue;
      }
      if (!containerMatches(el)) unmark(el);
    }
  }

  function scan(root) {
    if (!root || !root.isConnected) return;
    if (root.nodeType === Node.TEXT_NODE) root = root.parentElement;
    if (!root || root.nodeType !== Node.ELEMENT_NODE || isSkippable(root)) return;

    // Text
    const text = root.textContent;
    if (test(text)) {
      const tested = new Set();
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (!node.data.trim()) continue; // whitespace between list items etc.
        let p = node.parentElement;
        if (!p || isSkippable(p) || p.closest(`[${MARK}]`)) continue;
        if (test(node.data)) { mark(findContainer(p)); continue; }
        // Keyword split across inline tags ("GTA <b>VI</b>"): test the enclosing block.
        while (INLINE_TAGS.has(p.tagName) && p.parentElement && p.parentElement !== root.parentElement) p = p.parentElement;
        if (tested.has(p)) continue;
        tested.add(p);
        if (p.textContent.length <= 300 && test(p.textContent)) mark(findContainer(p));
      }
    }

    // Attributes (thumbnails' alt, link slugs, aria-labels, Reddit post-title, …)
    const candidates = root.matches(ATTR_SELECTOR) ? [root, ...root.querySelectorAll(ATTR_SELECTOR)] : root.querySelectorAll(ATTR_SELECTOR);
    for (const el of candidates) {
      if (el.closest(`[${MARK}]`) || isSkippable(el)) continue;
      if (attrsMatch(el)) mark(findContainer(el));
    }
  }

  // ---------- page guard overlay ----------
  let overlayHost = null;
  let lastGuardKey = "";
  const dismissedPages = new Set();

  function pageKey() { return location.href.split("#")[0]; }

  function checkPageGuard() {
    if (!settings.pageGuard) return removeOverlay();
    const key = pageKey() + "|" + document.title;
    if (key === lastGuardKey) return;
    lastGuardKey = key;
    let url = location.href;
    try { url = decodeURIComponent(url); } catch {}
    const hit = test(document.title) || test(url);
    if (hit && !dismissedPages.has(pageKey())) showOverlay();
    else removeOverlay();
  }

  function showOverlay() {
    if (overlayHost?.isConnected) return;
    overlayHost = document.createElement("gta-shield-overlay");
    const shadow = overlayHost.attachShadow({ mode: "closed" });
    shadow.innerHTML = `
      <style>
        :host { all: initial; position: fixed; inset: 0; z-index: 2147483647; }
        .wrap { position: absolute; inset: 0; display: grid; place-items: center;
          background: rgba(12, 10, 20, 0.97); backdrop-filter: blur(30px);
          font: 16px/1.5 system-ui, sans-serif; color: #f4f0ff; }
        .box { max-width: 440px; padding: 32px; text-align: center; }
        h1 { font-size: 22px; margin: 0 0 8px; }
        p { margin: 0 0 24px; color: #c9c2dd; }
        button { font: inherit; padding: 10px 18px; margin: 4px; border-radius: 8px;
          border: 1px solid #ff4fa3; cursor: pointer; }
        .back { background: #ff4fa3; color: #1a0f1f; font-weight: 600; }
        .show { background: transparent; color: #ff9ccc; }
      </style>
      <div class="wrap"><div class="box">
        <h1>🛡️ Spoiler shield</h1>
        <p>This page looks like it's about GTA 6.</p>
        <button class="back">Get me out</button>
        <button class="show">Show anyway</button>
      </div></div>`;
    shadow.querySelector(".back").addEventListener("click", () => {
      if (history.length > 1) history.back();
      else location.href = "about:blank";
    });
    shadow.querySelector(".show").addEventListener("click", () => {
      dismissedPages.add(pageKey());
      removeOverlay();
    });
    document.documentElement.appendChild(overlayHost);
    pauseMedia();
  }

  function removeOverlay() {
    overlayHost?.remove();
    overlayHost = null;
  }

  function pauseMedia() {
    for (const m of document.querySelectorAll("video,audio")) {
      try { m.pause(); } catch {}
    }
  }

  document.addEventListener("play", (e) => {
    if (overlayHost?.isConnected) {
      try { e.target.pause(); } catch {}
    }
  }, true);

  // ---------- click to reveal ----------
  window.addEventListener("click", (e) => {
    if (!active) return;
    const el = e.target.closest?.(`[${MARK}="blur"]`);
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    el.setAttribute(MARK, "revealed");
    revealedText.set(el, el.textContent);
    scheduleReport();
  }, true);

  // ---------- count reporting ----------
  let reportTimer = null;
  function blockedCount() {
    let n = 0;
    for (const el of marked) if (el.isConnected && el.getAttribute(MARK) !== "revealed") n++;
    return n;
  }
  function scheduleReport() {
    if (window.top !== window) return; // only the top frame reports
    clearTimeout(reportTimer);
    reportTimer = setTimeout(() => {
      try {
        chrome.runtime.sendMessage({ type: "count", count: active ? blockedCount() : 0 }).catch(() => {});
      } catch {} // extension was reloaded; this script is orphaned
    }, 300);
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "getCount") sendResponse({ count: active ? blockedCount() : 0, active });
  });

  // ---------- observer ----------
  const pending = new Set();
  let flushScheduled = false;

  let lastSelf = null;
  function flush() {
    flushScheduled = false;
    const self = isSelfPage();
    if (self !== lastSelf) { pending.clear(); apply(); return; }
    if (!active) { pending.clear(); return; }
    recheckMarked();
    for (const n of pending) scan(n);
    pending.clear();
    checkPageGuard();
    if (overlayHost?.isConnected) pauseMedia();
  }

  function queue(node) {
    pending.add(node);
    if (!flushScheduled) {
      flushScheduled = true;
      // rAF runs before paint, so matches are blurred before they're seen.
      requestAnimationFrame(flush);
      // rAF doesn't fire in background tabs; make sure we still catch up.
      setTimeout(() => flushScheduled && flush(), 250);
    }
  }

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === "childList") {
          for (const n of r.addedNodes) {
            if (n.nodeName === "GTA-SHIELD-OVERLAY") continue;
            queue(n);
          }
        } else if (r.type === "characterData") {
          if (r.target.parentElement) queue(r.target.parentElement);
        } else if (r.type === "attributes") {
          queue(r.target);
        }
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRS,
    });
  }

  function stopObserver() {
    observer?.disconnect();
    observer = null;
  }

  // ---------- lifecycle ----------
  function apply() {
    lastSelf = isSelfPage();
    matcher = S.buildMatcher(settings.keywords);
    const shouldRun = settings.enabled && !!matcher && !isSelfPage() && !S.hostMatches(host, settings.disabledSites || []);
    unmarkAll();
    removeOverlay();
    lastGuardKey = "";
    active = shouldRun;
    if (!active) {
      // On our own repo page keep watching, so SPA navigation away re-enables the shield.
      if (isSelfPage() && settings.enabled) startObserver(); else stopObserver();
      scheduleReport();
      return;
    }
    startObserver();
    if (document.body) scan(document.body);
    checkPageGuard();
    scheduleReport();
  }

  settings = await S.loadSettings();
  apply();
  // Catch anything parsed before the observer was attached.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => active && scan(document.body), { once: true });
  }

  chrome.storage.onChanged.addListener(async (_changes, area) => {
    if (area !== "sync") return;
    settings = await S.loadSettings();
    apply();
  });
})();
