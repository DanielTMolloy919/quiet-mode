import { useEffect, useState } from "react";
import { browser } from "wxt/browser";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { ThemeProvider } from "./theme-provider";
import { Moon, Sun, X, Plus, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "./theme-provider";
import { generateDefaultSettings } from "@/lib/default-settings";
import { extractChannelFromUrl } from "@/lib/utils";
import type { Settings } from "@/lib/types";

interface SettingConfig {
  id: string;
  displayName: string;
  category?: string;
  parent?: string; // ID of parent setting
  children?: string[]; // IDs of child settings
}

// YouTube settings configuration
const YOUTUBE_SETTINGS: SettingConfig[] = [
  {
    id: "hide_feed",
    displayName: "Hide Feed (Homepage)",
    category: "Navigation",
  },
  { id: "hide_shorts", displayName: "Hide Shorts", category: "Navigation" },
  { id: "hide_trending", displayName: "Hide Trending", category: "Navigation" },
  {
    id: "hide_subs",
    displayName: "Hide Subscriptions",
    category: "Navigation",
  },
  { id: "hide_header", displayName: "Hide Header Bar", category: "Navigation" },
  {
    id: "hide_notifs",
    displayName: "Hide Notifications",
    category: "Navigation",
  },
  {
    id: "hide_sidebar",
    displayName: "Hide Right Sidebar",
    category: "Watch Page",
    children: ["hide_recommended", "hide_playlists"],
  },
  {
    id: "hide_recommended",
    displayName: "Hide Recommended Videos",
    category: "Watch Page",
    parent: "hide_sidebar",
  },
  {
    id: "hide_playlists",
    displayName: "Hide Playlists",
    category: "Watch Page",
    parent: "hide_sidebar",
  },
  {
    id: "hide_chat",
    displayName: "Hide Live Chat",
    category: "Watch Page",
  },
  { id: "hide_comments", displayName: "Hide Comments", category: "Watch Page" },
  {
    id: "hide_endscreen",
    displayName: "Hide End Screen",
    category: "Watch Page",
  },
  {
    id: "hide_autoplay",
    displayName: "Disable Autoplay",
    category: "Watch Page",
  },
  {
    id: "hide_meta",
    displayName: "Hide Video Metadata",
    category: "Video Info",
    children: ["hide_desc", "hide_channel", "hide_bar"],
  },
  {
    id: "hide_desc",
    displayName: "Hide Video Description",
    category: "Video Info",
    parent: "hide_meta",
  },
  {
    id: "hide_channel",
    displayName: "Hide Channel Info",
    category: "Video Info",
    parent: "hide_meta",
  },
  {
    id: "hide_bar",
    displayName: "Hide Action Bar (Like/Share)",
    category: "Video Info",
    parent: "hide_meta",
  },
];

type SettingSwitchProps = {
  displayName: string;
  checked: boolean;
  setChecked: (value: boolean) => void;
};

function SettingSwitch({
  displayName,
  checked,
  setChecked,
}: SettingSwitchProps) {
  return (
    <div className="flex items-center gap-2 justify-between">
      <Label
        className="flex-1 cursor-pointer"
        onClick={() => setChecked(!checked)}
      >
        {displayName}
      </Label>
      <Switch onCheckedChange={setChecked} checked={checked} />
    </div>
  );
}

export function ModeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Popup() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [newChannelInput, setNewChannelInput] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    console.log("[QuietMode:Popup] Loading settings...");
    loadSettings();
    loadCollapsedSections();
  }, []);

  async function loadSettings() {
    try {
      const data = await browser.storage.sync.get("settings");
      console.log("[QuietMode:Popup] Loaded settings:", data.settings);

      if (!data.settings || Object.keys(data.settings).length === 0) {
        console.log("[QuietMode:Popup] No settings found, using defaults");
        const defaultSettings = generateDefaultSettings();
        await browser.storage.sync.set({ settings: defaultSettings });
        setSettings(defaultSettings);
      } else {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error("[QuietMode:Popup] Error loading settings:", error);
    }
  }

  async function loadCollapsedSections() {
    try {
      const data = await browser.storage.local.get("collapsedSections");
      console.log("[QuietMode:Popup] Loaded collapsed sections:", data.collapsedSections);
      
      if (data.collapsedSections) {
        setCollapsedSections(data.collapsedSections);
      }
    } catch (error) {
      console.error("[QuietMode:Popup] Error loading collapsed sections:", error);
    }
  }

  useEffect(() => {
    if (!settings) {
      return;
    }

    console.log("[QuietMode:Popup] Saving settings:", settings);
    browser.storage.sync.set({ settings });
  }, [settings]);

  useEffect(() => {
    console.log("[QuietMode:Popup] Saving collapsed sections:", collapsedSections);
    browser.storage.local.set({ collapsedSections });
  }, [collapsedSections]);

  if (!settings) {
    return (
      <ThemeProvider>
        <div className="w-[400px] h-[500px] flex flex-col items-center justify-center bg-background">
          <div className="w-16 h-16 mb-4 animate-pulse">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 80 80"
              className="w-full h-full"
            >
              <circle
                cx="40"
                cy="40"
                r="8"
                fill="currentColor"
                className="text-muted-foreground"
              />
              <circle
                cx="40"
                cy="40"
                r="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                opacity="0.5"
                className="text-muted-foreground"
              />
            </svg>
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </ThemeProvider>
    );
  }

  function openLink(href: string) {
    console.log("[QuietMode:Popup] Opening link:", href);
    browser.tabs.create({ url: href });
  }

  function toggleSection(sectionKey: string) {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  }

  function isSectionOpen(sectionKey: string): boolean {
    return !collapsedSections[sectionKey];
  }

  function getCategoryKey(category: string): string {
    return category.toLowerCase().replace(/\s+/g, "-");
  }

  // Group settings by category
  const groupedSettings: Record<string, SettingConfig[]> = {};
  for (const setting of YOUTUBE_SETTINGS) {
    const category = setting.category || "Other";
    if (!groupedSettings[category]) {
      groupedSettings[category] = [];
    }
    groupedSettings[category].push(setting);
  }

  const globalEnabled = settings["global.enabled"] !== false;
  const blockedChannels = (settings["youtube.blocked_channels"] as string[]) || [];

  function addBlockedChannel() {
    if (!newChannelInput.trim()) return;
    
    const channelId = extractChannelFromUrl(newChannelInput.trim());
    if (!channelId) {
      console.log("[QuietMode:Popup] Invalid channel input:", newChannelInput);
      return;
    }

    // Check if already blocked
    if (blockedChannels.some(ch => ch.toLowerCase() === channelId.toLowerCase())) {
      console.log("[QuietMode:Popup] Channel already blocked:", channelId);
      setNewChannelInput("");
      return;
    }

    const newBlockedChannels = [...blockedChannels, channelId];
    setSettings({ ...settings, "youtube.blocked_channels": newBlockedChannels });
    setNewChannelInput("");
    console.log("[QuietMode:Popup] Added blocked channel:", channelId);
  }

  function removeBlockedChannel(channelId: string) {
    const newBlockedChannels = blockedChannels.filter(ch => ch !== channelId);
    setSettings({ ...settings, "youtube.blocked_channels": newBlockedChannels });
    console.log("[QuietMode:Popup] Removed blocked channel:", channelId);
  }

  return (
    <ThemeProvider>
      <div className="w-[400px] h-[550px] flex flex-col bg-background">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 80 80"
                className="w-full h-full"
              >
                <circle
                  cx="40"
                  cy="40"
                  r="8"
                  fill="currentColor"
                  className="text-primary"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="22"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="10"
                  opacity="0.5"
                  className="text-primary"
                />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-foreground">
              Quiet Mode
            </h1>
          </div>
          <ModeToggle />
        </div>

        {/* Global Toggle */}
        <div className="p-4 border-b bg-accent/30">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <Label className="text-base font-semibold cursor-pointer" onClick={() => setSettings({ ...settings, "global.enabled": !globalEnabled })}>
                Enable Quiet Mode
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {globalEnabled ? "All features active" : "All features disabled"}
              </p>
            </div>
            <Switch
              checked={globalEnabled}
              onCheckedChange={(checked) => setSettings({ ...settings, "global.enabled": checked })}
              className="scale-125"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-background">
          <div className={`space-y-6 transition-opacity ${!globalEnabled ? "opacity-40" : ""}`}>
            {Object.entries(groupedSettings).map(
              ([category, categorySettings]) => {
                const categoryKey = getCategoryKey(category);
                const isOpen = isSectionOpen(categoryKey);
                
                return (
                  <Collapsible key={category} open={isOpen} onOpenChange={() => toggleSection(categoryKey)}>
                    <div className="space-y-3">
                      <CollapsibleTrigger className="flex items-center justify-between w-full group hover:opacity-70 transition-opacity cursor-pointer">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                          {category}
                        </h2>
                        <ChevronDown 
                          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                            isOpen ? "" : "-rotate-90"
                          }`}
                        />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="space-y-2 pt-1">
                          {categorySettings.map((setting) => {
                            const settingKey = `youtube.${setting.id}`;
                            const isChild = !!setting.parent;
                            const parentKey = setting.parent
                              ? `youtube.${setting.parent}`
                              : null;
                            const isParentEnabled = parentKey
                              ? (settings[parentKey] as boolean) ?? false
                              : false;
                            const isDisabled = (isChild && isParentEnabled) || !globalEnabled;
                            const isChecked = (settings[settingKey] as boolean) ?? false;

                            const handleToggle = () => {
                              if (isDisabled) return;

                              const newValue = !isChecked;
                              setSettings({ ...settings, [settingKey]: newValue });
                            };

                            return (
                              <div
                                key={settingKey}
                                className={`p-2 rounded-lg transition-colors ${
                                  isChild ? "ml-6" : ""
                                } ${
                                  isDisabled
                                    ? "opacity-50 cursor-not-allowed"
                                    : "hover:bg-accent/50 cursor-pointer"
                                }`}
                                onClick={handleToggle}
                              >
                                <SettingSwitch
                                  displayName={setting.displayName}
                                  checked={isChecked || (isChild && isParentEnabled)}
                                  setChecked={() => handleToggle()}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              }
            )}

            {/* Blocked Channels Section */}
            <Collapsible open={isSectionOpen("blocked-channels")} onOpenChange={() => toggleSection("blocked-channels")}>
              <div className="space-y-3">
                <CollapsibleTrigger className="flex items-center justify-between w-full group hover:opacity-70 transition-opacit cursor-pointer">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Blocked Channels
                  </h2>
                  <ChevronDown 
                    className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                      isSectionOpen("blocked-channels") ? "" : "-rotate-90"
                    }`}
                  />
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="space-y-3 pt-1">
                    {/* Add channel input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newChannelInput}
                        onChange={(e) => setNewChannelInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addBlockedChannel();
                          }
                        }}
                        placeholder="@channel or URL"
                        disabled={!globalEnabled}
                        className="flex-1 px-3 py-2 text-sm rounded-md border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                      />
                      <Button
                        size="sm"
                        onClick={addBlockedChannel}
                        disabled={!globalEnabled || !newChannelInput.trim()}
                        className="px-3"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Blocked channels list */}
                    {blockedChannels.length > 0 ? (
                      <div className="space-y-1">
                        {blockedChannels.map((channel) => (
                          <div
                            key={channel}
                            className="flex items-center justify-between p-2 rounded-lg bg-accent/30 group"
                          >
                            <span className="text-sm font-mono truncate flex-1">
                              {channel}
                            </span>
                            <button
                              onClick={() => removeBlockedChannel(channel)}
                              disabled={!globalEnabled}
                              className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50 cursor-pointer"
                              aria-label={`Remove ${channel}`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        No channels blocked
                      </p>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          </div>
        </div>

        <div className="flex gap-2 justify-center items-center text-sm p-3 border-t">
          <span className="text-muted-foreground">v1.0.0</span>
          <span className="text-muted-foreground">•</span>
          <button
            onClick={() =>
              openLink("https://github.com/dannymolloy/quiet-mode")
            }
            className="hover:underline text-foreground hover:text-muted-foreground transition-colors"
          >
            GitHub
          </button>
        </div>
      </div>
    </ThemeProvider>
  );
}
