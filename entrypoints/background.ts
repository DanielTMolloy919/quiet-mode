import { browser } from "wxt/browser";
import { generateDefaultSettings } from "@/lib/default-settings";

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
