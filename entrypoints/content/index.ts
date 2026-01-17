import { browser } from "wxt/browser";
import {
  initializeBehaviors,
  watchAttributeChanges,
} from "./youtube-behaviors";
import contentCss from "./content.css?inline";
import { generateDefaultSettings } from "@/lib/default-settings";
import { extractChannelFromUrl, channelIdsMatch } from "@/lib/utils";
import type { Settings } from "@/lib/types";

let settings: Settings | null = null;
let isRunning = false;

/**
 * Check if current page is a blocked channel and update the attribute
 */
function checkBlockedChannel() {
  if (!settings) return;
  
  const globalEnabled = settings["global.enabled"] !== false;
  const blockedChannels = (settings["youtube.blocked_channels"] as string[]) || [];
  
  // Get current channel from URL
  const currentChannel = extractChannelFromUrl(window.location.pathname);
  
  if (!globalEnabled || !currentChannel || blockedChannels.length === 0) {
    document.documentElement.removeAttribute("blocked_channel");
    return;
  }
  
  // Check if current channel is in blocked list
  const isBlocked = blockedChannels.some(blockedId => 
    channelIdsMatch(currentChannel, blockedId)
  );
  
  if (isBlocked) {
    document.documentElement.setAttribute("blocked_channel", "true");
    console.log(`[QuietMode:Content] Blocked channel detected: ${currentChannel}`);
  } else {
    document.documentElement.removeAttribute("blocked_channel");
  }
}

// Inject CSS into page
function injectCSS() {
  const style = document.createElement("style");
  style.id = "quiet-mode-styles";
  style.textContent = contentCss;
  document.head.appendChild(style);
  console.log("[QuietMode:Content] CSS injected");
}

export default defineContentScript({
  matches: ["*://*.youtube.com/*"],
  main() {
    console.log("[QuietMode:Content] Content script initialized");

    // Inject CSS immediately
    if (document.head) {
      injectCSS();
    } else {
      document.addEventListener("DOMContentLoaded", injectCSS);
    }

    // Prevent duplicate initialization
    if ((document as any).quietModeRunning) {
      console.log("[QuietMode:Content] Already running, skipping");
      return;
    }
    (document as any).quietModeRunning = true;

    // Check if we're in an iframe (embedded player)
    if (window !== window.parent) {
      // For embedded players, only initialize on player pages
      window.addEventListener("DOMContentLoaded", () => {
        if (document.getElementById("player")) {
          init();
        }
      });
    } else {
      // Main window - initialize immediately
      init();
    }
  },
});

async function init() {
  try {
    console.log("[QuietMode:Content] Initializing...");

    // Load settings from storage
    const data = await browser.storage.sync.get("settings");
    console.log("[QuietMode:Content] Loaded settings:", data.settings);

    settings = data.settings || generateDefaultSettings();

    // Save default settings if none exist
    if (!data.settings) {
      await browser.storage.sync.set({ settings });
    }

    // Apply settings to HTML attributes
    applySettings(settings);

    // Check if current page is a blocked channel
    checkBlockedChannel();

    // Setup event listeners
    setupEventListeners();

    // Initialize YouTube-specific behaviors
    initializeBehaviors();

    // Watch for attribute changes to handle dynamic behaviors
    watchAttributeChanges();

    isRunning = true;
    console.log("[QuietMode:Content] Initialization complete");
  } catch (error) {
    console.error("[QuietMode:Content] Initialization error:", error);
  }
}

