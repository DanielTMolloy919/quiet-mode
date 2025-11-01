# Quiet Mode

A browser extension that helps you focus by hiding distracting elements on YouTube. Hide feeds, recommendations, shorts, comments, and much more with granular control.

## Features

- 🎯 **Granular Control**: 17 focused options to customize your YouTube experience
- 🌿 **Calming Design**: Modern UI with soothing green color palette inspired by focus and tranquility
- 🌙 **Dark Mode**: Beautiful theme switcher with optimized light and dark modes
- ⚡ **Fast & Lightweight**: Instant hiding with static CSS rules
- 🎬 **Advanced Controls**: Disable autoplay and hide distracting elements
- 🦊 **Cross-Browser**: Works on Chrome, Firefox, and other browsers

## Installation

### Chrome/Edge

1. Build the extension: `pnpm build`
2. Open `chrome://extensions/` in your browser
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `.output/chrome-mv3` folder

### Firefox

1. Build for Firefox: `pnpm build:firefox`
2. Open `about:debugging#/runtime/this-firefox` in your browser
3. Click "Load Temporary Add-on"
4. Navigate to the `.output/firefox-mv2` folder and select `manifest.json`

> **Note**: In Firefox, temporary extensions are removed when you close the browser. For permanent installation during development, you can use [web-ext](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/) or package the extension as an XPI file.

## YouTube Features

Quiet Mode offers comprehensive control over YouTube's interface:

### Navigation

- Hide Feed (Homepage)
- Hide Shorts
- Hide Trending
- Hide Subscriptions
- Hide Header Bar
- Hide Notifications

### Watch Page

- Hide Right Sidebar
  - Hide Recommended Videos
  - Hide Live Chat
  - Hide Playlists
- Hide Comments
- Hide End Screen
- Disable Autoplay

### Video Info

- Hide Video Metadata
  - Hide Video Description
  - Hide Channel Info
  - Hide Action Bar (Like/Share)

## Development

### Prerequisites

- Node.js 18+ and pnpm

### Setup

```bash
# Install dependencies
pnpm install

# Start development mode
pnpm dev

# Build for production
pnpm build

# Build for Firefox
pnpm build:firefox
```

### Project Structure

```
quiet-mode/
├── entrypoints/
│   ├── background.ts              # Background script - manages settings
│   ├── content/
│   │   ├── index.ts               # Main content script
│   │   ├── content.css            # Static CSS rules for hiding
│   │   └── youtube-behaviors.ts   # YouTube-specific dynamic behaviors
│   └── popup/
│       ├── App.tsx                # Main popup UI
│       ├── theme-provider.tsx
│       └── *.css
├── components/ui/                 # Shadcn UI components
├── lib/
│   ├── types.ts                  # Shared TypeScript interfaces
│   └── utils.ts
└── wxt.config.ts                 # WXT configuration
```

## How It Works

1. **Background Script** (`background.ts`):

   - Initializes default settings on install
   - Minimal overhead for maximum performance

2. **Content Script** (`content/index.ts`):

   - Loads user settings from storage
   - Sets HTML attributes on `<html>` element (e.g., `hide_feed="true"`)
   - Listens for URL changes (handles YouTube's SPA navigation)
   - Updates in real-time when settings change

3. **YouTube Behaviors** (`content/youtube-behaviors.ts`):

   - Handles complex dynamic behaviors (autoplay, annotations)
   - Uses MutationObservers to manage YouTube's dynamic DOM
   - Cleans notification badges from page title
   - Manages home page redirection to subscriptions

4. **Static CSS** (`content/content.css`):

   - Hides elements using attribute selectors (e.g., `html[hide_feed=true] .ytd-rich-grid-renderer`)
   - No dynamic CSS injection - instant performance
   - Uses `!important` to ensure rules apply

5. **Popup** (`popup/App.tsx`):
   - Clean, categorized interface for all settings
   - Syncs settings across browser tabs via storage API
   - Theme switcher for dark/light mode

## Technologies

- **WXT**: Modern web extension framework
- **React**: UI library
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling with custom color palette
- **Shadcn UI**: Component library
- **Radix UI**: Accessible primitives

## Design

Quiet Mode features a calming green color palette (#48BB78) inspired by tranquility and focus. The concentric circle logo represents the ripple effect of quieting digital distractions. The design emphasizes:

- **Clarity**: Clean, organized interface with grouped settings
- **Focus**: Subtle green accents that promote calm
- **Accessibility**: High contrast ratios in both light and dark modes
- **Modern aesthetics**: Gradient backgrounds, smooth transitions, and refined typography

## License

MIT

## Credits

Inspired by the [Unhook](https://unhook.app/) YouTube extension approach.
