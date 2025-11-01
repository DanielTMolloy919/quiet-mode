# Quiet Mode

A browser extension that helps you focus by hiding distracting feeds and suggestions on social media sites like YouTube, Reddit, and Instagram.

## Features

- 🎯 **Granular Control**: Toggle individual features on/off for each site
- 🌙 **Dark Mode**: Beautiful UI with light/dark theme support
- 🔄 **Auto-Updates**: Remote configuration updates without extension updates
- ⚡ **Fast & Lightweight**: Instant blocking with no flickering
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

## Supported Sites

### YouTube

- Hide Home Feed
- Hide Channel Feeds
- Hide Sidebar
- Hide Suggested Videos

### Reddit

- Hide Home Feed
- Hide Subreddit Feeds
- Hide Sidebar
- Hide Suggested Posts

### Instagram

- Hide Home Feed
- Hide Reels

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
│   ├── background.ts       # Background script - fetches remote config
│   ├── content.ts          # Content script - applies hiding rules
│   ├── content.css         # CSS rules for hiding elements
│   └── popup/
│       ├── App.tsx         # Main popup UI
│       ├── theme-provider.tsx
│       ├── index.html
│       └── *.css
├── components/ui/          # Shadcn UI components
├── lib/
│   ├── types.ts           # Shared TypeScript interfaces
│   └── utils.ts
└── wxt.config.ts          # WXT configuration
```

## How It Works

1. **Background Script** (`background.ts`):

   - Fetches configuration from remote JSON file
   - Caches config locally (1-hour cache duration)
   - Responds to messages from popup and content scripts

2. **Content Script** (`content.ts`):

   - Loads user settings and remote config
   - Sets HTML attributes based on active rules
   - Listens for URL changes (handles SPAs)
   - Updates in real-time when settings change

3. **Popup** (`popup/App.tsx`):

   - Provides user interface for toggling features
   - Syncs settings across browser tabs
   - Theme switcher for dark/light mode

4. **CSS** (`content.css`):
   - Hides elements based on HTML attributes
   - Uses `!important` to ensure rules apply

## Remote Configuration

The extension fetches its configuration from:

```
https://raw.githubusercontent.com/DanielTMolloy919/quiet-mode-config/refs/heads/main/config.json
```

This allows updating blocking rules without releasing new extension versions.

## Technologies

- **WXT**: Modern web extension framework
- **React**: UI library
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Shadcn UI**: Component library
- **Radix UI**: Accessible primitives

## License

MIT

## Credits

Based on the Tranquilize extension concept.
