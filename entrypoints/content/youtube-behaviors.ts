/**
 * YouTube-specific behavior handling
 * Handles autoplay toggling, annotations removal, and other dynamic behaviors
 */

const html = document.documentElement;
const MutationObs = window.MutationObserver;

// Settings that affect navigation behavior
const navSettings = {
  hide_feed: false,
  hide_redirect_home: false,
  hide_subs: false,
  hide_notifs: false,
};

const navSettingsKeys = Object.keys(navSettings);
const SUBSCRIPTIONS_URL = "https://www.youtube.com/feed/subscriptions";

// Track initialized state
let hideAutoplay: boolean | null = null;
let hideAnnotations: boolean | null = null;
let autoplayObserverRunning = false;
let annotationsObserverRunning = false;
let titleObserverRunning = false;
let logoObserverRunning = false;
let shouldRedirectHome = false;

/**
 * Re-toggle autoplay button to ensure it stays in desired state
 */
function retoggleAutoplay(
  delay: number,
  button: HTMLElement,
  userWantsOn: boolean
) {
  if ((userWantsOn && hideAutoplay) || (!userWantsOn && hideAnnotations)) {
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
 * Toggle annotation button and set up retoggle
 */
function toggleAnnotationButton(button: HTMLElement, delay: number) {
  if (button.getAttribute("aria-checked") === "true") {
    button.click();
    setTimeout(retoggleAutoplay.bind(null, delay, button, false), delay);
  } else {
    // If annotations are visible, toggle twice to properly initialize
    const annotationElements = document.getElementsByClassName(
      "ytp-iv-video-content"
    );
    if (annotationElements.length) {
      button.click();
      button.click();
    }
  }
}

/**
 * Check and toggle all annotation buttons in the menu
 */
function checkAnnotationButtons(menu: Element): boolean {
  const annotationButtons = menu.getElementsByClassName("annOption");
  for (let i = 0; i < annotationButtons.length; i++) {
    toggleAnnotationButton(annotationButtons[i] as HTMLElement, 1500);
  }
  return !annotationButtons.length;
}

/**
 * Setup annotation button in settings menu
 */
function setupAnnotationButton(menu: Element, delay: number) {
  const menuItems = menu.querySelectorAll(
    ".ytp-menuitem[role=menuitemcheckbox]"
  );
  if (menuItems.length) {
    const lastItem = menuItems[menuItems.length - 1] as HTMLElement;

    // Check if this is the ambient mode item (we want the one before it)
    if (lastItem.innerText !== "Ambient mode") {
      lastItem.classList.add("annOption");
      if (hideAnnotations) {
        toggleAnnotationButton(lastItem, delay);
      }
    }
  }
}

/**
 * Open settings menu and setup annotation button
 */
function openMenuAndSetupAnnotations(menu: Element, button: HTMLElement) {
  const delay = 2500;
  if (menu.firstChild) {
    setupAnnotationButton(menu, delay);
  } else {
    setTimeout(() => {
      button.click();
      button.click();
      setupAnnotationButton(menu, delay);
    }, delay);
  }
}

/**
 * Watch for annotation button changes
 */
function watchAnnotationMenu(menu: Element, button: HTMLElement) {
  new MutationObs((): void => {
    if (checkAnnotationButtons(menu)) {
      openMenuAndSetupAnnotations(menu, button);
    }
  }).observe(menu, { childList: true });
}

/**
 * Initialize annotation settings for a video player element
 */
function initializeAnnotations(element: Element, isMainPlayer: boolean) {
  const settingsButtons = element.getElementsByClassName("ytp-settings-button");
  if (settingsButtons.length) {
    const settingsButton = settingsButtons[
      settingsButtons.length - 1
    ] as HTMLElement;
    settingsButton.click();
    settingsButton.click();

    const panels = element.getElementsByClassName("ytp-panel-menu");
    const settingsMenu = panels[panels.length - 1] as Element;

    openMenuAndSetupAnnotations(settingsMenu, settingsButton);

    if (isMainPlayer) {
      if (!annotationsObserverRunning) {
        watchAnnotationMenu(settingsMenu, settingsButton);
        annotationsObserverRunning = true;
      }
    } else {
      if (!annotationsObserverRunning) {
        watchAnnotationMenu(settingsMenu, settingsButton);
        annotationsObserverRunning = true;
      }
    }
  } else {
    // Wait for player to be ready
    const isHidden = element.hasAttribute("hidden");
    if (
      !isHidden &&
      document.body.contains(element) &&
      !element.getElementsByClassName("ytp-unmute").length &&
      !element.getElementsByClassName("watchThumbImageContainer").length
    ) {
      const observer = new MutationObs(function (this: MutationObserver) {
        if (element.getElementsByClassName("ytp-unmute").length) {
          initializeAnnotations(element, isMainPlayer);
          this.disconnect();
        }
      });
      observer.observe(element, { childList: true, subtree: true });
    }
  }
}

/**
 * Check and handle annotations
 */
function handleAnnotations(element: Element, isMainPlayer: boolean) {
  if (checkAnnotationButtons(element)) {
    initializeAnnotations(element, isMainPlayer);
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
function handleDesktopAutoplay(
  enableAutoplay: boolean,
  enableAnnotations: boolean
): boolean {
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
    if (enableAnnotations) {
      handleAnnotations(watchFlexy, true);
    }
  } else if (enableAnnotations) {
    // Check for channel video player
    const browsePage = document.querySelector(
      "ytd-browse[page-subtype=channels]"
    );
    const isBrowsePageHidden = browsePage?.hasAttribute("hidden");
    if (browsePage && !isBrowsePageHidden) {
      const channelPlayers = browsePage.getElementsByTagName(
        "ytd-channel-video-player-renderer"
      );
      if (channelPlayers.length) {
        handleAnnotations(browsePage, false);
      }
    }
  }

  return true;
}

/**
 * Handle autoplay for mobile YouTube
 */
function handleMobileAutoplay(
  enableAutoplay: boolean,
  enableAnnotations: boolean
): boolean {
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
    if (enableAnnotations) {
      handleAnnotations(player, true);
    }
  }

  return true;
}

/**
 * Handle annotations for embedded players
 */
function handleEmbeddedAnnotations(element: Element) {
  if (hideAnnotations) {
    handleAnnotations(element, true);
  }
}

/**
 * Watch for embedded player video load
 */
function watchEmbeddedPlayer(element: Element): boolean {
  const video = element.getElementsByTagName("video")[0];
  if (!video) return false;

  video.addEventListener("loadeddata", () =>
    handleEmbeddedAnnotations(element)
  );
  handleEmbeddedAnnotations(element);

  return true;
}

/**
 * Initialize embedded player annotations
 */
function initEmbeddedPlayer(): boolean {
  if (window === window.parent) return false;

  const player = document.getElementById("player");
  if (!player) return false;

  if (annotationsObserverRunning) {
    handleEmbeddedAnnotations(player);
  } else {
    annotationsObserverRunning = true;
    if (!watchEmbeddedPlayer(player)) {
      const observer = new MutationObs(function (this: MutationObserver) {
        if (watchEmbeddedPlayer(player)) {
          this.disconnect();
        }
      });
      observer.observe(player, { childList: true });
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
 * Prevent link navigation
 */
function preventNavigation(event: Event) {
  event.stopPropagation();
}

/**
 * Redirect home link to subscriptions
 */
function redirectHomeLink(element: HTMLAnchorElement) {
  if (element.href !== SUBSCRIPTIONS_URL) {
    element.addEventListener("click", preventNavigation, true);
    element.addEventListener("touchend", preventNavigation, true);
    element.href = SUBSCRIPTIONS_URL;
  }
}

/**
 * Check if home should be redirected to subscriptions
 */
function shouldRedirectHomeToSubs(): boolean {
  return (
    navSettings.hide_feed &&
    navSettings.hide_redirect_home &&
    !navSettings.hide_subs
  );
}

/**
 * Initialize home link redirect
 */
function initHomeRedirect() {
  if (logoObserverRunning) return;

  const logoLink = document.querySelector("a#logo") as HTMLAnchorElement;
  if (!logoLink) return;

  redirectHomeLink(logoLink);

  const observer = new MutationObs(function (this: MutationObserver) {
    if (shouldRedirectHome) {
      redirectHomeLink(logoLink);
    } else {
      logoObserverRunning = false;
      this.disconnect();
    }
  });
  observer.observe(logoLink, { attributes: true, attributeFilter: ["href"] });

  logoObserverRunning = true;
}

/**
 * Remove home link redirect
 */
function removeHomeRedirect() {
  const logoLink = document.querySelector("a#logo") as HTMLAnchorElement;
  if (!logoLink || logoLink.href !== SUBSCRIPTIONS_URL) return;

  logoLink.removeEventListener("click", preventNavigation, true);
  logoLink.removeEventListener("touchend", preventNavigation, true);
  logoLink.href = "/";
}

/**
 * Initialize all YouTube behaviors
 */
export function initializeBehaviors(phase: number = 0) {
  // Read settings from HTML attributes on first run
  if (hideAnnotations === null) {
    hideAutoplay = html.getAttribute("hide_autoplay") === "true";
    hideAnnotations = html.getAttribute("hide_annotations") === "true";

    if (window.Polymer) {
      // Load navigation settings
      for (const key of navSettingsKeys) {
        navSettings[key as keyof typeof navSettings] =
          html.getAttribute(key) === "true";
      }
      shouldRedirectHome = shouldRedirectHomeToSubs();

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

    if (shouldRedirectHome) {
      initHomeRedirect();
    }
  }

  // Handle autoplay and annotations
  if (hideAutoplay || hideAnnotations) {
    if (window.Polymer) {
      handleDesktopAutoplay(!!hideAutoplay, !!hideAnnotations);
    } else if (phase === 1) {
      // Try mobile
      if (
        !handleMobileAutoplay(!!hideAutoplay, !!hideAnnotations) &&
        hideAnnotations
      ) {
        initEmbeddedPlayer();
      }
    } else if (phase === 2) {
      // Retry mobile
      handleMobileAutoplay(!!hideAutoplay, !!hideAnnotations);
    }
  }
}

/**
 * Setup mutation observer for attribute changes
 */
export function watchAttributeChanges() {
  const attributeFilter = [
    "hide_autoplay",
    "hide_annotations",
    ...navSettingsKeys,
  ];

  new MutationObs((mutations) => {
    if (hideAnnotations === null) return;

    for (const mutation of mutations) {
      const attrName = mutation.attributeName;
      if (!attrName) continue;

      if (attrName === "hide_autoplay") {
        hideAutoplay = html.getAttribute("hide_autoplay") === "true";
        if (hideAutoplay) {
          handleDesktopAutoplay(true, false) ||
            handleMobileAutoplay(true, false);
        }
      } else if (attrName === "hide_annotations") {
        hideAnnotations = html.getAttribute("hide_annotations") === "true";
        if (hideAnnotations) {
          if (!handleDesktopAutoplay(false, true)) {
            handleMobileAutoplay(false, true) || initEmbeddedPlayer();
          }
        }
      } else if (window.Polymer) {
        // Handle navigation setting changes
        navSettings[attrName as keyof typeof navSettings] =
          html.getAttribute(attrName) === "true";

        if (attrName === "hide_notifs") {
          if (navSettings.hide_notifs) {
            initTitleCleaner();
          }
        } else {
          const wasRedirecting = shouldRedirectHome;
          shouldRedirectHome = shouldRedirectHomeToSubs();

          if (shouldRedirectHome) {
            initHomeRedirect();
          } else if (wasRedirecting) {
            removeHomeRedirect();
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
