import { useEffect, useState } from "react";
import { browser } from "wxt/browser";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Settings, RemoteConfig, BlockRule } from "@/lib/types";
import { ThemeProvider } from "./theme-provider";
import { Moon, Sun, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "./theme-provider";

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
    <div className="flex items-center gap-2">
      <Switch onCheckedChange={setChecked} checked={checked} />
      <Label>{displayName}</Label>
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
  const [config, setConfig] = useState<RemoteConfig | null>(null);
  const [activeTab, setActiveTab] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    console.log("[Tranquilize:Popup] Loading config and settings...");
    loadConfigAndSettings();
  }, []);

  async function loadConfigAndSettings() {
    try {
      // First, test if background script is responding
      console.log("[Tranquilize:Popup] Testing connection to background...");
      try {
        const pingResponse = await browser.runtime.sendMessage({
          message: "ping",
        });
        console.log(
          "[Tranquilize:Popup] Background responded to ping:",
          pingResponse
        );
      } catch (pingError) {
        console.error(
          "[Tranquilize:Popup] Background not responding to ping:",
          pingError
        );
        throw new Error("Background script not responding");
      }

      // Get config from background script with timeout
      console.log("[Tranquilize:Popup] Requesting config from background...");
      const remoteConfig = await Promise.race([
        browser.runtime.sendMessage({ message: "getConfig" }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout getting config")), 5000)
        ),
      ]);

      console.log("[Tranquilize:Popup] Remote config loaded:", remoteConfig);

      if (!remoteConfig) {
        throw new Error("No config returned from background");
      }

      setConfig(remoteConfig);

      // Load settings
      const data = await browser.storage.sync.get("settings");
      console.log("[Tranquilize:Popup] Storage data:", data);

      if (!data.settings || Object.keys(data.settings).length === 0) {
        console.log(
          "[Tranquilize:Popup] No settings found, generating defaults"
        );
        const defaultSettings = generateDefaultSettings(remoteConfig);
        await browser.storage.sync.set({ settings: defaultSettings });
        setSettings(defaultSettings);
      } else {
        console.log("[Tranquilize:Popup] Settings loaded:", data.settings);
        setSettings(data.settings);
      }

      // Set active tab based on current page
      browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        console.log("[Tranquilize:Popup] Active tab:", tabs[0]);
        const hostname = new URL(tabs[0]?.url || "").hostname;
        console.log("[Tranquilize:Popup] Hostname:", hostname);

        // Find matching site
        const sites = Object.keys(remoteConfig.sites);
        for (const site of sites) {
          if (hostname.includes(site)) {
            console.log("[Tranquilize:Popup] Setting active tab to", site);
            setActiveTab(site);
            return;
          }
        }

        // Default to first site if no match
        if (sites.length > 0) {
          console.log(
            "[Tranquilize:Popup] No match found, defaulting to",
            sites[0]
          );
          setActiveTab(sites[0]);
        }
      });
    } catch (error) {
      console.error("[Tranquilize:Popup] Error loading config:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      setError(errorMsg);

      // Retry logic for Firefox timing issues
      if (retryCount < 3 && errorMsg.includes("Timeout")) {
        console.log(
          `[Tranquilize:Popup] Retrying... (attempt ${retryCount + 1}/3)`
        );
        setRetryCount(retryCount + 1);
        setTimeout(() => {
          setError(null);
          loadConfigAndSettings();
        }, 1000);
      }
    }
  }

  async function handleRefreshConfig() {
    setIsRefreshing(true);
    try {
      console.log("[Tranquilize:Popup] Force refreshing config...");
      // Clear cache and reload
      await browser.storage.local.remove([
        "remote_config",
        "config_timestamp",
        "config_version",
      ]);
      await loadConfigAndSettings();
    } catch (error) {
      console.error("[Tranquilize:Popup] Error refreshing config:", error);
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    if (!settings) {
      console.log("[Tranquilize:Popup] No settings to save");
      return;
    }

    console.log("[Tranquilize:Popup] Saving settings:", settings);
    browser.storage.sync.set({ settings });
  }, [settings]);

  if (!settings || !config) {
    console.log(
      "[Tranquilize:Popup] No settings or config available, showing loading"
    );
    return (
      <ThemeProvider>
        <div className="absolute top-0 left-0 right-0 bottom-0 text-center h-full p-3 flex flex-col items-center justify-center gap-2">
          {error ? (
            <>
              <p className="text-destructive">Error: {error}</p>
              {retryCount < 3 && (
                <p className="text-sm text-muted-foreground">Retrying...</p>
              )}
              {retryCount >= 3 && (
                <Button
                  onClick={() => {
                    setRetryCount(0);
                    setError(null);
                    loadConfigAndSettings();
                  }}
                  size="sm"
                >
                  Try Again
                </Button>
              )}
            </>
          ) : (
            <p>Loading...</p>
          )}
        </div>
      </ThemeProvider>
    );
  }

  function openLink(href: string) {
    console.log("[Tranquilize:Popup] Opening link:", href);
    browser.tabs.create({ url: href });
  }

  const siteNames = Object.keys(config.sites);

  return (
    <ThemeProvider>
      <div className="absolute top-0 left-0 right-0 bottom-0 text-center h-full p-3 flex flex-col justify-between">
        <div className="absolute top-0 right-0 p-3 flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefreshConfig}
            disabled={isRefreshing}
            title="Refresh config from remote"
          >
            <RefreshCw
              className={`h-[1.2rem] w-[1.2rem] ${
                isRefreshing ? "animate-spin" : ""
              }`}
            />
            <span className="sr-only">Refresh config</span>
          </Button>
          <ModeToggle />
        </div>
        <Tabs
          value={activeTab || siteNames[0]}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList>
            {siteNames.map((siteName) => (
              <TabsTrigger key={siteName} value={siteName}>
                {capitalizeFirst(siteName)}
              </TabsTrigger>
            ))}
          </TabsList>
          {siteNames.map((siteName) => {
            const siteConfig = config.sites[siteName];
            return (
              <TabsContent key={siteName} value={siteName}>
                <div className="flex flex-col gap-2">
                  {siteConfig.rules.map((rule) => {
                    const settingKey = `${siteName}.${rule.id}`;
                    return (
                      <SettingSwitch
                        key={settingKey}
                        displayName={rule.displayName}
                        checked={settings[settingKey] ?? rule.defaultEnabled}
                        setChecked={(value) =>
                          setSettings({ ...settings, [settingKey]: value })
                        }
                      />
                    );
                  })}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
        <div className="flex gap-2 justify-center w-full items-center text-sm">
          <span className="text-muted-foreground">v{config.version}</span>
          <span className="text-muted-foreground">•</span>
          <button
            onClick={() =>
              openLink("https://github.com/DanielTMolloy919/tranquilize")
            }
            className="hover:underline text-muted-foreground"
          >
            GitHub
          </button>
        </div>
      </div>
    </ThemeProvider>
  );
}

function generateDefaultSettings(config: RemoteConfig): Settings {
  const settings: Settings = {};
  for (const [siteName, siteConfig] of Object.entries(config.sites)) {
    for (const rule of siteConfig.rules) {
      settings[`${siteName}.${rule.id}`] = rule.defaultEnabled;
    }
  }
  return settings;
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
