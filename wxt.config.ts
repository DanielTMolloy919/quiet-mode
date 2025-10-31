import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Quiet Mode",
    description: "Hide distracting feeds and suggestions on social media sites",
    permissions: ["storage", "tabs"],
    host_permissions: [
      "*://*.youtube.com/*",
      "*://*.reddit.com/*",
      "*://*.instagram.com/*",
      "https://raw.githubusercontent.com/*",
    ],
  },
  vite: () => ({
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./"),
      },
    },
  }),
});
