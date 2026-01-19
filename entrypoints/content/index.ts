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

// Selectors for video/content elements that may contain blocked channel content
const VIDEO_RENDERER_SELECTORS = [
  'ytd-video-renderer',           // Main search results
  'ytd-compact-video-renderer',   // Shelf videos / sidebar recommendations
  'ytd-playlist-renderer',        // Playlists in search
  'ytd-channel-renderer',         // Channel results in search
  'ytd-rich-item-renderer',       // Home page / subscription feed items
];

/**
 * Extract channel handle from a video/content renderer element
 */
function extractChannelFromElement(element: Element): string | null {
  // Try different selectors for channel links based on element type
  const channelLinkSelectors = [
    '#channel-info ytd-channel-name a',  // ytd-video-renderer
    'ytd-channel-name a',                // Generic channel name link
    '#channel-info a[href^="/@"]',       // ytd-channel-renderer
    '#channel-info a[href^="/channel/"]', // Channel ID format
    'a#avatar-section[href^="/@"]',      // Channel avatar link
  ];

  for (const selector of channelLinkSelectors) {
    const link = element.querySelector(selector) as HTMLAnchorElement | null;
    if (link?.href) {
      const channelId = extractChannelFromUrl(link.href);
      if (channelId) return channelId;
    }
  }

  return null;
}

/**
 * Hide videos from blocked channels in search results and other listings
 */
function hideBlockedChannelVideos(rootElement?: Element) {
  if (!settings) return;

  const globalEnabled = settings["global.enabled"] !== false;
  const blockedChannels = (settings["youtube.blocked_channels"] as string[]) || [];

  // If globally disabled or no blocked channels, unhide any previously hidden elements
  if (!globalEnabled || blockedChannels.length === 0) {
    const hiddenElements = document.querySelectorAll('[data-quietmode-blocked="true"]');
    hiddenElements.forEach(el => {
      (el as HTMLElement).style.display = '';
      el.removeAttribute('data-quietmode-blocked');
    });
    return;
  }

  const root = rootElement || document;
  const selector = VIDEO_RENDERER_SELECTORS.join(', ');
  const elements = root.querySelectorAll(selector);

  let hiddenCount = 0;

  elements.forEach(element => {
    const htmlElement = element as HTMLElement;
    
    // Skip already processed elements that are hidden
    if (htmlElement.getAttribute('data-quietmode-blocked') === 'true') {
      return;
    }

    const channelId = extractChannelFromElement(element);
    if (!channelId) return;

    const isBlocked = blockedChannels.some(blockedId =>
      channelIdsMatch(channelId, blockedId)
    );

    if (isBlocked) {
      htmlElement.style.display = 'none';
      htmlElement.setAttribute('data-quietmode-blocked', 'true');
      hiddenCount++;
    } else {
      // Unhide if previously hidden but no longer blocked
      if (htmlElement.getAttribute('data-quietmode-blocked') === 'true') {
        htmlElement.style.display = '';
        htmlElement.removeAttribute('data-quietmode-blocked');
      }
    }
  });

  if (hiddenCount > 0) {
    console.log(`[QuietMode:Content] Hidden ${hiddenCount} videos from blocked channels`);
  }
}

// Track MutationObserver instance
let blockedChannelObserver: MutationObserver | null = null;
let hideDebounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Debounced version of hideBlockedChannelVideos to avoid excessive processing
 */
function hideBlockedChannelVideosDebounced() {
  if (hideDebounceTimer) {
    clearTimeout(hideDebounceTimer);
  }
  hideDebounceTimer = setTimeout(() => {
    hideBlockedChannelVideos();
    hideDebounceTimer = null;
  }, 100);
}

/**
 * Setup MutationObserver to watch for dynamically loaded content
 * (e.g., infinite scroll in search results)
 */
function setupBlockedChannelObserver() {
  // Disconnect existing observer if any
  if (blockedChannelObserver) {
    blockedChannelObserver.disconnect();
  }

  // Create observer for dynamic content
  blockedChannelObserver = new MutationObserver((mutations) => {
    // Check if any relevant elements were added
    let hasRelevantChanges = false;
    
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            // Check if the added element is a video renderer or contains one
            const tagName = element.tagName.toLowerCase();
            if (VIDEO_RENDERER_SELECTORS.some(sel => 
              tagName === sel || element.querySelector(sel)
            )) {
              hasRelevantChanges = true;
              break;
            }
          }
        }
      }
      if (hasRelevantChanges) break;
    }

    if (hasRelevantChanges) {
      hideBlockedChannelVideosDebounced();
    }
  });

  // Observe the main content area for changes
  const contentTargets = [
    document.querySelector('ytd-page-manager'),
    document.querySelector('#content'),
    document.querySelector('ytd-browse'),
    document.querySelector('ytd-search'),
    document.body,
  ].filter(Boolean) as Element[];

  const targetElement = contentTargets[0] || document.body;
  
  blockedChannelObserver.observe(targetElement, {
    childList: true,
    subtree: true,
  });

  console.log('[QuietMode:Content] Blocked channel observer started');
}

/**
 * Stop the blocked channel observer
 */
function stopBlockedChannelObserver() {
  if (blockedChannelObserver) {
    blockedChannelObserver.disconnect();
    blockedChannelObserver = null;
    console.log('[QuietMode:Content] Blocked channel observer stopped');
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

    // Hide videos from blocked channels in search results/listings
    hideBlockedChannelVideos();

    // Setup observer for dynamically loaded content
    setupBlockedChannelObserver();

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
    hideBlockedChannelVideos();
    initializeBehaviors(1);
  });

  window.addEventListener("yt-page-data-updated", () => {
    console.log("[QuietMode:Content] YouTube page updated");
    checkBlockedChannel();
    hideBlockedChannelVideos();
    initializeBehaviors();
  });

  window.addEventListener("state-navigateend", () => {
    console.log("[QuietMode:Content] YouTube navigation ended");
    checkBlockedChannel();
    hideBlockedChannelVideos();
    initializeBehaviors(2);
  });

  // Handle page load completion
  if (document.readyState === "complete") {
    checkBlockedChannel();
    hideBlockedChannelVideos();
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
        hideBlockedChannelVideos();
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
        hideBlockedChannelVideos();
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
