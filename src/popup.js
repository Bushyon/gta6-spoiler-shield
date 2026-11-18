(async () => {
  const S = globalThis.SpoilerShield;
  const $ = (id) => document.getElementById(id);
  const settings = await S.loadSettings();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let host = "";
  try { host = new URL(tab.url).hostname; } catch {}

  // Permission (Firefox MV3 treats <all_urls> as opt-in).
  const granted = await chrome.permissions.contains({ origins: ["<all_urls>"] });
  $("perm").hidden = granted;
  $("grant").addEventListener("click", async () => {
    if (await chrome.permissions.request({ origins: ["<all_urls>"] })) {
      $("perm").hidden = true;
      if (tab?.id) chrome.tabs.reload(tab.id);
    }
  });

  $("enabled").checked = settings.enabled;
  $("enabled").addEventListener("change", (e) => chrome.storage.sync.set({ enabled: e.target.checked }));

  if (host && /^https?:/.test(tab.url)) {
    $("host").textContent = host;
    $("site").checked = !S.hostMatches(host, settings.disabledSites);
    $("site").addEventListener("change", async (e) => {
      const { disabledSites } = await S.loadSettings();
      const bare = host.replace(/^www\./, "");
      const next = e.target.checked
        ? disabledSites.filter((d) => !S.hostMatches(host, [d]))
        : [...new Set([...disabledSites, bare])];
      await chrome.storage.sync.set({ disabledSites: next });
    });
  } else {
    $("siteRow").hidden = true;
  }

  async function refreshCount() {
    try {
      const r = await chrome.tabs.sendMessage(tab.id, { type: "getCount" }, { frameId: 0 });
      $("count").textContent = r.active ? r.count : "off";
      $("countLabel").textContent = r.active ? "blocked on this page" : "shield paused here";
    } catch {
      $("count").textContent = "–";
      $("countLabel").textContent = "not running on this page";
    }
  }
  refreshCount();
  chrome.storage.onChanged.addListener(() => setTimeout(refreshCount, 150));

  $("options").addEventListener("click", () => { chrome.runtime.openOptionsPage(); window.close(); });
})();
