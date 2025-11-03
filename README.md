# Quiet Mode

A browser extension that helps you focus by hiding distracting elements on YouTube.

## Installation

```bash
# Install dependencies
pnpm install

# Build for Chrome
pnpm build

# Build for Firefox
pnpm build:firefox
```

### Load Extension (Chrome)

1. Navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `.output/chrome-mv3` folder

### Load Extension (Firefox)

1. Navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select any file in the `.output/firefox-mv2` folder (e.g., `manifest.json`)

## Development

```bash
pnpm dev
pnpm dev:firefox
```

## License

MIT