function setupEventListeners() {
  console.log("[QuietMode:Content] Setting up event listeners");

  // Listen for YouTube SPA navigation events
  window.addEventListener("load", () => {
    console.log("[QuietMode:Content] Page loaded");
    checkBlockedChannel();
    initializeBehaviors(1);
  });

  window.addEventListener("yt-page-data-updated", () => {
    console.log("[QuietMode:Content] YouTube page updated");
    checkBlockedChannel();
    initializeBehaviors();
  });

  window.addEventListener("state-navigateend", () => {
    console.log("[QuietMode:Content] YouTube navigation ended");
    checkBlockedChannel();
    initializeBehaviors(2);
  });

  // Handle page load completion
  if (document.readyState === "complete") {
    checkBlockedChannel();
    initializeBehaviors(1);
  }

  // Listen for settings changes from storage
  browser.storage.onChanged.addListener((changes) => {
    console.log("[QuietMode:Content] Storage changed:", changes);
    if (changes.settings?.newValue) {
      const newSettings = changes.settings.newValue;

      // If global toggle changed, re-apply all settings
      if (settings && newSettings["global.enabled"] !== settings["global.enabled"]) {
        console.log("[QuietMode:Content] Global toggle changed, re-applying all settings");
        settings = newSettings;
        applySettings(settings);
        checkBlockedChannel();
        return;
      }

      // Check if blocked_channels changed
      const oldBlockedChannels = (settings?.["youtube.blocked_channels"] as string[]) || [];
      const newBlockedChannels = (newSettings["youtube.blocked_channels"] as string[]) || [];
      const blockedChannelsChanged = JSON.stringify(oldBlockedChannels) !== JSON.stringify(newBlockedChannels);

      // Check what changed and update only those attributes
      if (settings) {
        const globalEnabled = newSettings["global.enabled"] !== false;
        
        for (const key in newSettings) {
          if (key === "global.enabled" || key === "youtube.blocked_channels") continue;
          
          if (newSettings[key] !== settings[key]) {
            // Convert "youtube.hide_feed" to "hide_feed"
            const attrName = key.replace("youtube.", "");
            
            // Only apply if globally enabled
            if (globalEnabled && newSettings[key]) {
              document.documentElement.setAttribute(attrName, "true");
            } else {
              document.documentElement.removeAttribute(attrName);
            }
          }
        }
      }

      settings = newSettings;

      // Re-check blocked channel if the list changed
      if (blockedChannelsChanged) {
        console.log("[QuietMode:Content] Blocked channels changed, re-checking");
        checkBlockedChannel();
      }
    }
  });
}

function applySettings(settings: Settings | null) {
  if (!settings) {
    console.log("[QuietMode:Content] No settings to apply");
    return;
  }

  console.log(
    "[QuietMode:Content] Applying settings to HTML attributes:",
    settings
  );

  // Clear all existing attributes
  const allAttributes = Object.keys(generateDefaultSettings());
  for (const key of allAttributes) {
    const attrName = key.replace("youtube.", "").replace("global.", "");
    // Skip blocked_channels - it's not a simple attribute
    if (attrName === "blocked_channels") continue;
    document.documentElement.removeAttribute(attrName);
  }
  // Also clear blocked_channel attribute
  document.documentElement.removeAttribute("blocked_channel");

  // Check if globally enabled
  const globalEnabled = settings["global.enabled"] !== false;
  if (!globalEnabled) {
    console.log("[QuietMode:Content] Global toggle is OFF - skipping all settings");
    return;
  }

  // Apply enabled settings as HTML attributes
  let enabledCount = 0;
  for (const [key, value] of Object.entries(settings)) {
    // Skip global toggle and blocked_channels (handled separately)
    if (key === "global.enabled" || key === "youtube.blocked_channels") continue;
    
    if (value) {
      // Convert setting key to attribute name (e.g., "youtube.hide_feed" -> "hide_feed")
      const attrName = key.replace("youtube.", "");
      document.documentElement.setAttribute(attrName, "true");
      console.log(`[QuietMode:Content] ✓ Set attribute: ${attrName}="true"`);
      enabledCount++;
    }
  }

  console.log(`[QuietMode:Content] Applied ${enabledCount} enabled settings`);
  console.log(
    "[QuietMode:Content] HTML element attributes:",
    document.documentElement.attributes
  );
}
