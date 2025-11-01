import { browser } from "wxt/browser";
import {
  initializeBehaviors,
  watchAttributeChanges,
} from "./youtube-behaviors";
import contentCss from "./content.css?inline";
import { generateDefaultSettings } from "@/lib/default-settings";

interface Settings {
  [key: string]: boolean;
}

let settings: Settings | null = null;
let isRunning = false;

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
    initializeBehaviors(1);
  });

  window.addEventListener("yt-page-data-updated", () => {
    console.log("[QuietMode:Content] YouTube page updated");
    initializeBehaviors();
  });

  window.addEventListener("state-navigateend", () => {
    console.log("[QuietMode:Content] YouTube navigation ended");
    initializeBehaviors(2);
  });

  // Handle page load completion
  if (document.readyState === "complete") {
    initializeBehaviors(1);
  }

  // Listen for settings changes from storage
  browser.storage.onChanged.addListener((changes) => {
    console.log("[QuietMode:Content] Storage changed:", changes);
    if (changes.settings?.newValue) {
      const newSettings = changes.settings.newValue;

      // Check what changed and update only those attributes
      if (settings) {
        for (const key in newSettings) {
          if (newSettings[key] !== settings[key]) {
            // Convert "youtube.hide_feed" to "hide_feed"
            const attrName = key.replace("youtube.", "");
            if (newSettings[key]) {
              document.documentElement.setAttribute(attrName, "true");
            } else {
              document.documentElement.removeAttribute(attrName);
            }
          }
        }
      }

      settings = newSettings;
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
    const attrName = key.replace("youtube.", "");
    document.documentElement.removeAttribute(attrName);
  }

  // Apply enabled settings as HTML attributes
  let enabledCount = 0;
  for (const [key, value] of Object.entries(settings)) {
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
