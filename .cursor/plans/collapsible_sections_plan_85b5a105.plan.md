---
name: Collapsible Sections Plan
overview: Make all sections in the popup collapsible with persistent state stored in browser storage, using Radix UI Collapsible primitive and chevron icons to indicate expand/collapse state.
todos:
  - id: install-collapsible
    content: Install @radix-ui/react-collapsible package
    status: completed
  - id: create-component
    content: Create collapsible UI component in components/ui/collapsible.tsx
    status: completed
  - id: add-state
    content: Add collapsedSections state and browser.storage persistence in App.tsx
    status: completed
  - id: update-sections
    content: Wrap all 4 sections with Collapsible component and add chevron icons
    status: completed
---

# Collapsible Sections with Persistent State

## Overview

Add collapsible functionality to the four main sections in the popup (Navigation, Watch Page, Video Info, and Blocked Channels) with state persistence between sessions.

## Implementation Steps

### 1. Add State Management for Collapsed Sections

In [`entrypoints/popup/App.tsx`](entrypoints/popup/App.tsx):

**Add state:**

```typescript
const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
```

**Load collapsed state on mount:**

- Fetch from `browser.storage.local` in the existing `useEffect` hook (around line 165)
- Storage key: `"collapsedSections"`
- Default: all sections expanded (empty object or all values = false)

**Persist collapsed state:**

- Add new `useEffect` to watch `collapsedSections` state
- Save to `browser.storage.local.set({ collapsedSections })` on changes
- Use `storage.local` (not `storage.sync`) since UI preferences don't need cross-device sync

### 2. Update Section Rendering

Transform each section (lines 337-447) to use the Collapsible component:

**For each category section** (Navigation, Watch Page, Video Info):

- Wrap the category in `<Collapsible>` with `open` prop tied to state
- Replace the `<h2>` with `<CollapsibleTrigger>` containing:
  - Section title
  - `ChevronDown` icon from `lucide-react` (rotate when collapsed)
  - Flex layout for proper alignment
- Wrap settings list in `<CollapsibleContent>`

**For Blocked Channels section:**

- Apply same pattern
- Wrap the input field and channel list in `<CollapsibleContent>`

**Visual indicators:**

- Add `ChevronDown` icon from `lucide-react` (already imported)
- Rotate icon -90deg when collapsed using CSS transform
- Add hover state to trigger for better UX

### 3. Section Keys

Use consistent section identifiers:

- `"navigation"` - Navigation category
- `"watch-page"` - Watch Page category  
- `"video-info"` - Video Info category
- `"blocked-channels"` - Blocked Channels section

## Files to Modify

- [`entrypoints/popup/App.tsx`](entrypoints/popup/App.tsx) - Add collapsible state management and update section rendering

## Technical Notes

- Use `browser.storage.local` for UI-only preferences (faster, no sync needed)
- Leverage existing Radix UI ecosystem for consistency
- Maintain existing opacity transition when global toggle is disabled
- Keep hover states and accessibility intact
- Section state is independent (each can be collapsed separately)

## UI/UX Considerations

- Default all sections to **expanded** on first load
- Chevron animation should be smooth (use transition classes)
- Trigger should span full width for easier clicking
- Maintain existing spacing and visual hierarchy