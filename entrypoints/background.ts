import { browser } from "wxt/browser";

export default defineBackground(() => {
  console.log("[QuietMode:Background] Background script initialized");

  // Initialize default settings on install
  browser.runtime.onInstalled.addListener(async (details) => {
    console.log("[QuietMode:Background] Extension installed/updated:", details);
    
    if (details.reason === "install") {
      // Set up default settings for new installs
      const defaultSettings = generateDefaultSettings();
      await browser.storage.sync.set({ settings: defaultSettings });
      console.log("[QuietMode:Background] Default settings initialized");
    }
  });

  console.log("[QuietMode:Background] Background script ready");
});

function generateDefaultSettings(): Record<string, boolean> {
  return {
    "youtube.hide_annotations": false,
    "youtube.hide_autoplay": false,
    "youtube.hide_bar": false,
    "youtube.hide_cards": false,
    "youtube.hide_channel": false,
    "youtube.hide_chat": false,
    "youtube.hide_comments": false,
    "youtube.hide_desc": false,
    "youtube.hide_donate": false,
    "youtube.hide_endscreen": false,
    "youtube.hide_feed": false,
    "youtube.hide_header": false,
    "youtube.hide_merch": false,
    "youtube.hide_meta": false,
    "youtube.hide_mix": false,
    "youtube.hide_moreyt": false,
    "youtube.hide_notifs": false,
    "youtube.hide_playlists": false,
    "youtube.hide_prof": false,
    "youtube.hide_recommended": false,
    "youtube.hide_redirect_home": false,
    "youtube.hide_search": false,
    "youtube.hide_shorts": false,
    "youtube.hide_sidebar": false,
    "youtube.hide_subs": false,
    "youtube.hide_trending": false,
  };
}
