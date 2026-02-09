import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { readFileSync } from "fs";
import { resolve } from "path";

const packageJson = JSON.parse(
  readFileSync(resolve(process.cwd(), "package.json"), "utf-8"),
);
const appVersion = packageJson.version;

export default defineConfig({
  define: {
    "import.meta.env.APP_VERSION": JSON.stringify(appVersion),
  },
  assetsInclude: ["**/*.ani"],
  base: "/win98-web/",
  server: {
    hmr: {
      protocol: "ws",
      host: "localhost",
    },
  },
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.ico",
        "apple-touch-icon.png",
        "masked-icon.svg",
        "sitemap.xml",
        "robots.txt",
      ],
      manifest: {
        name: "Windows 98 Web Edition",
        short_name: "Win98Web",
        description: "A nostalgic, fully functional Windows 98 simulation in your browser.",
        theme_color: "#008080",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
      },
    }),
  ],
});
