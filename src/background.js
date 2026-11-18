// Badge counter + first-run setup. Runs as a service worker in Chrome and
// as an event page in Firefox (manifest lists both).
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type !== "count" || !sender.tab?.id) return;
  const text = msg.count > 0 ? String(msg.count > 999 ? "999+" : msg.count) : "";
  chrome.action.setBadgeText({ tabId: sender.tab.id, text }).catch(() => {});
  chrome.action.setBadgeBackgroundColor({ tabId: sender.tab.id, color: "#ff4fa3" }).catch(() => {});
});

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason !== "install") return;
  // Firefox MV3 doesn't grant <all_urls> automatically; the options page asks for it.
  const granted = await chrome.permissions.contains({ origins: ["<all_urls>"] });
  if (!granted) chrome.runtime.openOptionsPage();
});
