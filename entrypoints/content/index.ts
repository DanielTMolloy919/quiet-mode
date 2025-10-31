import { browser } from "wxt/browser";

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

let settings: Record<string, boolean> | null = null;
let config: RemoteConfig | null = null;
let isInitialized = false;
let attributeObserver: MutationObserver | null = null;
let styleElement: HTMLStyleElement | null = null;

export default defineContentScript({
  matches: [
    "*://*.youtube.com/*",
    "*://*.reddit.com/*",
    "*://*.instagram.com/*",
  ],
  main() {
    console.log("[Tranquilize:Content] Content script initialized");
    init();
  },
});

// Generate and inject CSS dynamically from config
function injectDynamicCSS(config: RemoteConfig) {
  console.log("[Tranquilize:Content] Generating dynamic CSS from config");

  const cssRules: string[] = [];

  // Generate CSS rules for each site and rule
  for (const [siteName, siteConfig] of Object.entries(config.sites)) {
    for (const rule of siteConfig.rules) {
      const attributeName = `tranquilize_${siteName}_${rule.id}`;

      // Create CSS rule for each selector
      for (const selector of rule.selectors) {
        // Escape the selector if needed and create the rule
        cssRules.push(
          `html[${attributeName}="true"] ${selector} { display: none !important; }`
        );
      }
    }
  }

  // Create or update style element
  if (!styleElement) {
    styleElement = document.createElement("style");
    styleElement.id = "tranquilize-dynamic-styles";
    document.head.appendChild(styleElement);
    console.log("[Tranquilize:Content] Created style element");
  }

  // Set the CSS content
  styleElement.textContent = cssRules.join("\n");
  console.log(`[Tranquilize:Content] Injected ${cssRules.length} CSS rules`);
}

// Initialize with retry logic for Firefox
async function init(retries = 3) {
  try {
    // Get remote config from background script
    const remoteConfig = await browser.runtime.sendMessage({
      message: "getConfig",
    });
    console.log("[Tranquilize:Content] Loaded remote config:", remoteConfig);

    if (!remoteConfig) {
      console.error("[Tranquilize:Content] Failed to load remote config");
      return;
    }

    config = remoteConfig;

    // Generate and inject CSS from config
    injectDynamicCSS(config);

    // Load user settings
    const data = await browser.storage.sync.get("settings");
    console.log("[Tranquilize:Content] Retrieved settings:", data.settings);
    settings = data.settings;

    if (!settings || Object.keys(settings).length === 0) {
      console.log(
        "[Tranquilize:Content] No settings found, generating defaults"
      );
      settings = generateDefaultSettings(config as RemoteConfig);
      await browser.storage.sync.set({ settings });
    }

    // Wire up all event listeners
    setupEventListeners();

    // Initial application
    applyAllRules();

    isInitialized = true;
  } catch (error) {
    console.error("[Tranquilize:Content] Initialization error:", error);

    // Retry if background script not ready yet (common in Firefox)
    if (
      retries > 0 &&
      error instanceof Error &&
      error.message.includes("Receiving end does not exist")
    ) {
      console.log(
        `[Tranquilize:Content] Retrying initialization (${retries} attempts left)...`
      );
      setTimeout(() => init(retries - 1), 500);
    }
  }
}

// Setup all event listeners for robust SPA handling
function setupEventListeners() {
  console.log("[Tranquilize:Content] Setting up event listeners");

  // 1. YouTube-specific SPA events (most reliable)
  window.addEventListener("yt-page-data-updated", () => {
    console.log("[Tranquilize:Content] yt-page-data-updated event");
    applyAllRules();
  });

  window.addEventListener("state-navigateend", () => {
    console.log("[Tranquilize:Content] state-navigateend event");
    applyAllRules();
  });

  // 2. Standard navigation events
  window.addEventListener("load", () => {
    console.log("[Tranquilize:Content] load event");
    applyAllRules();
  });

  window.addEventListener("popstate", () => {
    console.log("[Tranquilize:Content] popstate event");
    applyAllRules();
  });

  // 3. History API interception for instant detection
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    console.log("[Tranquilize:Content] pushState intercepted");
    applyAllRules();
  };

  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    console.log("[Tranquilize:Content] replaceState intercepted");
    applyAllRules();
  };

  // 4. Watch HTML attributes for settings changes (like the reference script)
  // Build attribute filter list
  const attributeFilter: string[] = [];
  if (config) {
    for (const siteName in config.sites) {
      for (const rule of config.sites[siteName].rules) {
        attributeFilter.push(`tranquilize_${siteName}_${rule.id}`);
      }
    }
  }

  if (attributeFilter.length > 0) {
    attributeObserver = new MutationObserver((mutations) => {
      console.log("[Tranquilize:Content] HTML attribute changed:", mutations);
      // Attribute changed externally, could re-sync if needed
      // For now, our applyAllRules is idempotent so we're good
    });

    attributeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: attributeFilter,
    });
  }

  // 5. Listen for settings changes from storage
  browser.storage.onChanged.addListener((changes) => {
    console.log("[Tranquilize:Content] Storage changed:", changes);
    if (changes.settings) {
      settings = changes.settings.newValue;
      applyAllRules();
    }
  });

  // 6. Listen for messages from background script
  browser.runtime.onMessage.addListener((request) => {
    console.log("[Tranquilize:Content] Message received:", request);
    if (request.message === "processTab") {
      applyAllRules();
    }
  });
}

