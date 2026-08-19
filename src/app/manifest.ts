import type { MetadataRoute } from "next";

/**
 * The web app manifest (Module 6 — PWA pass): installable, home-screen
 * ready, no service-worker theater. De-housed 0018.05.10: name, colors and
 * icons are One Cocreation's own — the gold sun badge on celestial night.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "One Cocreation",
    short_name: "One Cocreation",
    description:
      "Where Heaven and Earth Meet — intuitive sessions, meditations and community with Love. Pay in dollars or bitcoin, non-custodial always.",
    start_url: "/",
    display: "standalone",
    /* S2 (0018.05.25 a₿): = --space, kept literal — the manifest is served
       as JSON, var() won't resolve */
    background_color: "#0a0a14",
    theme_color: "#0a0a14",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
