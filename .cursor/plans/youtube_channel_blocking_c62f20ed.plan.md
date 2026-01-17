---
name: YouTube Channel Blocking
overview: Add the ability to block specific YouTube channels by making their channel pages unviewable, with manual input management in the extension popup.
todos:
  - id: update-types
    content: Update Settings interface in types.ts to support string arrays
    status: completed
  - id: update-defaults
    content: Add blocked_channels array to default settings
    status: completed
  - id: popup-ui
    content: Add Blocked Channels section to popup with input and list management
    status: completed
  - id: content-detection
    content: Add channel page detection logic in content script
    status: completed
  - id: content-blocking
    content: Add CSS rules to hide blocked channel page content
    status: completed
  - id: url-parsing
    content: Add utility functions to parse/normalize channel identifiers
    status: completed
---

# YouTube Channel Blocking Feature

## Overview

Add a channel blocking feature that prevents viewing blocked channels' pages. Users manage blocked channels via manual input in the popup.

## Key Files to Modify

- [`lib/types.ts`](lib/types.ts) - Extend settings interface
- [`lib/default-settings.ts`](lib/default-settings.ts) - Add blocked channels default
- [`entrypoints/popup/App.tsx`](entrypoints/popup/App.tsx) - Add blocked channels UI section
- [`entrypoints/content/index.ts`](entrypoints/content/index.ts) - Add channel page detection logic
- [`entrypoints/content/content.css`](entrypoints/content/content.css) - Add CSS rules to hide blocked channel content

## Implementation Details

### 1. Update Settings Structure

Modify [`lib/types.ts`](lib/types.ts) to support mixed types:

```typescript
export interface Settings {
  [key: string]: boolean | string[];
}
```

Add to [`lib/default-settings.ts`](lib/default-settings.ts):

```typescript
"youtube.blocked_channels": []  // Array of channel handles like "@ChannelName"
```

### 2. Add Blocked Channels UI in Popup

Add a new "Blocked Channels" section in [`entrypoints/popup/App.tsx`](entrypoints/popup/App.tsx) with:

- Text input for adding channel handles (e.g., `@MrBeast` or full URL)
- List of currently blocked channels with remove buttons
- Parse URLs to extract channel handle/ID automatically

### 3. Channel Page Blocking Logic (CSS-based)

Add to [`entrypoints/content/index.ts`](entrypoints/content/index.ts):

- **Detection**: Check if current URL matches channel page patterns:
  - `youtube.com/@ChannelHandle`
  - `youtube.com/channel/UCxxxxxxx`
  - `youtube.com/c/ChannelName`

- **Blocking**: Set `blocked_channel="true"` attribute on `<html>` when on a blocked channel's page (same pattern as other hide features). Remove the attribute when navigating away.

Add to [`entrypoints/content/content.css`](entrypoints/content/content.css):

```css
/* Hide blocked channel pages */
html[blocked_channel="true"] ytd-browse ytd-c4-tabbed-header-renderer,
html[blocked_channel="true"] ytd-browse #contents {
  display: none !important;
}
```

Key elements from the channel page structure (per `html-snippets/youtube-channel.html`):

- `ytd-c4-tabbed-header-renderer` - channel banner, avatar, name, subscribe button, tabs
- `#contents` inside `ytd-browse` - all the channel's videos/posts/playlists

### 4. Channel Identifier Normalization

Create utility functions to:

- Extract channel handle from various URL formats (including subpages)
- Normalize handles (lowercase, strip @)
- Compare current page against blocked list

**URL patterns to detect** (base + all subpages like `/videos`, `/shorts`, `/playlists`, `/community`, `/about`, etc.):

```typescript
// Matches /@handle, /channel/UCxxx, /c/name with optional subpages
const channelUrlPattern = /^\/(@[\w-]+|channel\/[\w-]+|c\/[\w-]+)(\/[\w-]*)?$/;
```

Examples:

- `/@MrBeast` → `@mrbeast`
- `/@MrBeast/videos` → `@mrbeast`
- `/channel/UCX6OQ3DkcsbYNE6H8uQQuVA/playlists` → `ucx6oq3dkcsbyne6h8uqquva`

The CSS rules will hide content on all subpages since they all share the same `ytd-browse` with `ytd-c4-tabbed-header-renderer` structure.

---

## Scope: Hiding Videos in Feeds (Future Work)

Hiding blocked channels' videos from feeds/recommendations would require:

**Additional complexity:**

- Parse each video element in feeds to extract channel info
- YouTube uses dynamic loading (infinite scroll) - need MutationObserver
- Multiple feed contexts: homepage, search results, watch page sidebar, shorts shelf
- Channel info is nested differently in each context

**Estimated elements to target:**

- `ytd-rich-item-renderer` (homepage grid)
- `ytd-video-renderer` (search results)
- `ytd-compact-video-renderer` (sidebar recommendations)
- `ytd-reel-item-renderer` (shorts)

**Approach options:**

1. **CSS-based** (if channel ID is in DOM attributes) - cleanest but may not be reliable
2. **JS-based with MutationObserver** - more reliable but heavier
3. **Hybrid** - inject CSS rules dynamically per blocked channel

This would roughly double the implementation effort and require ongoing maintenance as YouTube updates their DOM structure. Recommend implementing as a separate follow-up feature.