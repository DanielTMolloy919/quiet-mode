import { useEffect, useState } from "react";
import { browser } from "wxt/browser";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import { ThemeProvider } from "./theme-provider";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "./theme-provider";

interface Settings {
  [key: string]: boolean;
}

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
    id: "hide_recommended",
    displayName: "Hide Recommended Videos",
    category: "Watch Page",
  },
  {
    id: "hide_sidebar",
    displayName: "Hide Right Sidebar",
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

  useEffect(() => {
    console.log("[QuietMode:Popup] Loading settings...");
    loadSettings();
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

  useEffect(() => {
    if (!settings) {
      return;
    }

    console.log("[QuietMode:Popup] Saving settings:", settings);
    browser.storage.sync.set({ settings });
  }, [settings]);

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
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </ThemeProvider>
    );
  }

  function openLink(href: string) {
    console.log("[QuietMode:Popup] Opening link:", href);
    browser.tabs.create({ url: href });
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

  return (
    <ThemeProvider>
      <div className="w-[400px] h-[550px] flex flex-col bg-background">
        {/* Header with gradient background */}
        <div className="flex items-center justify-between p-4 border-b bg-linear-to-br from-primary/5 to-primary/10">
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

        <div className="flex-1 overflow-y-auto p-4 bg-background">
          <div className="space-y-6">
            {Object.entries(groupedSettings).map(
              ([category, categorySettings]) => (
                <div key={category} className="space-y-3">
                  <h2 className="text-sm font-semibold text-primary/80 mb-3 uppercase tracking-wide">
                    {category}
                  </h2>
                  <div className="space-y-2">
                    {categorySettings.map((setting) => {
                      const settingKey = `youtube.${setting.id}`;
                      const isChild = !!setting.parent;
                      const parentKey = setting.parent
                        ? `youtube.${setting.parent}`
                        : null;
                      const isParentEnabled = parentKey
                        ? settings[parentKey] ?? false
                        : false;
                      const isDisabled = isChild && isParentEnabled;
                      const isChecked = settings[settingKey] ?? false;

                      const handleToggle = () => {
                        if (isDisabled) return;

                        const newValue = !isChecked;
                        const newSettings = {
                          ...settings,
                          [settingKey]: newValue,
                        };

                        // If this is a parent setting, toggle all children
                        if (setting.children && newValue) {
                          setting.children.forEach((childId) => {
                            newSettings[`youtube.${childId}`] = true;
                          });
                        }

                        setSettings(newSettings);
                      };

                      return (
                        <div
                          key={settingKey}
                          className={`p-2 rounded-lg transition-colors ${
                            isChild ? "ml-6 border-l-2 border-primary/30" : ""
                          } ${
                            isDisabled
                              ? "opacity-50 cursor-not-allowed"
                              : "hover:bg-accent/50 cursor-pointer"
                          }`}
                          onClick={handleToggle}
                        >
                          <SettingSwitch
                            displayName={setting.displayName}
                            checked={isChecked || isDisabled}
                            setChecked={() => handleToggle()}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        <div className="flex gap-2 justify-center items-center text-sm p-3 border-t bg-linear-to-br from-primary/5 to-primary/10">
          <span className="text-muted-foreground">v1.0.0</span>
          <span className="text-muted-foreground">•</span>
          <button
            onClick={() =>
              openLink("https://github.com/dannymolloy/quiet-mode")
            }
            className="hover:underline text-primary hover:text-primary/80 transition-colors font-medium"
          >
            GitHub
          </button>
        </div>
      </div>
    </ThemeProvider>
  );
}

function generateDefaultSettings(): Settings {
  const settings: Settings = {};
  for (const setting of YOUTUBE_SETTINGS) {
    settings[`youtube.${setting.id}`] = false;
  }
  return settings;
}
