import type { Settings } from "./types";

/**
 * Default settings for Quiet Mode
 * Shared between background script and content script
 */
export function generateDefaultSettings(): Settings {
  return {
    "global.enabled": true,
    "youtube.hide_autoplay": true,
    "youtube.hide_bar": false,
    "youtube.hide_channel": false,
    "youtube.hide_comments": false,
    "youtube.hide_desc": false,
    "youtube.hide_endscreen": true,
    "youtube.hide_feed": true,
    "youtube.hide_header": false,
    "youtube.hide_meta": false,
    "youtube.hide_notifs": true,
    "youtube.hide_playlists": false,
    "youtube.hide_recommended": true,
    "youtube.hide_shorts": true,
    "youtube.hide_sidebar": false,
    "youtube.hide_subs": false,
    "youtube.hide_trending": true,
    "youtube.blocked_channels": [],
  };
}
