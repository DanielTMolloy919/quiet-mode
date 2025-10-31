import { browser } from "wxt/browser";

const REMOTE_CONFIG_URL =
  "https://raw.githubusercontent.com/DanielTMolloy919/quiet-mode-config/refs/heads/main/config.json";
const CONFIG_CACHE_KEY = "remote_config";
const CONFIG_TIMESTAMP_KEY = "config_timestamp";
const CONFIG_VERSION_KEY = "config_version";
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

interface RemoteConfig {
  version: string;
  lastUpdated: string;
  sites: {
    [siteName: string]: {
      patterns: string[];
      rules: BlockRule[];
    };
  };
}

interface BlockRule {
  id: string;
  displayName: string;
  urlPatterns: string[];
  selectors: string[];
  defaultEnabled: boolean;
}

let cachedConfig: RemoteConfig | null = null;

export default defineBackground(() => {
  console.log("[Tranquilize:Background] Background script initialized");

  // Initialize on install/update
  browser.runtime.onInstalled.addListener(async (details) => {
    console.log("[Tranquilize:Background] Extension installed/updated:", details);
    await loadConfig(true); // Force refresh on install/update
  });

  // Load config on startup
  loadConfig(false);

  // Handle messages from popup and content scripts
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("[Tranquilize:Background] Message received:", request, "from:", sender);

    if (request.message === "ping") {
      console.log("[Tranquilize:Background] Responding to ping");
      sendResponse({ status: "ok", timestamp: Date.now() });
      return false;
    }

    if (request.message === "getConfig") {
      console.log("[Tranquilize:Background] Config requested");
      
      // Return cached config if available
      if (cachedConfig) {
        console.log("[Tranquilize:Background] Returning cached config");
        sendResponse(cachedConfig);
        return false;
      }

      // Otherwise, load config and return it
      loadConfig(false)
        .then((config) => {
          console.log("[Tranquilize:Background] Loaded and returning config");
          sendResponse(config);
        })
        .catch((error) => {
          console.error("[Tranquilize:Background] Error loading config:", error);
          sendResponse(null);
        });

      return true; // Keep channel open for async response
    }

    if (request.message === "refreshConfig") {
      console.log("[Tranquilize:Background] Force refresh requested");
      
      loadConfig(true)
        .then((config) => {
          console.log("[Tranquilize:Background] Config refreshed");
          sendResponse(config);
        })
        .catch((error) => {
          console.error("[Tranquilize:Background] Error refreshing config:", error);
          sendResponse(null);
        });

      return true; // Keep channel open for async response
    }

    return false;
  });

  // Listen for tab updates to inject content script behavior
  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url) {
      console.log("[Tranquilize:Background] Tab updated:", tabId, tab.url);
      
      // Send message to content script to process the tab
      browser.tabs
        .sendMessage(tabId, { message: "processTab" })
        .catch((error) => {
          // Silently fail if content script not loaded (expected for some pages)
          console.log("[Tranquilize:Background] Could not send to tab:", error.message);
        });
    }
  });

  // Listen for storage changes to invalidate cache
  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local") {
      if (
        changes[CONFIG_CACHE_KEY] ||
        changes[CONFIG_TIMESTAMP_KEY] ||
        changes[CONFIG_VERSION_KEY]
      ) {
        console.log("[Tranquilize:Background] Config cache cleared, reloading...");
        cachedConfig = null;
        loadConfig(false);
      }
    }
  });

  console.log("[Tranquilize:Background] All listeners registered");
});

async function loadConfig(forceRefresh: boolean = false): Promise<RemoteConfig | null> {
  try {
    console.log("[Tranquilize:Background] Loading config (force:", forceRefresh, ")");

    // Check cache first unless force refresh
    if (!forceRefresh && cachedConfig) {
      console.log("[Tranquilize:Background] Using in-memory cached config");
      return cachedConfig;
    }

    // Check storage cache
    if (!forceRefresh) {
      const stored = await browser.storage.local.get([
        CONFIG_CACHE_KEY,
        CONFIG_TIMESTAMP_KEY,
        CONFIG_VERSION_KEY,
      ]);

      const timestamp = stored[CONFIG_TIMESTAMP_KEY];
      const config = stored[CONFIG_CACHE_KEY];

      if (config && timestamp) {
        const age = Date.now() - timestamp;
        if (age < CACHE_DURATION) {
          console.log(
            `[Tranquilize:Background] Using stored cache (age: ${Math.round(age / 1000)}s)`
          );
          cachedConfig = config;
          return config;
        } else {
          console.log(
            `[Tranquilize:Background] Cache expired (age: ${Math.round(age / 1000)}s)`
          );
        }
      }
    }

    // Fetch fresh config
    console.log("[Tranquilize:Background] Fetching remote config from:", REMOTE_CONFIG_URL);
    
    const response = await fetch(REMOTE_CONFIG_URL, {
      cache: "no-cache",
      headers: {
        "Cache-Control": "no-cache",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const config: RemoteConfig = await response.json();
    console.log("[Tranquilize:Background] Remote config fetched:", config);

    // Validate config structure
    if (!config.version || !config.sites) {
      throw new Error("Invalid config structure");
    }

    // Cache the config
    await browser.storage.local.set({
      [CONFIG_CACHE_KEY]: config,
      [CONFIG_TIMESTAMP_KEY]: Date.now(),
      [CONFIG_VERSION_KEY]: config.version,
    });

    cachedConfig = config;
    console.log("[Tranquilize:Background] Config cached successfully");

    return config;
  } catch (error) {
    console.error("[Tranquilize:Background] Error loading config:", error);

    // Fallback to cached config even if expired
    if (cachedConfig) {
      console.log("[Tranquilize:Background] Using stale in-memory cache as fallback");
      return cachedConfig;
    }

    // Try to load from storage as last resort
    try {
      const stored = await browser.storage.local.get(CONFIG_CACHE_KEY);
      if (stored[CONFIG_CACHE_KEY]) {
        console.log("[Tranquilize:Background] Using stale storage cache as fallback");
        cachedConfig = stored[CONFIG_CACHE_KEY];
        return cachedConfig;
      }
    } catch (storageError) {
      console.error("[Tranquilize:Background] Error loading from storage:", storageError);
    }

    return null;
  }
}
