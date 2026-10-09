import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  // Il service worker (public/sw.js, notifiche push) non deve restare in
  // cache: altrimenti una sua nuova versione arriva al telefono in ritardo.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
  images: {
    qualities: [75, 95],
  },
};

export default nextConfig;
