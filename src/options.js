(async () => {
  const S = globalThis.SpoilerShield;
  const $ = (id) => document.getElementById(id);
  const lines = (s) => s.split("\n").map((l) => l.trim()).filter(Boolean);

  async function checkPerm() {
    $("perm").hidden = await chrome.permissions.contains({ origins: ["<all_urls>"] });
  }
  $("grant").addEventListener("click", async () => {
    await chrome.permissions.request({ origins: ["<all_urls>"] });
    checkPerm();
  });
  checkPerm();

  function fill(s) {
    $("keywords").value = s.keywords.join("\n");
    $("disabledSites").value = s.disabledSites.join("\n");
    $("pageGuard").checked = s.pageGuard;
    document.querySelector(`input[name=mode][value=${s.mode}]`).checked = true;
    validate();
  }

  function validate() {
    const kws = lines($("keywords").value);
    const bad = kws.filter((k) => !S.keywordToSource(k));
    $("kwInfo").textContent = `${kws.length} keywords` + (bad.length ? ` · invalid regex: ${bad.join(", ")}` : "");
    $("kwInfo").className = bad.length ? "warn" : "muted";
    return bad.length === 0;
  }
  $("keywords").addEventListener("input", validate);

  $("reset").addEventListener("click", () => {
    $("keywords").value = S.DEFAULT_KEYWORDS.join("\n");
    validate();
  });

  $("save").addEventListener("click", async () => {
    if (!validate()) { $("status").textContent = "Fix the invalid regex first."; return; }
    await chrome.storage.sync.set({
      keywords: lines($("keywords").value),
      disabledSites: lines($("disabledSites").value).map((d) => d.toLowerCase()),
      pageGuard: $("pageGuard").checked,
      mode: document.querySelector("input[name=mode]:checked").value,
    });
    $("status").textContent = "Saved. Open tabs update automatically.";
    setTimeout(() => ($("status").textContent = ""), 2500);
  });

  fill(await S.loadSettings());
})();
