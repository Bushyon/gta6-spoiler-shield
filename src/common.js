// Shared between the content script, popup and options page.
// Exposes a single global: SpoilerShield.
(() => {
  const DEFAULT_KEYWORDS = [
    "GTA 6",
    "GTA VI",
    "GTA6",
    "GTAVI",
    "Grand Theft Auto 6",
    "Grand Theft Auto VI",
    "Grand Theft Auto Six",
    "Vice City",
    "Leonida",
    "Port Gellhorn",
    "Ambrosia",
    "Grassrivers",
    "Mount Kalaga",
    "Lucia Caminos",
    "Jason Duval",
    "Cal Hampton",
    "Boobie Ike",
    "Dre'Quan Priest",
    "Real Dimez",
    "Raul Bautista",
    "Brian Heder",
    "#GTA6",
    "#GTAVI",
    "Rockstar Games",
  ];

  const DEFAULTS = {
    enabled: true,
    mode: "blur", // "blur" (click to reveal) or "hide" (remove entirely)
    keywords: DEFAULT_KEYWORDS,
    pageGuard: true, // full-page overlay when the page itself is about GTA 6
    disabledSites: [], // hostnames where the shield is paused
  };

  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // One keyword line -> regex source.
  //  - "/pattern/" lines are used as raw regex.
  //  - Otherwise spaces/hyphens/underscores/dots become a flexible separator,
  //    so "GTA 6" also matches "GTA-6", "gta_6", "GTA6", "grand-theft-auto-vi".
  //  - Alphanumeric edges get "word" boundaries so "GTA 6" doesn't hit "GTA 60".
  function keywordToSource(kw) {
    kw = kw.trim();
    if (!kw) return null;
    const raw = kw.match(/^\/(.+)\/$/);
    if (raw) {
      try {
        new RegExp(raw[1], "iu");
        return `(?:${raw[1]})`;
      } catch {
        return null;
      }
    }
    const parts = kw.split(/[\s\-_.+]+/).filter(Boolean).map(escapeRegex);
    // Apostrophes vary: ' ’ ‘ ` or none.
    let body = parts.join("[\\s\\-_.+]*").replace(/'/g, "['’‘`]?");
    const startB = /^[\p{L}\p{N}]/u.test(kw) ? "(?<![\\p{L}\\p{N}])" : "";
    const endB = /[\p{L}\p{N}]$/u.test(kw) ? "(?![\\p{L}\\p{N}])" : "";
    return startB + body + endB;
  }

  function buildMatcher(keywords) {
    const sources = (keywords || []).map(keywordToSource).filter(Boolean);
    if (!sources.length) return null;
    return new RegExp(sources.join("|"), "iu");
  }

  async function loadSettings() {
    const stored = await chrome.storage.sync.get(Object.keys(DEFAULTS));
    return { ...DEFAULTS, ...stored };
  }

  function hostMatches(host, list) {
    return list.some((d) => {
      d = d.trim().toLowerCase().replace(/^\*\./, "");
      return d && (host === d || host.endsWith("." + d));
    });
  }

  globalThis.SpoilerShield = {
    DEFAULTS,
    DEFAULT_KEYWORDS,
    keywordToSource,
    buildMatcher,
    loadSettings,
    hostMatches,
  };
})();
