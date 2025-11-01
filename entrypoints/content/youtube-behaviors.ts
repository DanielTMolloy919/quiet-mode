/**
 * YouTube-specific behavior handling
 * Handles autoplay toggling and notification cleaning
 */

const html = document.documentElement;
const MutationObs = window.MutationObserver;

// Settings that affect navigation behavior
const navSettings = {
  hide_feed: false,
  hide_subs: false,
  hide_notifs: false,
};

const navSettingsKeys = Object.keys(navSettings);

// Track initialized state
let hideAutoplay: boolean | null = null;
let autoplayObserverRunning = false;
let titleObserverRunning = false;

/**
 * Re-toggle autoplay button to ensure it stays in desired state
 */
function retoggleAutoplay(
  delay: number,
  button: HTMLElement,
  userWantsOn: boolean
) {
  if (userWantsOn && hideAutoplay) {
    if (button.getAttribute("aria-checked") === "true") {
      button.click();
      setTimeout(
        retoggleAutoplay.bind(null, delay, button, userWantsOn),
        delay
      );
    }
  }
}

/**
 * Toggle autoplay button
 */
function toggleAutoplayButton(element: Element, retoggle: boolean): boolean {
  const autonavButtons = element.getElementsByClassName(
    "ytp-autonav-toggle-button"
  );
  if (!autonavButtons.length) return false;

  const autonavButton = autonavButtons[0] as HTMLElement;
  if (autonavButton.getAttribute("aria-checked") === "true") {
    autonavButton.click();
    if (retoggle) {
      setTimeout(retoggleAutoplay.bind(null, 1500, autonavButton, true), 1500);
    }
  }

  return true;
}

/**
 * Handle autoplay for desktop Polymer-based YouTube
 */
function handleDesktopAutoplay(enableAutoplay: boolean): boolean {
  if (!window.Polymer) return false;

  const watchFlexy = document.getElementsByTagName("ytd-watch-flexy")[0];
  const isWatchFlexyHidden = watchFlexy?.hasAttribute("hidden");
  if (watchFlexy && !isWatchFlexyHidden) {
    if (enableAutoplay) {
      if (!autoplayObserverRunning) {
        if (!toggleAutoplayButton(watchFlexy, false)) {
          autoplayObserverRunning = true;
          const observer = new MutationObs(function (this: MutationObserver) {
            if (toggleAutoplayButton(watchFlexy, true)) {
              autoplayObserverRunning = false;
              this.disconnect();
            }
          });
          observer.observe(watchFlexy, { childList: true, subtree: true });
        }
      }
    }
  }

  return true;
}

/**
 * Handle autoplay for mobile YouTube
 */
function handleMobileAutoplay(enableAutoplay: boolean): boolean {
  const playerContainer = document.getElementById("player-container-id");
  if (!playerContainer) return false;

  const player = document.getElementById("player");
  const isPlayerHidden = player?.hasAttribute("hidden");
  if (player && !isPlayerHidden) {
    if (enableAutoplay) {
      const autonavContainer = document.getElementsByClassName(
        "ytm-autonav-toggle-button-container"
      )[0];
      if (
        autonavContainer &&
        autonavContainer.getAttribute("aria-pressed") === "true"
      ) {
        (autonavContainer as HTMLElement).click();
      }
    }
  }

  return true;
}

/**
 * Remove notification count from page title
 */
function cleanTitleNotifications(titleElement: Element) {
  const notificationPattern = /^\(\d+\) +/;
  if (notificationPattern.test(titleElement.textContent || "")) {
    titleElement.textContent = (titleElement.textContent || "").replace(
      notificationPattern,
      ""
    );
  }
}

/**
 * Watch for title changes to remove notification count
 */
function initTitleCleaner() {
  if (titleObserverRunning) return;

  const titleElement = document.getElementsByTagName("title")[0];
  if (!titleElement) return;

  cleanTitleNotifications(titleElement);

  const observer = new MutationObs(function (this: MutationObserver) {
    if (navSettings.hide_notifs) {
      cleanTitleNotifications(titleElement);
    } else {
      titleObserverRunning = false;
      this.disconnect();
    }
  });
  observer.observe(titleElement, { childList: true });

  titleObserverRunning = true;
}

/**
 * Initialize all YouTube behaviors
 */
export function initializeBehaviors(phase: number = 0) {
  // Read settings from HTML attributes on first run
  if (hideAutoplay === null) {
    hideAutoplay = html.getAttribute("hide_autoplay") === "true";

    if (window.Polymer) {
      // Load navigation settings
      for (const key of navSettingsKeys) {
        navSettings[key as keyof typeof navSettings] =
          html.getAttribute(key) === "true";
      }

      // Mark if user is signed out
      if (document.cookie.indexOf("SAPISID=") === -1) {
        html.setAttribute("yt-signed-out", "");
      }
    }
  }

  // Handle Polymer-specific features
  if (window.Polymer) {
    if (navSettings.hide_notifs) {
      initTitleCleaner();
    }
  }

  // Handle autoplay
  if (hideAutoplay) {
    if (window.Polymer) {
      handleDesktopAutoplay(true);
    } else if (phase === 1 || phase === 2) {
      handleMobileAutoplay(true);
    }
  }
}

/**
 * Setup mutation observer for attribute changes
 */
export function watchAttributeChanges() {
  const attributeFilter = ["hide_autoplay", ...navSettingsKeys];

  new MutationObs((mutations) => {
    if (hideAutoplay === null) return;

    for (const mutation of mutations) {
      const attrName = mutation.attributeName;
      if (!attrName) continue;

      if (attrName === "hide_autoplay") {
        hideAutoplay = html.getAttribute("hide_autoplay") === "true";
        if (hideAutoplay) {
          handleDesktopAutoplay(true) || handleMobileAutoplay(true);
        }
      } else if (window.Polymer) {
        // Handle navigation setting changes
        navSettings[attrName as keyof typeof navSettings] =
          html.getAttribute(attrName) === "true";

        if (attrName === "hide_notifs") {
          if (navSettings.hide_notifs) {
            initTitleCleaner();
          }
        }
      }
    }
  }).observe(html, { attributes: true, attributeFilter });
}

// Extend Window interface for Polymer check
declare global {
  interface Window {
    Polymer?: any;
  }
}
