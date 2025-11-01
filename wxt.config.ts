import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Quiet Mode",
    description: "YouTube distraction blocker - hide feeds, shorts, recommendations, and more",
    permissions: ["storage"],
    host_permissions: [
      "*://*.youtube.com/*",
    ],
    browser_specific_settings: {
      gecko: {
        id: "quiet-mode@danielmolloy.dev",
      },
    },
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