// Idempotent function to apply all rules
function applyAllRules() {
  if (!config || !settings || !isInitialized) {
    console.log("[Tranquilize:Content] Not ready yet, skipping");
    return;
  }

  const url = window.location.href;
  console.log("[Tranquilize:Content] Applying rules for URL:", url);

  const urlObject = new URL(url);
  let strippedUrl = urlObject.origin + urlObject.pathname;
  strippedUrl = strippedUrl
    .replace(/\/$/, "") // remove trailing slash
    .replace(/https?:\/\//, "") // remove protocol
    .replace("www.", ""); // remove www

  console.log("[Tranquilize:Content] Stripped URL:", strippedUrl);

  // Find matching site config
  const siteName = getSiteNameFromUrl(strippedUrl);
  if (!siteName) {
    console.log("[Tranquilize:Content] No matching site config found");
    return;
  }

  const siteConfig = config.sites[siteName];
  if (!siteConfig) {
    console.log("[Tranquilize:Content] Site config not found for:", siteName);
    return;
  }

  console.log(`[Tranquilize:Content] Applying rules for ${siteName}`);
  applyRules(siteConfig.rules, strippedUrl, siteName);
}

// Idempotent function to apply rules for a specific site
// Uses HTML attributes for instant, atomic updates (no CSS injection flicker)
function applyRules(rules: BlockRule[], currentUrl: string, siteName: string) {
  let appliedCount = 0;

  for (const rule of rules) {
    const settingKey = `${siteName}.${rule.id}`;
    const isEnabled = settings?.[settingKey];
    const attributeName = `tranquilize_${siteName}_${rule.id}`;

    // Check if rule applies to current URL
    const matches = rule.urlPatterns.some((pattern) => {
      try {
        const regex = new RegExp(pattern);
        return regex.test(currentUrl);
      } catch (error) {
        console.error(
          `[Tranquilize:Content] Invalid regex pattern: ${pattern}`,
          error
        );
        return false;
      }
    });

    // Idempotent attribute toggling - safe to call multiple times
    const shouldBeActive = isEnabled && matches;
    const currentValue = document.documentElement.getAttribute(attributeName);

    if (shouldBeActive && currentValue !== "true") {
      document.documentElement.setAttribute(attributeName, "true");
      console.log(`[Tranquilize:Content] ✓ Activated: ${attributeName}`);
      appliedCount++;
    } else if (!shouldBeActive && currentValue === "true") {
      document.documentElement.removeAttribute(attributeName);
      console.log(`[Tranquilize:Content] ✗ Deactivated: ${attributeName}`);
    } else if (shouldBeActive) {
      appliedCount++; // Already active, count it
    }
  }

  console.log(
    `[Tranquilize:Content] ${appliedCount}/${rules.length} rules active for ${siteName}`
  );
}

function getSiteNameFromUrl(url: string): string | null {
  if (url.includes("youtube.com")) return "youtube";
  if (url.includes("reddit.com")) return "reddit";
  if (url.includes("instagram.com")) return "instagram";
  return null;
}

function generateDefaultSettings(
  config: RemoteConfig
): Record<string, boolean> {
  const settings: Record<string, boolean> = {};

  for (const [siteName, siteConfig] of Object.entries(config.sites)) {
    for (const rule of siteConfig.rules) {
      const settingKey = `${siteName}.${rule.id}`;
      settings[settingKey] = rule.defaultEnabled;
    }
  }

  console.log("[Tranquilize:Content] Generated default settings:", settings);
  return settings;
}
